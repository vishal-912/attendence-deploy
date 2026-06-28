'use strict';

const express = require('express');
const attendanceRouter = require('./modules/attendance/attendance.routes');

const app = express();

// Enable JSON parsing
app.use(express.json());

// Register only the attendance routes
app.use('/attendance', attendanceRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null,
  });
});

module.exports = app;
