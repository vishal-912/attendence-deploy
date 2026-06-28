/**
 * @file attendance.repository.js
 * @description Database access repository for the Attendance module of the University Management Platform.
 * Follows the Repository pattern, separates database concerns, and uses pure parameterized SQL.
 * Focuses strictly on analytics and reporting responsibilities.
 * 
 * DESIGNED FOR POSTGRESQL (pg client/pool)
 * 
 * ASSUMED SCHEMA:
 * 
 * CREATE TABLE IF NOT EXISTS attendance (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     student_id VARCHAR(50) NOT NULL,
 *     course_id VARCHAR(50) NOT NULL,
 *     schedule_id VARCHAR(50) NOT NULL,
 *     batch_id VARCHAR(50) NOT NULL,
 *     university_id VARCHAR(50) NOT NULL,
 *     date DATE NOT NULL,
 *     status VARCHAR(20) NOT NULL, -- e.g., 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'
 *     marked_by VARCHAR(50),
 *     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 *     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * CREATE TABLE IF NOT EXISTS attendance_audit (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     attendance_id UUID NOT NULL REFERENCES attendance(id),
 *     previous_status VARCHAR(20) NOT NULL,
 *     new_status VARCHAR(20) NOT NULL,
 *     editor_id VARCHAR(50) NOT NULL,
 *     reason TEXT NOT NULL,
 *     edited_at TIMESTAMP WITH TIME ZONE NOT NULL,
 *     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * RECOMMENDED INDEXES FOR LARGE DATASETS:
 * CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
 * CREATE INDEX IF NOT EXISTS idx_attendance_course ON attendance(course_id);
 * CREATE INDEX IF NOT EXISTS idx_attendance_batch ON attendance(batch_id);
 * CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
 * CREATE INDEX IF NOT EXISTS idx_attendance_composite ON attendance(student_id, course_id, date);
 */

const dbConfig = require('../../config/database');

/**
 * Custom error wrapper for Database-related errors.
 * Standardizes database errors without leaking internal connection details to service layer.
 */
