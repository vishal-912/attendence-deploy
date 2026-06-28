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

module.exports = router;
