'use strict';

const crypto = require('crypto');

// In-memory tables
const tables = {
  attendance: [
    {
      id: 'att-001',
      student_id: '11723210018',
      course_id: 'CS101',
      schedule_id: 'SCH001',
      batch_id: 'CSE-2023-A',
      university_id: 'SRM',
      status: 'PRESENT',
      date: new Date('2026-07-20T10:00:00Z'),
      marked_by: 'editor-1',
      created_at: new Date('2026-07-20T10:00:00Z'),
      updated_at: new Date('2026-07-20T10:00:00Z')
    },
    {
      id: 'att-002',
      student_id: '11723210019',
      course_id: 'CS101',
      schedule_id: 'SCH001',
      batch_id: 'CSE-2023-A',
      university_id: 'SRM',
      status: 'ABSENT',
      date: new Date('2026-07-20T10:00:00Z'),
      marked_by: 'editor-1',
      created_at: new Date('2026-07-20T10:00:00Z'),
      updated_at: new Date('2026-07-20T10:00:00Z')
    },
    {
      id: 'att-003',
      student_id: '11723210018',
      course_id: 'CS101',
      schedule_id: 'SCH001',
      batch_id: 'CSE-2023-A',
      university_id: 'SRM',
      status: 'PRESENT',
      date: new Date('2026-07-21T10:00:00Z'),
      marked_by: 'editor-1',
      created_at: new Date('2026-07-21T10:00:00Z'),
      updated_at: new Date('2026-07-21T10:00:00Z')
    },
    {
      id: 'att-004',
      student_id: '11723210019',
      course_id: 'CS101',
      schedule_id: 'SCH001',
      batch_id: 'CSE-2023-A',
      university_id: 'SRM',
      status: 'PRESENT',
      date: new Date('2026-07-21T10:00:00Z'),
      marked_by: 'editor-1',
      created_at: new Date('2026-07-21T10:00:00Z'),
      updated_at: new Date('2026-07-21T10:00:00Z')
    },
    {
      id: 'att-005',
      student_id: '11723210020',
      course_id: 'CS102',
      schedule_id: 'SCH002',
      batch_id: 'CSE-2023-B',
      university_id: 'JECRC',
      status: 'LATE',
      date: new Date('2026-07-20T11:00:00Z'),
      marked_by: 'editor-2',
      created_at: new Date('2026-07-20T11:00:00Z'),
      updated_at: new Date('2026-07-20T11:00:00Z')
    },
    {
      id: 'att-006',
      student_id: '11723210021',
      course_id: 'CS102',
      schedule_id: 'SCH002',
      batch_id: 'CSE-2023-B',
      university_id: 'JECRC',
      status: 'PRESENT',
      date: new Date('2026-07-20T11:00:00Z'),
      marked_by: 'editor-2',
      created_at: new Date('2026-07-20T11:00:00Z'),
      updated_at: new Date('2026-07-20T11:00:00Z')
    }
  ],
  attendance_audit: [],
  scheduled_classes: [
    {
      id: 'schedule-1',
      batch_id: 'batch-1',
      course_id: 'course-1',
      university_id: 'univ-1'
    },
    {
      id: 'SCH001',
      batch_id: 'CSE-2023-A',
      course_id: 'CS101',
      university_id: 'SRM'
    },
    {
      id: 'SCH002',
      batch_id: 'CSE-2023-B',
      course_id: 'CS102',
      university_id: 'JECRC'
    },
    {
      id: 'SCH003',
      batch_id: 'CSE-2024-A',
      course_id: 'CS103',
      university_id: 'SRM'
    },
    {
      id: 'SCH004',
      batch_id: 'CSE-2024-B',
      course_id: 'CS104',
      university_id: 'JECRC'
    }
  ],

  student_batches: [
    { student_id: '11723210018', batch_id: 'CSE-2023-A' },
    { student_id: '11723210019', batch_id: 'CSE-2023-A' },
    { student_id: '11723210020', batch_id: 'CSE-2023-B' },
    { student_id: '11723210021', batch_id: 'CSE-2023-B' },
    { student_id: '11723210022', batch_id: 'CSE-2024-A' },
    { student_id: '11723210023', batch_id: 'CSE-2024-A' },
    { student_id: '11723210024', batch_id: 'CSE-2024-B' },
    { student_id: '11723210025', batch_id: 'CSE-2024-B' }
  ],
  outbox: []
};

