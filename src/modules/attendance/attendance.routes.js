'use strict';

const { Router } = require('express');
const attendanceController = require('./attendance.controller');
const { authenticate } = require('../../shared/middleware');

const router = Router();

router.post('/mark', authenticate, attendanceController.markAttendance);

router.put('/:attendanceId', authenticate, attendanceController.updateAttendance);

router.get('/summary', authenticate, attendanceController.getAttendanceSummary);

router.get('/student/:studentId', authenticate, attendanceController.getStudentAttendance);

router.get('/course/:courseId', authenticate, attendanceController.getCourseAttendance);

router.get('/batch/:batchId', authenticate, attendanceController.getBatchAttendance);

router.get('/percentage', authenticate, attendanceController.getAttendancePercentage);
router.get('/threshold', authenticate, attendanceController.getStudentsBelowThreshold);

const dbConfig = require('../../config/database');
router.post('/reset-db', (req, res) => {
  if (dbConfig.tables) {
    dbConfig.tables.attendance = [];
    dbConfig.tables.attendance_audit = [];
    dbConfig.tables.outbox = [];
  }
  res.status(200).json({ success: true, message: 'Database reset successfully' });
});

module.exports = router;