class AttendanceRepositoryError extends Error {
  /**
   * @param {string} method - Repository method name where error occurred
   * @param {Error} originalError - Original database driver error
   */
  constructor(method, originalError) {
    super(`Database error in AttendanceRepository.${method}: ${originalError.message}`);
    this.name = 'AttendanceRepositoryError';
    this.method = method;
    this.originalError = originalError;
    this.code = originalError.code || null;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Resolves the database pool/client from the database configuration module.
 * Supports various export formats: direct pool/client, object containing 'pool', 'db', or 'client'.
 * 
 * @returns {Object|null} The resolved PostgreSQL client or pool
 */
const getDbClient = () => {
  if (!dbConfig) return null;
  if (typeof dbConfig.query === 'function') return dbConfig;
  if (dbConfig.pool && typeof dbConfig.pool.query === 'function') return dbConfig.pool;
  if (dbConfig.db && typeof dbConfig.db.query === 'function') return dbConfig.db;
  if (dbConfig.client && typeof dbConfig.client.query === 'function') return dbConfig.client;
  return dbConfig;
};

class AttendanceRepository {
  /**
   * Initializes the AttendanceRepository.
   * Supports injecting a mock or specific database connection for testing.
   * 
   * @param {Object} [dbClient] - Custom db client/pool with a .query method (optional)
   */
  constructor(dbClient = null) {
    this._injectedDb = dbClient;
  }

  /**
   * Internal getter to resolve the database connection.
   * Priority: Injected client > Config-based client.
   * 
   * @returns {Object} Database client or pool
   * @throws {Error} If no database client is available
   * @private
   */
  get _db() {
    if (this._injectedDb) {
      return this._injectedDb;
    }
    const client = getDbClient();
    if (!client || typeof client.query !== 'function') {
      throw new Error(
        'Database connection is not initialized. Ensure database configuration ' +
        'in src/config/database.js exports a pg Pool, Client, or a wrapper containing a .query() function.'
      );
    }
    return client;
  }

  /**
   * Standardizes error handling.
   * 
   * @param {string} method - Repository method name
   * @param {Error} error - Caught error
   * @returns {AttendanceRepositoryError|Error} Standardized error
   * @private
   */
  _handleError(method, error) {
    if (error instanceof AttendanceRepositoryError) {
      return error;
    }
    return new AttendanceRepositoryError(method, error);
  }

  /**
   * Helper to build dynamic WHERE clauses safely using parameterized queries.
   * Mitigates SQL injection by keeping conditions separated from values.
   * 
   * @param {Object} filters - Query filters
   * @param {string} [filters.studentId] - Filter by student ID
   * @param {string} [filters.courseId] - Filter by course ID
   * @param {string} [filters.batchId] - Filter by batch ID
   * @param {string} [filters.universityId] - Filter by university ID
   * @param {string} [filters.status] - Filter by status ('PRESENT', 'ABSENT', etc.)
   * @param {string|Date} [filters.startDate] - Start date (inclusive)
   * @param {string|Date} [filters.endDate] - End date (inclusive)
   * @param {number} [startingParamIndex=1] - The starting index for parameters ($1, $2, etc.)
   * @returns {{whereClause: string, values: Array}} The WHERE clause SQL string and parameter values array
   * @private
   */
  _buildWhereClause(filters, startingParamIndex = 1) {
    const conditions = [];
    const values = [];
    let index = startingParamIndex;

    if (!filters) {
      return { whereClause: '', values };
    }

    if (filters.studentId) {
      conditions.push(`student_id = $${index++}`);
      values.push(filters.studentId);
    }
    if (filters.courseId) {
      conditions.push(`course_id = $${index++}`);
      values.push(filters.courseId);
    }
    if (filters.batchId) {
      conditions.push(`batch_id = $${index++}`);
      values.push(filters.batchId);
    }
    if (filters.universityId) {
      conditions.push(`university_id = $${index++}`);
      values.push(filters.universityId);
    }
    if (filters.status) {
      conditions.push(`status = $${index++}`);
      values.push(filters.status);
    }
    if (filters.startDate) {
      conditions.push(`date >= $${index++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`date <= $${index++}`);
      values.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
  }

  /* =========================================================================
     ATTENDANCE REPORTING & ANALYTICS QUERIES
     ========================================================================= */

  /**
   * Retrieves overall attendance summary metrics (counts and overall percentage).
   * Performs high-performance aggregation in a single query run.
   * 
   * @param {Object} [filters={}] - Query filters
   * @param {string} [filters.studentId] - Filter by student ID
   * @param {string} [filters.courseId] - Filter by course ID
   * @param {string} [filters.batchId] - Filter by batch ID
   * @param {string} [filters.universityId] - Filter by university ID
   * @param {string|Date} [filters.startDate] - Filter by start date (inclusive)
   * @param {string|Date} [filters.endDate] - Filter by end date (inclusive)
   * @returns {Promise<Object>} Object containing: { totalRecords, presentCount, absentCount, lateCount, attendancePercentage }
   */
  async getAttendanceSummary(filters = {}) {
    const { whereClause, values } = this._buildWhereClause(filters);

    const sql = `
      SELECT 
        COUNT(*)::integer as "totalRecords",
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::integer as "presentCount",
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END)::integer as "absentCount",
        COUNT(CASE WHEN status = 'LATE' THEN 1 END)::integer as "lateCount",
        COALESCE(
          ROUND(
            (COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 
            2
          )::double precision, 
          0.0
        ) as "attendancePercentage"
      FROM attendance
      ${whereClause}
    `;

    try {
      const result = await this._db.query(sql, values);
      return result.rows[0] || {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        attendancePercentage: 0.0
      };
    } catch (error) {
      throw this._handleError('getAttendanceSummary', error);
    }
  }

  /**
   * Retrieves detailed, paginated attendance records for a specific student.
   * 
   * @param {Object} filters - Query filters
   * @param {string} filters.studentId - The student ID (Required)
   * @param {string|Date} [filters.startDate] - Start date
   * @param {string|Date} [filters.endDate] - End date
   * @param {number} [filters.limit=100] - Pagination limit
   * @param {number} [filters.offset=0] - Pagination offset
   * @returns {Promise<Array<Object>>} List of attendance records
   */
  async getStudentAttendance(filters = {}) {
    if (!filters || !filters.studentId) {
      throw new Error('studentId is required in filters for getStudentAttendance');
    }

    const queryFilters = { ...filters };
    const limit = Number.isInteger(queryFilters.limit) && queryFilters.limit > 0 ? queryFilters.limit : 100;
    const offset = Number.isInteger(queryFilters.offset) && queryFilters.offset >= 0 ? queryFilters.offset : 0;

    delete queryFilters.limit;
    delete queryFilters.offset;

    const { whereClause, values } = this._buildWhereClause(queryFilters);

    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    values.push(limit, offset);

    const sql = `
      SELECT 
        id,
        student_id as "studentId",
        course_id as "courseId",
        batch_id as "batchId",
        university_id as "universityId",
        date,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM attendance
      ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    try {
      const result = await this._db.query(sql, values);
      return result.rows;
    } catch (error) {
      throw this._handleError('getStudentAttendance', error);
    }
  }

  /**
   * Retrieves detailed, paginated attendance records for a specific course.
   * 
   * @param {Object} filters - Query filters
   * @param {string} filters.courseId - The course ID (Required)
   * @param {string|Date} [filters.startDate] - Start date
   * @param {string|Date} [filters.endDate] - End date
   * @param {number} [filters.limit=100] - Pagination limit
   * @param {number} [filters.offset=0] - Pagination offset
   * @returns {Promise<Array<Object>>} List of attendance records
   */
  async getCourseAttendance(filters = {}) {
    if (!filters || !filters.courseId) {
      throw new Error('courseId is required in filters for getCourseAttendance');
    }

    const queryFilters = { ...filters };
    const limit = Number.isInteger(queryFilters.limit) && queryFilters.limit > 0 ? queryFilters.limit : 100;
    const offset = Number.isInteger(queryFilters.offset) && queryFilters.offset >= 0 ? queryFilters.offset : 0;

    delete queryFilters.limit;
    delete queryFilters.offset;

    const { whereClause, values } = this._buildWhereClause(queryFilters);

    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    values.push(limit, offset);

    const sql = `
      SELECT 
        id,
        student_id as "studentId",
        course_id as "courseId",
        batch_id as "batchId",
        university_id as "universityId",
        date,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM attendance
      ${whereClause}
      ORDER BY date DESC, student_id ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    try {
      const result = await this._db.query(sql, values);
      return result.rows;
    } catch (error) {
      throw this._handleError('getCourseAttendance', error);
    }
  }

  /**
   * Retrieves detailed, paginated attendance records for a specific batch.
   * 
   * @param {Object} filters - Query filters
   * @param {string} filters.batchId - The batch ID (Required)
   * @param {string|Date} [filters.startDate] - Start date
   * @param {string|Date} [filters.endDate] - End date
   * @param {number} [filters.limit=100] - Pagination limit
   * @param {number} [filters.offset=0] - Pagination offset
   * @returns {Promise<Array<Object>>} List of attendance records
   */
  async getBatchAttendance(filters = {}) {
    if (!filters || !filters.batchId) {
      throw new Error('batchId is required in filters for getBatchAttendance');
    }

    const queryFilters = { ...filters };
    const limit = Number.isInteger(queryFilters.limit) && queryFilters.limit > 0 ? queryFilters.limit : 100;
    const offset = Number.isInteger(queryFilters.offset) && queryFilters.offset >= 0 ? queryFilters.offset : 0;

    delete queryFilters.limit;
    delete queryFilters.offset;

    const { whereClause, values } = this._buildWhereClause(queryFilters);

    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    values.push(limit, offset);

    const sql = `
      SELECT 
        id,
        student_id as "studentId",
        course_id as "courseId",
        batch_id as "batchId",
        university_id as "universityId",
        date,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM attendance
      ${whereClause}
      ORDER BY date DESC, student_id ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    try {
      const result = await this._db.query(sql, values);
      return result.rows;
    } catch (error) {
      throw this._handleError('getBatchAttendance', error);
    }
  }

  /**
   * Calculates overall attendance percentage based on provided filters.
   * Formula: percentage = (present classes / total classes) * 100
   * 
   * @param {Object} [filters={}] - Query filters
   * @param {string} [filters.studentId] - Filter by student ID
   * @param {string} [filters.courseId] - Filter by course ID
   * @param {string} [filters.batchId] - Filter by batch ID
   * @param {string} [filters.universityId] - Filter by university ID
   * @param {string|Date} [filters.startDate] - Start date
   * @param {string|Date} [filters.endDate] - End date
   * @returns {Promise<number>} Double precision percentage value (0.00 to 100.00)
   */
  async getAttendancePercentage(filters = {}) {
    const { whereClause, values } = this._buildWhereClause(filters);

    const sql = `
      SELECT 
        COALESCE(
          ROUND(
            (COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 
            2
          )::double precision, 
          0.0
        ) as percentage
      FROM attendance
      ${whereClause}
    `;

    try {
      const result = await this._db.query(sql, values);
      return result.rows[0] ? result.rows[0].percentage : 0.0;
    } catch (error) {
      throw this._handleError('getAttendancePercentage', error);
    }
  }

  /**
   * Retrieves a list of students whose attendance falls below a configurable threshold.
   * Executes computations inside PostgreSQL using GROUP BY and HAVING clauses for optimal scalability.
   * 
   * @param {number} threshold - Threshold percentage (e.g., 75.0)
   * @param {Object} [filters={}] - Aggregation filters
   * @param {string|Date} [filters.startDate] - Filter by start date
   * @param {string|Date} [filters.endDate] - Filter by end date
   * @param {string} [filters.courseId] - Filter by course ID
   * @param {string} [filters.batchId] - Filter by batch ID
   * @param {string} [filters.universityId] - Filter by university ID
   * @param {number} [filters.limit=100] - Pagination limit
   * @param {number} [filters.offset=0] - Pagination offset
   * @returns {Promise<Array<Object>>} List of objects containing: { studentId, totalClasses, presentClasses, attendancePercentage }
   */
  async getStudentsBelowThreshold(threshold, filters = {}) {
    if (threshold === undefined || threshold === null || typeof threshold !== 'number') {
      throw new Error('A numeric threshold parameter is required for getStudentsBelowThreshold');
    }

    const queryFilters = { ...filters };
    const limit = Number.isInteger(queryFilters.limit) && queryFilters.limit > 0 ? queryFilters.limit : 100;
    const offset = Number.isInteger(queryFilters.offset) && queryFilters.offset >= 0 ? queryFilters.offset : 0;

    delete queryFilters.limit;
    delete queryFilters.offset;

    const { whereClause, values } = this._buildWhereClause(queryFilters);

    const thresholdParamIndex = values.length + 1;
    const limitParamIndex = values.length + 2;
    const offsetParamIndex = values.length + 3;

    values.push(threshold);
    values.push(limit);
    values.push(offset);

    const sql = `
      SELECT 
        student_id as "studentId",
        COUNT(*)::integer as "totalClasses",
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::integer as "presentClasses",
        COALESCE(
          ROUND(
            (COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 
            2
          )::double precision, 
          0.0
        ) as "attendancePercentage"
      FROM attendance
      ${whereClause}
      GROUP BY student_id
      HAVING 
        COALESCE(
          (COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 
          0.0
        ) < $${thresholdParamIndex}
      ORDER BY "attendancePercentage" ASC, student_id ASC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    try {
      const result = await this._db.query(sql, values);
      return result.rows;
    } catch (error) {
      throw this._handleError('getStudentsBelowThreshold', error);
    }
  }

  /* =========================================================================
     ATTENDANCE WRITE & LOOKUP OPERATIONS
     ========================================================================= */

  /**
   * Finds a scheduled class record by its primary key.
   *
   * @param {string} scheduleId - The scheduled class ID
   * @returns {Promise<Object|null>} The scheduled class row, or null if not found
   */
  async findScheduledClassById(scheduleId) {
    const sql = `SELECT * FROM scheduled_classes WHERE id = $1`;
    try {
      const result = await this._db.query(sql, [scheduleId]);
      return result.rows[0] || null;
    } catch (error) {
      throw this._handleError('findScheduledClassById', error);
    }
  }

  /**
   * Checks whether a student is enrolled in the batch associated with a scheduled class.
   *
   * @param {string} studentId - The student ID
   * @param {string} scheduleId - The scheduled class ID
   * @returns {Promise<boolean>} True if the student is enrolled, false otherwise
   */
  async isStudentEnrolled(studentId, scheduleId) {
    try {
      const scheduleResult = await this._db.query(
        `SELECT batch_id FROM scheduled_classes WHERE id = $1`,
        [scheduleId]
      );
      if (!scheduleResult.rows[0]) return false;
      const batchId = scheduleResult.rows[0].batch_id;
      const enrollResult = await this._db.query(
        `SELECT 1 FROM student_batches WHERE student_id = $1 AND batch_id = $2`,
        [studentId, batchId]
      );
      return enrollResult.rows.length > 0;
    } catch (error) {
      throw this._handleError('isStudentEnrolled', error);
    }
  }

  /**
   * Finds an existing attendance record for a student in a specific scheduled class.
   *
   * @param {string} studentId - The student ID
   * @param {string} scheduleId - The scheduled class ID
   * @returns {Promise<Object|null>} The attendance row, or null if not found
   */
  async findAttendanceByStudentAndClass(studentId, scheduleId) {
    const sql = `SELECT * FROM attendance WHERE student_id = $1 AND schedule_id = $2`;
    try {
      const result = await this._db.query(sql, [studentId, scheduleId]);
      return result.rows[0] || null;
    } catch (error) {
      throw this._handleError('findAttendanceByStudentAndClass', error);
    }
  }

  /**
   * Inserts a new attendance record.
   *
   * @param {Object} payload - Attendance data
   * @param {string} payload.studentId
   * @param {string} payload.courseId
   * @param {string} payload.scheduleId
   * @param {string} payload.batchId
   * @param {string} payload.universityId
   * @param {string} payload.status
   * @param {string|Date} payload.date
   * @param {string} payload.markedBy
   * @returns {Promise<Object>} The newly created attendance row
   */
  async createAttendance(payload) {
    const sql = `
      INSERT INTO attendance
        (student_id, course_id, schedule_id, batch_id, university_id, status, date, marked_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    try {
      const result = await this._db.query(sql, [
        payload.studentId,
        payload.courseId,
        payload.scheduleId,
        payload.batchId,
        payload.universityId,
        payload.status,
        payload.date,
        payload.markedBy,
      ]);
      return result.rows[0];
    } catch (error) {
      throw this._handleError('createAttendance', error);
    }
  }

  /**
   * Finds an attendance record by its primary key.
   *
   * @param {string} attendanceId - The attendance record UUID
   * @returns {Promise<Object|null>} The attendance row, or null if not found
   */
  async findAttendanceById(attendanceId) {
    const sql = `SELECT * FROM attendance WHERE id = $1`;
    try {
      const result = await this._db.query(sql, [attendanceId]);
      return result.rows[0] || null;
    } catch (error) {
      throw this._handleError('findAttendanceById', error);
    }
  }

  /**
   * Updates an existing attendance record's status.
   *
   * @param {string} attendanceId - The attendance record UUID
   * @param {string} status - The new status value (e.g., 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED')
   * @returns {Promise<Object>} The updated attendance row
   */
  async updateAttendance(attendanceId, status) {
    const sql = `
      UPDATE attendance
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    try {
      const result = await this._db.query(sql, [status, attendanceId]);
      return result.rows[0];
    } catch (error) {
      throw this._handleError('updateAttendance', error);
    }
  }

  /**
   * Inserts an audit log record for an attendance change.
   *
   * @param {Object} auditLog - Audit log data
   * @param {string} auditLog.attendanceId
   * @param {string} auditLog.previousStatus
   * @param {string} auditLog.newStatus
   * @param {string} auditLog.editorId
   * @param {string} auditLog.reason
   * @param {string|Date} auditLog.editedAt
   * @returns {Promise<Object>} The newly created audit row
   */
  async createAuditRecord(auditLog) {
    const sql = `
      INSERT INTO attendance_audit
        (attendance_id, previous_status, new_status, editor_id, reason, edited_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    try {
      const result = await this._db.query(sql, [
        auditLog.attendanceId,
        auditLog.previousStatus,
        auditLog.newStatus,
        auditLog.editorId,
        auditLog.reason,
        auditLog.editedAt,
      ]);
      return result.rows[0];
    } catch (error) {
      throw this._handleError('createAuditRecord', error);
    }
  }
}

const repositoryInstance = new AttendanceRepository();

repositoryInstance.AttendanceRepository = AttendanceRepository;

module.exports = repositoryInstance;