function getFilteredAttendance(sql, params) {
  // Find where clause
  const whereMatch = sql.match(/where\s+([\s\S]+?)(?:order\s+by|group\s+by|limit\s+|$)/i);
  let filtered = [...tables.attendance];
  if (whereMatch) {
    const whereContent = whereMatch[1];
    // Split conditions by AND
    const conditions = whereContent.split(/\band\b/i).map(c => c.trim());
    conditions.forEach(cond => {
      // Find parameter placeholder e.g. $1 or $2 or $10
      const paramMatch = cond.match(/\$(\d+)/);
      if (!paramMatch) return;
      const paramIndex = parseInt(paramMatch[1], 10) - 1;
      const val = params[paramIndex];

      if (cond.includes('student_id =')) {
        filtered = filtered.filter(a => a.student_id === val);
      } else if (cond.includes('course_id =')) {
        filtered = filtered.filter(a => a.course_id === val);
      } else if (cond.includes('batch_id =')) {
        filtered = filtered.filter(a => a.batch_id === val);
      } else if (cond.includes('university_id =')) {
        filtered = filtered.filter(a => a.university_id === val);
      } else if (cond.includes('status =')) {
        filtered = filtered.filter(a => a.status === val);
      } else if (cond.includes('date >=') || cond.includes('date >=')) {
        filtered = filtered.filter(a => new Date(a.date) >= new Date(val));
      } else if (cond.includes('date <=') || cond.includes('date <=')) {
        filtered = filtered.filter(a => new Date(a.date) <= new Date(val));
      }
    });
  }
  return filtered;
}

