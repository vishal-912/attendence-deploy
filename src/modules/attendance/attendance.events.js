'use strict';

const { publishEvent } = require('../../shared/events/outbox.publisher');

/**
 * Emits AttendanceMarked event by writing it to the transactional outbox table.
 * @param {Object} record - The attendance record.
 * @returns {Promise<Object>} The written outbox database record.
 */
async function emitAttendanceMarked(record) {
  return publishEvent('AttendanceMarked', record);
}

/**
 * Emits AttendanceUpdated event by writing it to the transactional outbox table.
 * @param {Object} auditLog - The audit log entry.
 * @returns {Promise<Object>} The written outbox database record.
 */
async function emitAttendanceUpdated(auditLog) {
  return publishEvent('AttendanceUpdated', auditLog);
}

/**
 * Emits AttendanceThresholdBreached event by writing it to the transactional outbox table.
 * @param {Object} data - The threshold breach data.
 * @returns {Promise<Object>} The written outbox database record.
 */
async function emitAttendanceThresholdBreached(data) {
  return publishEvent('AttendanceThresholdBreached', data);
}

module.exports = {
  emitAttendanceMarked,
  emitAttendanceUpdated,
  emitAttendanceThresholdBreached,
};