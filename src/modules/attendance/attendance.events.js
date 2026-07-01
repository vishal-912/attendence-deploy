'use strict';

/*
CREATE TABLE IF NOT EXISTS outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT FALSE
);
*/

const dbConfig = require('../../config/database');

const getDbClient = () => {
  if (!dbConfig) return null;
  if (typeof dbConfig.query === 'function') return dbConfig;
  if (dbConfig.pool && typeof dbConfig.pool.query === 'function') return dbConfig.pool;
  if (dbConfig.db && typeof dbConfig.db.query === 'function') return dbConfig.db;
  if (dbConfig.client && typeof dbConfig.client.query === 'function') return dbConfig.client;
  return dbConfig;
};

/**
 * Emits AttendanceMarked event by writing it to the outbox table.
 * @param {Object} record - The attendance record.
 * @returns {Promise<Object>} The written outbox database record.
 */
async function emitAttendanceMarked(record) {
  try {
    const client = getDbClient();
    const result = await client.query(
      'INSERT INTO outbox (event_type, payload) VALUES ($1, $2) RETURNING *',
      ['AttendanceMarked', JSON.stringify(record)]
    );
    return result.rows[0];
  } catch (error) {
    throw new Error('Failed to emit AttendanceMarked event: ' + error.message);
  }
}

/**
 * Emits AttendanceUpdated event by writing it to the outbox table.
 * @param {Object} auditLog - The audit log entry.
 * @returns {Promise<Object>} The written outbox database record.
 */
async function emitAttendanceUpdated(auditLog) {
  try {
    const client = getDbClient();
    const result = await client.query(
      'INSERT INTO outbox (event_type, payload) VALUES ($1, $2) RETURNING *',
      ['AttendanceUpdated', JSON.stringify(auditLog)]
    );
    return result.rows[0];
  } catch (error) {
    throw new Error('Failed to emit AttendanceUpdated event: ' + error.message);
  }
}

/**
 * Emits AttendanceThresholdBreached event by writing it to the outbox table.
 * @param {Object} data - The threshold breach data.
 * @returns {Promise<Object>} The written outbox database record.
 */
async function emitAttendanceThresholdBreached(data) {
  try {
    const client = getDbClient();
    const result = await client.query(
      'INSERT INTO outbox (event_type, payload) VALUES ($1, $2) RETURNING *',
      ['AttendanceThresholdBreached', JSON.stringify(data)]
    );
    return result.rows[0];
  } catch (error) {
    throw new Error('Failed to emit AttendanceThresholdBreached event: ' + error.message);
  }
}

module.exports = {
  emitAttendanceMarked,
  emitAttendanceUpdated,
  emitAttendanceThresholdBreached,
};