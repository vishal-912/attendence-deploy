'use strict';

const attendanceService = require('./attendance.service');

const markAttendance = async (req, res, next) => {
  try {
    const { studentId, courseId, scheduleId, batchId, universityId, status, date, markedBy } =
      req.body;

    if (
      !studentId ||
      !courseId ||
      !scheduleId ||
      !batchId ||
      !universityId ||
      !status ||
      !date ||
      !markedBy
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, courseId, scheduleId, batchId, universityId, status, date, markedBy',
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

    const summary = await attendanceService.getAttendanceSummary({
      startDate,
      endDate,
      courseId,
      batchId,
      universityId,
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
    const { startDate, endDate } = req.query;

    const records = await attendanceService.getStudentAttendance({
      studentId,
      startDate,
      endDate,
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
    const { startDate, endDate } = req.query;

    const records = await attendanceService.getCourseAttendance({
      courseId,
      startDate,
      endDate,
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
    const { startDate, endDate } = req.query;

    const records = await attendanceService.getBatchAttendance({
      batchId,
      startDate,
      endDate,
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

    const result = await attendanceService.getAttendancePercentage({
      studentId,
      courseId,
      batchId,
      universityId,
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
    const { status, editorId, editorRole, reason } = req.body;

    if (!attendanceId || !status || !editorId || !editorRole || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: attendanceId, status, editorId, editorRole, reason',
        data: null,
      });
    }

    const result = await attendanceService.updateAttendance(attendanceId, {
      status,
      reason,
      editor: {
        id: editorId,
        role: editorRole,
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

module.exports = {
  markAttendance,
  getAttendanceSummary,
  getStudentAttendance,
  getCourseAttendance,
  getBatchAttendance,
  getAttendancePercentage,
  updateAttendance,
};
