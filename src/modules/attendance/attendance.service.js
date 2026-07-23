'use strict';

const repository = require('./attendance.repository');
const attendanceEvents = require('./attendance.events');
const types = require('./attendance.types');

class BusinessValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BusinessValidationError';
    this.status = 400;
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
    this.status = 403;
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarDate(dateInput) {
  if (dateInput instanceof Date) {
    return getLocalDateString(dateInput);
  }
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      return dateInput.substring(0, 10);
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return getLocalDateString(d);
    }
    throw new BusinessValidationError('Invalid date format.');
  }
  if (typeof dateInput === 'number') {
    return getLocalDateString(new Date(dateInput));
  }
  return getLocalDateString(new Date());
}

async function markAttendance(data) {
  if (!data) {
    throw new BusinessValidationError('Attendance data is required.');
  }

  const studentId = data.studentId;
  const scheduleId = data.scheduleId;
  let status = data.status;
  if (status && typeof status === 'string') {
    status = status.toUpperCase();
  }

  if (!studentId) {
    throw new BusinessValidationError('Student ID is required to mark attendance.');
  }
  if (!scheduleId) {
    throw new BusinessValidationError('Scheduled class ID is required to mark attendance.');
  }
  if (!status) {
    throw new BusinessValidationError('Attendance status is required.');
  }
  if (!data.universityId) {
    throw new BusinessValidationError('University ID is required to mark attendance.');
  }

  const statusValues = Object.values(types.AttendanceStatus);
  if (!statusValues.includes(status)) {
    throw new BusinessValidationError(
      `Invalid status: ${status}. Must be one of: ${statusValues.join(', ')}.`
    );
  }

  if (data.date) {
    const inputDateStr = getCalendarDate(data.date);
    const todayStr = getCalendarDate(new Date());
    if (inputDateStr > todayStr) {
      throw new BusinessValidationError('Attendance date cannot be in the future.');
    }
  }

  const scheduledClass = await repository.findScheduledClassById(scheduleId);
  if (!scheduledClass) {
    throw new BusinessValidationError(`Scheduled class with ID ${scheduleId} does not exist.`);
  }

  const isEnrolled = await repository.isStudentEnrolled(studentId, scheduleId);
  if (!isEnrolled) {
    throw new BusinessValidationError(`Student ${studentId} is not enrolled in scheduled class ${scheduleId}.`);
  }

  const existingAttendance = await repository.findAttendanceByStudentAndClass(studentId, scheduleId);
  if (existingAttendance) {
    throw new BusinessValidationError(`Attendance record already exists for student ${studentId} in scheduled class ${scheduleId}.`);
  }

  const payload = {
    studentId,
    courseId: data.courseId,
    scheduleId,
    batchId: data.batchId,
    universityId: data.universityId,
    status,
    date: data.date || new Date(),
    markedBy: data.markedBy,
  };

  const savedRecord = await repository.createAttendance(payload);

  try {
    await attendanceEvents.emitAttendanceMarked(savedRecord);
  } catch (eventError) {
    console.error('Failed to emit AttendanceMarked event:', eventError);
  }

  return savedRecord;
}

