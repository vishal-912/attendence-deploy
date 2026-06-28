'use strict';

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('==================================================');
  console.log('Attendance API Local Test Server is running!');
  console.log(`Port: ${PORT}`);
  console.log(`Endpoints base URL: http://localhost:${PORT}/attendance`);
  console.log('==================================================');
});