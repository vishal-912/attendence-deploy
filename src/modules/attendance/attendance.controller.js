'use strict';

const attendanceService = require('./attendance.service');

const markAttendance = async (req, res, next) => {
  try {
    let { studentId, courseId, scheduleId, batchId, universityId, status, date } =
      req.body;
    const markedBy = req.user?.id;

    // RBAC validation: only faculty or admin roles can mark attendance (fixes BUG-02)
    const userRole = req.user?.role?.toUpperCase();
    if (
      req.user &&
      userRole !== 'FACULTY' &&
      userRole !== 'ADMIN' &&
      userRole !== 'UNIVERSITY_ADMIN' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only faculty or admin users can mark attendance.',
        data: null,
      });
    }

    if (req.user) {
      if (!universityId && req.user.universityId) {
        universityId = req.user.universityId;
      }
      if (
        req.user.universityId &&
        universityId &&
        universityId !== req.user.universityId &&
        userRole !== 'SUPER_ADMIN'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot mark attendance for another university',
          data: null,
        });
      }
    }

    // Required fields check (date removed from strict validation to allow service defaulting, fixes BUG-05)
    const missingFields = [];
    if (!studentId) missingFields.push('studentId');
    if (!courseId) missingFields.push('courseId');
    if (!scheduleId) missingFields.push('scheduleId');
    if (!batchId) missingFields.push('batchId');
    if (!status) missingFields.push('status');
    if (!universityId) missingFields.push('universityId');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        data: null,
      });
    }

    const record = await attendanceService.markAttendance({
      studentId,
      courseId,
      scheduleId,
      batchId,
      universityId,
      status,
      date,
      markedBy,
    });

    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

const getAttendanceSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, courseId, batchId, universityId } = req.query;

    if (universityId && req.user?.universityId && universityId !== req.user.universityId && req.user.role?.toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot query attendance data for another university',
        data: null
      });
    }

    let targetUniversityId = universityId;
    if (req.user?.universityId && req.user.role?.toUpperCase() !== 'SUPER_ADMIN') {
      targetUniversityId = req.user.universityId;
    }

    const summary = await attendanceService.getAttendanceSummary({
      startDate,
      endDate,
      courseId,
      batchId,
      universityId: targetUniversityId,
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance summary retrieved successfully',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

const getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, limit, offset } = req.query;

    // RBAC privacy check: students can only view their own attendance details (fixes BUG-03)
    const userRole = req.user?.role?.toUpperCase();
    const userId = req.user?.id;
    if (userRole === 'STUDENT' && userId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Students can only view their own attendance details.',
        data: null,
      });
    }

    const records = await attendanceService.getStudentAttendance({
      studentId,
      startDate,
      endDate,
      limit: limit !== undefined ? parseInt(limit, 10) : undefined,
      offset: offset !== undefined ? parseInt(offset, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      message: 'Student attendance retrieved successfully',
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

const getCourseAttendance = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { startDate, endDate, limit, offset } = req.query;

    const records = await attendanceService.getCourseAttendance({
      courseId,
      startDate,
      endDate,
      limit: limit !== undefined ? parseInt(limit, 10) : undefined,
      offset: offset !== undefined ? parseInt(offset, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      message: 'Course attendance retrieved successfully',
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

const getBatchAttendance = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { startDate, endDate, limit, offset } = req.query;

    const records = await attendanceService.getBatchAttendance({
      batchId,
      startDate,
      endDate,
      limit: limit !== undefined ? parseInt(limit, 10) : undefined,
      offset: offset !== undefined ? parseInt(offset, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      message: 'Batch attendance retrieved successfully',
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

const getAttendancePercentage = async (req, res, next) => {
  try {
    const { studentId, courseId, batchId, universityId, startDate, endDate } = req.query;

    if (universityId && req.user?.universityId && universityId !== req.user.universityId && req.user.role?.toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot query attendance data for another university',
        data: null
      });
    }

    let targetUniversityId = universityId;
    if (req.user?.universityId && req.user.role?.toUpperCase() !== 'SUPER_ADMIN') {
      targetUniversityId = req.user.universityId;
    }

    const result = await attendanceService.getAttendancePercentage({
      studentId,
      courseId,
      batchId,
      universityId: targetUniversityId,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance percentage retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateAttendance = async (req, res, next) => {
  try {
    const { attendanceId } = req.params;
    const { status, reason } = req.body;
    const { id: editorId, role: editorRole } = req.user || {};

    const missingFields = [];
    if (!attendanceId) missingFields.push('attendanceId');
    if (!status) missingFields.push('status');
    if (!editorId) missingFields.push('editorId');
    if (!editorRole) missingFields.push('editorRole');
    if (!reason) missingFields.push('reason');

    if (missingFields.length > 0) {
      const message = missingFields.length === 1
        ? `Missing required field: ${missingFields[0]}`
        : `Missing required fields: ${missingFields.join(', ')}`;
      return res.status(400).json({
        success: false,
        message,
        data: null,
      });
    }

    const result = await attendanceService.updateAttendance(attendanceId, {
      status,
      reason,
      editor: {
        id: editorId,
        role: editorRole,
        universityId: req.user?.universityId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getStudentsBelowThreshold = async (req, res, next) => {
  try {
    const { threshold, courseId, batchId } = req.query;
    const parsedThreshold = parseFloat(threshold);

    // RBAC validation: only faculty or admin roles can view threshold breaches (fixes BUG-02 / Feature 8 security)
    const userRole = req.user?.role?.toUpperCase();
    if (
      req.user &&
      userRole !== 'FACULTY' &&
      userRole !== 'ADMIN' &&
      userRole !== 'UNIVERSITY_ADMIN' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only faculty or admin users can access threshold breach data.',
        data: null,
      });
    }

    if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100) {
      return res.status(400).json({
        success: false,
        message: 'A numeric threshold query parameter between 0 and 100 is required.',
        data: null
      });
    }

    // Enforce university restriction if not SUPER_ADMIN
    let targetUniversityId = req.query.universityId;
    if (req.user?.universityId && req.user.role?.toUpperCase() !== 'SUPER_ADMIN') {
      targetUniversityId = req.user.universityId;
    }

    // If user tries to query another university but is not SUPER_ADMIN, return 403
    if (req.query.universityId && req.user?.universityId && req.query.universityId !== req.user.universityId && req.user.role?.toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot query threshold breach list for another university',
        data: null
      });
    }

    const results = await attendanceService.getStudentsBelowThreshold(parsedThreshold, {
      courseId,
      batchId,
      universityId: targetUniversityId
    });

    return res.status(200).json({
      success: true,
      message: 'Students below threshold retrieved successfully',
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getAttendanceSummary,
  getStudentAttendance,
  getCourseAttendance,
  getBatchAttendance,
  getAttendancePercentage,
  updateAttendance,
  getStudentsBelowThreshold,
};