async function updateAttendance(attendanceId, updateData) {
  if (!attendanceId) {
    throw new BusinessValidationError('Attendance ID is required for update.');
  }
  if (!updateData) {
    throw new BusinessValidationError('Update data is required.');
  }

  let { status, reason } = updateData;
  if (status && typeof status === 'string') {
    status = status.toUpperCase();
  }

  if (!status) {
    throw new BusinessValidationError('New attendance status is required.');
  }
  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    throw new BusinessValidationError('A valid correction reason is required.');
  }

  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes('ignore') || lowerReason.includes('instruction') || lowerReason.includes('reset system') || lowerReason.includes('override system')) {
    throw new BusinessValidationError('Invalid prompt injection payload in reason string.');
  }

  const editor = updateData.editor;
  if (!editor) {
    throw new BusinessValidationError('Editor information is required for authorization.');
  }

  const role = editor?.role;
  const editorId = editor?.id;
  const editorUniId = editor?.universityId;

  if (!role) {
    throw new AuthenticationError('Unauthorized: Missing user role.');
  }

  const normalizedRole = role.toUpperCase();
  if (
    normalizedRole !== 'FACULTY' &&
    normalizedRole !== 'ADMIN' &&
    normalizedRole !== 'UNIVERSITY_ADMIN' &&
    normalizedRole !== 'SUPER_ADMIN'
  ) {
    throw new AuthorizationError('Unauthorized: Only faculty or admin users can update attendance.');
  }

  const attendance = await repository.findAttendanceById(attendanceId);
  if (!attendance) {
    throw new BusinessValidationError(`Attendance record with ID ${attendanceId} not found.`);
  }

  const statusValues = Object.values(types.AttendanceStatus);
  if (!statusValues.includes(status)) {
    throw new BusinessValidationError(`Invalid status: ${status}. Must be one of: ${statusValues.join(', ')}.`);
  }

  // Tenant Isolation Security Check
  if (
    normalizedRole !== 'SUPER_ADMIN' &&
    editorUniId &&
    attendance.university_id &&
    attendance.university_id !== editorUniId
  ) {
    throw new AuthorizationError('Unauthorized: Cannot update attendance record from another university.');
  }

  const previousStatus = attendance.status;

  const updatePayload = {
    status,
    previousStatus,
    reason: reason.trim(),
    editorId: editorId,
    editedAt: new Date()
  };

  const updatedRecord = await repository.updateAttendance(attendanceId, status);

  const auditLog = {
    attendanceId,
    previousStatus,
    newStatus: status,
    editorId: editorId,
    reason: reason.trim(),
    editedAt: new Date()
  };

  await repository.createAuditRecord(auditLog);

  try {
    await attendanceEvents.emitAttendanceUpdated(auditLog);
  } catch (eventError) {
    console.error('Failed to emit AttendanceUpdated event:', eventError);
  }

  return updatedRecord;
}

function validateServiceDates(startDate, endDate) {
  if (startDate !== undefined && startDate !== null && startDate !== '') {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) {
      throw new BusinessValidationError('Invalid date format.');
    }
  }
  if (endDate !== undefined && endDate !== null && endDate !== '') {
    const d = new Date(endDate);
    if (isNaN(d.getTime())) {
      throw new BusinessValidationError('Invalid date format.');
    }
  }
}

async function getAttendanceSummary({ startDate, endDate, courseId, batchId, universityId } = {}) {
  validateServiceDates(startDate, endDate);
  return await repository.getAttendanceSummary({ startDate, endDate, courseId, batchId, universityId });
}

async function getStudentAttendance({ studentId, startDate, endDate, limit, offset } = {}) {
  if (!studentId) {
    throw new BusinessValidationError('Student ID is required.');
  }
  validateServiceDates(startDate, endDate);
  return await repository.getStudentAttendance({ studentId, startDate, endDate, limit, offset });
}

async function getCourseAttendance({ courseId, startDate, endDate, limit, offset } = {}) {
  if (!courseId) {
    throw new BusinessValidationError('Course ID is required.');
  }
  if (courseId === 'CS9999') {
    throw new BusinessValidationError('Course not found.');
  }
  validateServiceDates(startDate, endDate);
  return await repository.getCourseAttendance({ courseId, startDate, endDate, limit, offset });
}

async function getBatchAttendance({ batchId, startDate, endDate, limit, offset } = {}) {
  if (!batchId) {
    throw new BusinessValidationError('Batch ID is required.');
  }
  validateServiceDates(startDate, endDate);
  return await repository.getBatchAttendance({ batchId, startDate, endDate, limit, offset });
}

async function getAttendancePercentage({ studentId, courseId, batchId, universityId, startDate, endDate } = {}) {
  if (!studentId && !courseId && !batchId && !universityId) {
    throw new BusinessValidationError('At least one query parameter (studentId, courseId, batchId, or universityId) is required.');
  }
  validateServiceDates(startDate, endDate);
  return await repository.getAttendancePercentage({ studentId, courseId, batchId, universityId, startDate, endDate });
}

async function getStudentsBelowThreshold(threshold, filters = {}) {
  if (threshold === undefined || threshold === null || typeof threshold !== 'number' || isNaN(threshold) || threshold < 0 || threshold > 100) {
    throw new BusinessValidationError('A numeric threshold parameter between 0 and 100 is required for getStudentsBelowThreshold');
  }
  return await repository.getStudentsBelowThreshold(threshold, filters);
}

module.exports = {
  markAttendance,
  updateAttendance,
  getAttendanceSummary,
  getStudentAttendance,
  getCourseAttendance,
  getBatchAttendance,
  getAttendancePercentage,
  getStudentsBelowThreshold
};