const query = async (sql, params = []) => {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();

  // 1. SELECT * FROM scheduled_classes WHERE id = $1
  if (/SELECT \* FROM scheduled_classes WHERE id = \$1/i.test(normalizedSql)) {
    const id = params[0];
    const rows = tables.scheduled_classes.filter(sc => sc.id === id);
    return { rows };
  }

  // 2. SELECT batch_id FROM scheduled_classes WHERE id = $1
  if (/SELECT batch_id FROM scheduled_classes WHERE id = \$1/i.test(normalizedSql)) {
    const id = params[0];
    const rows = tables.scheduled_classes.filter(sc => sc.id === id).map(sc => ({ batch_id: sc.batch_id }));
    return { rows };
  }

  // 3. SELECT 1 FROM student_batches WHERE student_id = $1 AND batch_id = $2
  if (/SELECT 1 FROM student_batches WHERE student_id = \$1 AND batch_id = \$2/i.test(normalizedSql)) {
    const studentId = params[0];
    const batchId = params[1];
    const match = tables.student_batches.some(sb => sb.student_id === studentId && sb.batch_id === batchId);
    return { rows: match ? [{ 1: 1 }] : [] };
  }

  // 4. SELECT * FROM attendance WHERE student_id = $1 AND schedule_id = $2
  if (/SELECT \* FROM attendance WHERE student_id = \$1 AND schedule_id = \$2/i.test(normalizedSql)) {
    const studentId = params[0];
    const scheduleId = params[1];
    const rows = tables.attendance.filter(a => a.student_id === studentId && a.schedule_id === scheduleId);
    return { rows };
  }

  // 5. SELECT * FROM attendance WHERE id = $1
  if (/SELECT \* FROM attendance WHERE id = \$1/i.test(normalizedSql)) {
    const id = params[0];
    const rows = tables.attendance.filter(a => a.id === id);
    return { rows };
  }

  // 6. INSERT INTO attendance
  if (/INSERT INTO attendance\b/i.test(normalizedSql)) {
    const record = {
      id: crypto.randomUUID(),
      student_id: params[0],
      course_id: params[1],
      schedule_id: params[2],
      batch_id: params[3],
      university_id: params[4],
      status: params[5],
      date: params[6] ? new Date(params[6]) : new Date(),
      marked_by: params[7],
      created_at: new Date(),
      updated_at: new Date()
    };
    tables.attendance.push(record);
    return { rows: [record] };
  }

  // 7. UPDATE attendance SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *
  if (/UPDATE attendance SET status = \$1/i.test(normalizedSql)) {
    const status = params[0];
    const id = params[1];
    const record = tables.attendance.find(a => a.id === id);
    if (record) {
      record.status = status;
      record.updated_at = new Date();
    }
    return { rows: record ? [record] : [] };
  }

  // 8. INSERT INTO attendance_audit
  if (/INSERT INTO attendance_audit/i.test(normalizedSql)) {
    const record = {
      id: crypto.randomUUID(),
      attendance_id: params[0],
      previous_status: params[1],
      new_status: params[2],
      editor_id: params[3],
      reason: params[4],
      edited_at: params[5] ? new Date(params[5]) : new Date(),
      created_at: new Date()
    };
    tables.attendance_audit.push(record);
    return { rows: [record] };
  }

  // 9. INSERT INTO outbox (event_type, payload) VALUES ($1, $2) RETURNING *
  if (/INSERT INTO outbox/i.test(normalizedSql)) {
    const record = {
      id: crypto.randomUUID(),
      event_type: params[0],
      payload: JSON.parse(params[1]),
      created_at: new Date(),
      published: false
    };
    tables.outbox.push(record);
    return { rows: [record] };
  }

  // 10. SELECT COUNT(*)::integer as "totalRecords", ... FROM attendance (getAttendanceSummary)
  if (normalizedSql.includes('"totalRecords"')) {
    const filtered = getFilteredAttendance(normalizedSql, params);
    const totalRecords = filtered.length;
    const presentCount = filtered.filter(a => a.status === 'PRESENT').length;
    const absentCount = filtered.filter(a => a.status === 'ABSENT').length;
    const lateCount = filtered.filter(a => a.status === 'LATE').length;
    const attendancePercentage = totalRecords > 0 ? parseFloat(((presentCount / totalRecords) * 100).toFixed(2)) : 0.0;
    return {
      rows: [{
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        attendancePercentage
      }]
    };
  }

  // 11. SELECT COALESCE(ROUND(...)) as percentage FROM attendance (getAttendancePercentage)
  if (normalizedSql.includes('percentage') && normalizedSql.includes('FROM attendance')) {
    const filtered = getFilteredAttendance(normalizedSql, params);
    const total = filtered.length;
    const present = filtered.filter(a => a.status === 'PRESENT').length;
    const percentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : 0.0;
    return {
      rows: [{ percentage }]
    };
  }

  // 12. SELECT id, student_id as "studentId" ... FROM attendance (getStudentAttendance / getCourseAttendance / getBatchAttendance)
  if (normalizedSql.includes('"studentId"') && normalizedSql.includes('FROM attendance')) {
    let filtered = getFilteredAttendance(normalizedSql, params);

    // Sort logic
    filtered.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // Handle pagination (LIMIT and OFFSET)
    const limitMatch = normalizedSql.match(/LIMIT\s+\$(\d+)/i);
    const offsetMatch = normalizedSql.match(/OFFSET\s+\$(\d+)/i);
    let limit = 100;
    let offset = 0;
    if (limitMatch) {
      const limitIndex = parseInt(limitMatch[1], 10) - 1;
      limit = params[limitIndex];
    }
    if (offsetMatch) {
      const offsetIndex = parseInt(offsetMatch[1], 10) - 1;
      offset = params[offsetIndex];
    }

    const paginated = filtered.slice(offset, offset + limit);
    const mapped = paginated.map(a => ({
      id: a.id,
      studentId: a.student_id,
      courseId: a.course_id,
      batchId: a.batch_id,
      universityId: a.university_id,
      date: a.date,
      status: a.status,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));
    return { rows: mapped };
  }

  // 13. getStudentsBelowThreshold query (HAVING COUNT)
  if (normalizedSql.includes('HAVING') && normalizedSql.includes('student_id')) {
    const havingMatch = normalizedSql.match(/<\s+\$(\d+)/);
    let threshold = 75.0;
    if (havingMatch) {
      const thresholdIndex = parseInt(havingMatch[1], 10) - 1;
      threshold = params[thresholdIndex];
    }

    const studentGroups = {};
    tables.attendance.forEach(a => {
      if (!studentGroups[a.student_id]) {
        studentGroups[a.student_id] = [];
      }
      studentGroups[a.student_id].push(a);
    });

    const results = [];
    for (const studentId of Object.keys(studentGroups)) {
      const records = studentGroups[studentId];
      const totalClasses = records.length;
      const presentClasses = records.filter(a => a.status === 'PRESENT').length;
      const attendancePercentage = totalClasses > 0 ? parseFloat(((presentClasses / totalClasses) * 100).toFixed(2)) : 0.0;
      if (attendancePercentage < threshold) {
        results.push({
          studentId,
          totalClasses,
          presentClasses,
          attendancePercentage
        });
      }
    }

    results.sort((a, b) => {
      if (a.attendancePercentage !== b.attendancePercentage) {
        return a.attendancePercentage - b.attendancePercentage;
      }
      return a.studentId.localeCompare(b.studentId);
    });

    // Handle pagination (LIMIT and OFFSET)
    const limitMatch = normalizedSql.match(/LIMIT\s+\$(\d+)/i);
    const offsetMatch = normalizedSql.match(/OFFSET\s+\$(\d+)/i);
    let limit = 100;
    let offset = 0;
    if (limitMatch) {
      const limitIndex = parseInt(limitMatch[1], 10) - 1;
      limit = params[limitIndex];
    }
    if (offsetMatch) {
      const offsetIndex = parseInt(offsetMatch[1], 10) - 1;
      offset = params[offsetIndex];
    }

    return { rows: results.slice(offset, offset + limit) };
  }

  console.warn('[MockDB] Unhandled SQL:', sql, 'params:', params);
  return { rows: [] };
};

module.exports = {
  query,
  tables
};
