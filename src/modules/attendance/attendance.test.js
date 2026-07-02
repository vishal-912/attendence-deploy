'use strict';

const attendanceService = require('./attendance.service');
const attendanceController = require('./attendance.controller');
const repository = require('./attendance.repository');
const attendanceEvents = require('./attendance.events');
const { AttendanceStatus } = require('./attendance.types');

jest.mock('./attendance.repository');
jest.mock('./attendance.events');

afterEach(() => {
    jest.restoreAllMocks();
});

describe('Attendance Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('markAttendance', () => {
        it('should mark attendance successfully', async () => {
            const data = {
                studentId: 'STU001',
                courseId: 'CSE101',
                scheduleId: 'SCH001',
                batchId: 'BATCH_A',
                universityId: 'UNIV001',
                status: AttendanceStatus.PRESENT,
                date: '2026-07-02',
                markedBy: 'FAC001'
            };
            repository.findScheduledClassById.mockResolvedValue({ id: 'SCH001', batch_id: 'BATCH_A' });
            repository.isStudentEnrolled.mockResolvedValue(true);
            repository.findAttendanceByStudentAndClass.mockResolvedValue(null);
            repository.createAttendance.mockResolvedValue({ id: 'ATT001', ...data });
            attendanceEvents.emitAttendanceMarked.mockResolvedValue({ id: 'OUT001' });

            const result = await attendanceService.markAttendance(data);

            expect(repository.findScheduledClassById).toHaveBeenCalledWith('SCH001');
            expect(repository.isStudentEnrolled).toHaveBeenCalledWith('STU001', 'SCH001');
            expect(repository.findAttendanceByStudentAndClass).toHaveBeenCalledWith('STU001', 'SCH001');
            expect(repository.createAttendance).toHaveBeenCalledWith({
                studentId: 'STU001',
                courseId: 'CSE101',
                scheduleId: 'SCH001',
                batchId: 'BATCH_A',
                universityId: 'UNIV001',
                status: AttendanceStatus.PRESENT,
                date: '2026-07-02',
                markedBy: 'FAC001'
            });
            expect(attendanceEvents.emitAttendanceMarked).toHaveBeenCalledWith({ id: 'ATT001', ...data });
            expect(result).toEqual({ id: 'ATT001', ...data });
        });

        it('should throw an error if data is missing', async () => {
            await expect(attendanceService.markAttendance(null)).rejects.toThrow('Attendance data is required.');
        });

        it('should throw an error if studentId is missing', async () => {
            await expect(attendanceService.markAttendance({
                scheduleId: 'SCH001',
                status: AttendanceStatus.PRESENT,
                universityId: 'UNIV001'
            })).rejects.toThrow('Student ID is required to mark attendance.');
        });

        it('should throw an error if scheduleId is missing', async () => {
            await expect(attendanceService.markAttendance({
                studentId: 'STU001',
                status: AttendanceStatus.PRESENT,
                universityId: 'UNIV001'
            })).rejects.toThrow('Scheduled class ID is required to mark attendance.');
        });

        it('should throw an error if status is missing', async () => {
            await expect(attendanceService.markAttendance({
                studentId: 'STU001',
                scheduleId: 'SCH001',
                universityId: 'UNIV001'
            })).rejects.toThrow('Attendance status is required.');
        });

        it('should throw an error if universityId is missing', async () => {
            await expect(attendanceService.markAttendance({
                studentId: 'STU001',
                scheduleId: 'SCH001',
                status: AttendanceStatus.PRESENT
            })).rejects.toThrow('University ID is required to mark attendance.');
        });

        it('should throw an error if scheduled class does not exist', async () => {
            const data = {
                studentId: 'STU001',
                scheduleId: 'SCH001',
                status: AttendanceStatus.PRESENT,
                universityId: 'UNIV001'
            };
            repository.findScheduledClassById.mockResolvedValue(null);

            await expect(attendanceService.markAttendance(data)).rejects.toThrow(
                'Scheduled class with ID SCH001 does not exist.'
            );
        });

        it('should throw an error if student is not enrolled', async () => {
            const data = {
                studentId: 'STU001',
                scheduleId: 'SCH001',
                status: AttendanceStatus.PRESENT,
                universityId: 'UNIV001'
            };
            repository.findScheduledClassById.mockResolvedValue({ id: 'SCH001' });
            repository.isStudentEnrolled.mockResolvedValue(false);

            await expect(attendanceService.markAttendance(data)).rejects.toThrow(
                'Student STU001 is not enrolled in scheduled class SCH001.'
            );
        });

        it('should throw an error if attendance record already exists', async () => {
            const data = {
                studentId: 'STU001',
                scheduleId: 'SCH001',
                status: AttendanceStatus.PRESENT,
                universityId: 'UNIV001'
            };
            repository.findScheduledClassById.mockResolvedValue({ id: 'SCH001' });
            repository.isStudentEnrolled.mockResolvedValue(true);
            repository.findAttendanceByStudentAndClass.mockResolvedValue({ id: 'ATT001' });

            await expect(attendanceService.markAttendance(data)).rejects.toThrow(
                'Attendance record already exists for student STU001 in scheduled class SCH001.'
            );
        });
    });

    describe('updateAttendance', () => {
        it('should update attendance successfully by faculty', async () => {
            const attendanceId = 'ATT001';
            const updateData = {
                status: AttendanceStatus.ABSENT,
                reason: 'Correction of previous status',
                editor: { id: 'FAC001', role: 'faculty' }
            };
            const existingAttendance = {
                id: attendanceId,
                status: AttendanceStatus.PRESENT
            };
            const updatedRecord = {
                id: attendanceId,
                status: AttendanceStatus.ABSENT,
                previous_status: AttendanceStatus.PRESENT,
                reason: 'Correction of previous status',
                editor_id: 'FAC001'
            };

            repository.findAttendanceById.mockResolvedValue(existingAttendance);
            repository.updateAttendance.mockResolvedValue(updatedRecord);
            repository.createAuditRecord.mockResolvedValue({ id: 'AUD001' });
            attendanceEvents.emitAttendanceUpdated.mockResolvedValue({ id: 'OUT002' });

            const result = await attendanceService.updateAttendance(attendanceId, updateData);

            expect(repository.findAttendanceById).toHaveBeenCalledWith(attendanceId);
            expect(repository.updateAttendance).toHaveBeenCalledWith(attendanceId, expect.objectContaining({
                status: AttendanceStatus.ABSENT,
                previousStatus: AttendanceStatus.PRESENT,
                reason: 'Correction of previous status',
                editorId: 'FAC001'
            }));
            expect(repository.createAuditRecord).toHaveBeenCalledWith(expect.objectContaining({
                attendanceId,
                previousStatus: AttendanceStatus.PRESENT,
                newStatus: AttendanceStatus.ABSENT,
                editorId: 'FAC001',
                reason: 'Correction of previous status'
            }));
            expect(attendanceEvents.emitAttendanceUpdated).toHaveBeenCalled();
            expect(result).toEqual(updatedRecord);
        });

        it('should update attendance successfully by admin', async () => {
            const attendanceId = 'ATT001';
            const updateData = {
                status: AttendanceStatus.LATE,
                reason: 'Late approval',
                editor: { id: 'ADM001', role: 'ADMIN' }
            };
            const existingAttendance = {
                id: attendanceId,
                status: AttendanceStatus.PRESENT
            };

            repository.findAttendanceById.mockResolvedValue(existingAttendance);
            repository.updateAttendance.mockResolvedValue({ id: attendanceId });

            await attendanceService.updateAttendance(attendanceId, updateData);

            expect(repository.updateAttendance).toHaveBeenCalled();
        });

        it('should throw an error if attendanceId is missing', async () => {
            await expect(attendanceService.updateAttendance(null, {})).rejects.toThrow(
                'Attendance ID is required for update.'
            );
        });

        it('should throw an error if updateData is missing', async () => {
            await expect(attendanceService.updateAttendance('ATT001', null)).rejects.toThrow(
                'Update data is required.'
            );
        });

        it('should throw an error if status is missing', async () => {
            await expect(attendanceService.updateAttendance('ATT001', {
                reason: 'Forgot to mark'
            })).rejects.toThrow('New attendance status is required.');
        });

        it('should throw an error if reason is missing or empty', async () => {
            await expect(attendanceService.updateAttendance('ATT001', {
                status: AttendanceStatus.PRESENT,
                reason: '   '
            })).rejects.toThrow('A valid correction reason is required.');
        });

        it('should throw an error if attendance record does not exist', async () => {
            repository.findAttendanceById.mockResolvedValue(null);

            await expect(attendanceService.updateAttendance('ATT001', {
                status: AttendanceStatus.PRESENT,
                reason: 'Correction',
                editor: { id: 'FAC001', role: 'faculty' }
            })).rejects.toThrow('Attendance record with ID ATT001 not found.');
        });

        it('should throw an error if status is invalid', async () => {
            repository.findAttendanceById.mockResolvedValue({ id: 'ATT001', status: AttendanceStatus.PRESENT });

            await expect(attendanceService.updateAttendance('ATT001', {
                status: 'INVALID_STATUS',
                reason: 'Correction',
                editor: { id: 'FAC001', role: 'faculty' }
            })).rejects.toThrow('Invalid status: INVALID_STATUS. Must be one of:');
        });

        it('should throw an error if editor is missing', async () => {
            repository.findAttendanceById.mockResolvedValue({ id: 'ATT001', status: AttendanceStatus.PRESENT });

            await expect(attendanceService.updateAttendance('ATT001', {
                status: AttendanceStatus.ABSENT,
                reason: 'Correction'
            })).rejects.toThrow('Editor information is required for authorization.');
        });

        it('should throw an error if user role is unauthorized (student)', async () => {
            repository.findAttendanceById.mockResolvedValue({ id: 'ATT001', status: AttendanceStatus.PRESENT });

            await expect(attendanceService.updateAttendance('ATT001', {
                status: AttendanceStatus.ABSENT,
                reason: 'Correction',
                editor: { id: 'STU001', role: 'student' }
            })).rejects.toThrow('Unauthorized: Only faculty or admin users can update attendance.');
        });
    });

    describe('getAttendancePercentage', () => {
        it('should calculate percentage by student', async () => {
            repository.getAttendancePercentage.mockResolvedValue(85.5);
            const result = await attendanceService.getAttendancePercentage({ studentId: 'STU001' });
            expect(repository.getAttendancePercentage).toHaveBeenCalledWith({
                studentId: 'STU001',
                courseId: undefined,
                batchId: undefined,
                universityId: undefined,
                startDate: undefined,
                endDate: undefined
            });
            expect(result).toBe(85.5);
        });

        it('should calculate percentage by course', async () => {
            repository.getAttendancePercentage.mockResolvedValue(90.0);
            const result = await attendanceService.getAttendancePercentage({ courseId: 'CSE101' });
            expect(result).toBe(90.0);
        });

        it('should calculate percentage by batch', async () => {
            repository.getAttendancePercentage.mockResolvedValue(75.0);
            const result = await attendanceService.getAttendancePercentage({ batchId: 'BATCH_A' });
            expect(result).toBe(75.0);
        });

        it('should calculate percentage with date range', async () => {
            repository.getAttendancePercentage.mockResolvedValue(80.0);
            const result = await attendanceService.getAttendancePercentage({
                studentId: 'STU001',
                startDate: '2026-06-01',
                endDate: '2026-06-30'
            });
            expect(result).toBe(80.0);
        });

        it('should throw an error if no filter is provided', async () => {
            await expect(attendanceService.getAttendancePercentage({})).rejects.toThrow(
                'At least one query parameter (studentId, courseId, batchId, or universityId) is required.'
            );
        });
    });

    describe('getAttendanceSummary', () => {
        it('should retrieve attendance summary metrics', async () => {
            const mockSummary = {
                totalRecords: 100,
                presentCount: 80,
                absentCount: 15,
                lateCount: 5,
                attendancePercentage: 80.0
            };
            repository.getAttendanceSummary.mockResolvedValue(mockSummary);
            const result = await attendanceService.getAttendanceSummary({ courseId: 'CSE101' });
            expect(repository.getAttendanceSummary).toHaveBeenCalledWith({ courseId: 'CSE101' });
            expect(result).toEqual(mockSummary);
        });
    });

    describe('getStudentAttendance', () => {
        it('should retrieve student attendance records', async () => {
            const mockRecords = [{ id: 'ATT001', studentId: 'STU001', status: AttendanceStatus.PRESENT }];
            repository.getStudentAttendance.mockResolvedValue(mockRecords);
            const result = await attendanceService.getStudentAttendance({ studentId: 'STU001' });
            expect(repository.getStudentAttendance).toHaveBeenCalledWith({ studentId: 'STU001' });
            expect(result).toEqual(mockRecords);
        });

        it('should throw an error if studentId is missing', async () => {
            await expect(attendanceService.getStudentAttendance({})).rejects.toThrow('Student ID is required.');
        });
    });

    describe('getCourseAttendance', () => {
        it('should retrieve course attendance records', async () => {
            const mockRecords = [{ id: 'ATT001', courseId: 'CSE101', status: AttendanceStatus.PRESENT }];
            repository.getCourseAttendance.mockResolvedValue(mockRecords);
            const result = await attendanceService.getCourseAttendance({ courseId: 'CSE101' });
            expect(repository.getCourseAttendance).toHaveBeenCalledWith({ courseId: 'CSE101' });
            expect(result).toEqual(mockRecords);
        });

        it('should throw an error if courseId is missing', async () => {
            await expect(attendanceService.getCourseAttendance({})).rejects.toThrow('Course ID is required.');
        });
    });

    describe('getBatchAttendance', () => {
        it('should retrieve batch attendance records', async () => {
            const mockRecords = [{ id: 'ATT001', batchId: 'BATCH_A', status: AttendanceStatus.PRESENT }];
            repository.getBatchAttendance.mockResolvedValue(mockRecords);
            const result = await attendanceService.getBatchAttendance({ batchId: 'BATCH_A' });
            expect(repository.getBatchAttendance).toHaveBeenCalledWith({ batchId: 'BATCH_A' });
            expect(result).toEqual(mockRecords);
        });

        it('should throw an error if batchId is missing', async () => {
            await expect(attendanceService.getBatchAttendance({})).rejects.toThrow('Batch ID is required.');
        });
    });
});

describe('Attendance Controller', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = { body: {}, query: {}, params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    describe('markAttendance', () => {
        it('should return 201 when marked successfully', async () => {
            req.body = {
                studentId: 'STU001',
                courseId: 'CSE101',
                scheduleId: 'SCH001',
                batchId: 'BATCH_A',
                universityId: 'UNIV001',
                status: AttendanceStatus.PRESENT,
                date: '2026-07-02',
                markedBy: 'FAC001'
            };
            const mockRecord = { id: 'ATT001', ...req.body };
            jest.spyOn(attendanceService, 'markAttendance').mockResolvedValue(mockRecord);

            await attendanceController.markAttendance(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Attendance marked successfully',
                data: mockRecord
            });
        });

        it('should return 400 if a required field is missing', async () => {
            req.body = {
                studentId: 'STU001',
                courseId: 'CSE101'
            };

            await attendanceController.markAttendance(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: expect.stringContaining('Missing required fields'),
                data: null
            });
        });

        it('should call next with error when service throws', async () => {
            req.body = {
                studentId: 'STU001',
                courseId: 'CSE101',
                scheduleId: 'SCH001',
                batchId: 'BATCH_A',
                universityId: 'UNIV001',
                status: AttendanceStatus.PRESENT,
                date: '2026-07-02',
                markedBy: 'FAC001'
            };
            const mockError = new Error('Service error');
            jest.spyOn(attendanceService, 'markAttendance').mockRejectedValue(mockError);

            await attendanceController.markAttendance(req, res, next);

            expect(next).toHaveBeenCalledWith(mockError);
        });
    });

    describe('updateAttendance', () => {
        it('should return 200 when updated successfully', async () => {
            req.params = { attendanceId: 'ATT001' };
            req.body = {
                status: AttendanceStatus.ABSENT,
                reason: 'Correcting error'
            };
            req.user = { id: 'FAC001', role: 'faculty' };
            const mockUpdated = { id: 'ATT001', status: AttendanceStatus.ABSENT };
            jest.spyOn(attendanceService, 'updateAttendance').mockResolvedValue(mockUpdated);

            await attendanceController.updateAttendance(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Attendance updated successfully',
                data: mockUpdated
            });
        });

        it('should return 400 if a required field is missing', async () => {
            req.params = { attendanceId: 'ATT001' };
            req.body = { status: AttendanceStatus.ABSENT };

            await attendanceController.updateAttendance(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: expect.stringContaining('Missing required fields'),
                data: null
            });
        });

        it('should call next with error when service throws', async () => {
            req.params = { attendanceId: 'ATT001' };
            req.body = {
                status: AttendanceStatus.ABSENT,
                reason: 'Correcting error'
            };
            req.user = { id: 'FAC001', role: 'faculty' };
            const mockError = new Error('Unauthorized');
            jest.spyOn(attendanceService, 'updateAttendance').mockRejectedValue(mockError);

            await attendanceController.updateAttendance(req, res, next);

            expect(next).toHaveBeenCalledWith(mockError);
        });
    });

    describe('getAttendanceSummary', () => {
        it('should return 200 and summary data', async () => {
            req.query = { courseId: 'CSE101' };
            const mockSummary = { totalRecords: 10 };
            jest.spyOn(attendanceService, 'getAttendanceSummary').mockResolvedValue(mockSummary);

            await attendanceController.getAttendanceSummary(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Attendance summary retrieved successfully',
                data: mockSummary
            });
        });

        it('should call next with error when service throws', async () => {
            const mockError = new Error('Db error');
            jest.spyOn(attendanceService, 'getAttendanceSummary').mockRejectedValue(mockError);

            await attendanceController.getAttendanceSummary(req, res, next);

            expect(next).toHaveBeenCalledWith(mockError);
        });
    });

    describe('getStudentAttendance', () => {
        it('should return 200 and records', async () => {
            req.params = { studentId: 'STU001' };
            const mockRecords = [];
            jest.spyOn(attendanceService, 'getStudentAttendance').mockResolvedValue(mockRecords);

            await attendanceController.getStudentAttendance(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Student attendance retrieved successfully',
                data: mockRecords
            });
        });
    });

    describe('getCourseAttendance', () => {
        it('should return 200 and records', async () => {
            req.params = { courseId: 'CSE101' };
            const mockRecords = [];
            jest.spyOn(attendanceService, 'getCourseAttendance').mockResolvedValue(mockRecords);

            await attendanceController.getCourseAttendance(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Course attendance retrieved successfully',
                data: mockRecords
            });
        });
    });

    describe('getBatchAttendance', () => {
        it('should return 200 and records', async () => {
            req.params = { batchId: 'BATCH_A' };
            const mockRecords = [];
            jest.spyOn(attendanceService, 'getBatchAttendance').mockResolvedValue(mockRecords);

            await attendanceController.getBatchAttendance(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Batch attendance retrieved successfully',
                data: mockRecords
            });
        });
    });

    describe('getAttendancePercentage', () => {
        it('should return 200 and percentage value', async () => {
            req.query = { studentId: 'STU001' };
            jest.spyOn(attendanceService, 'getAttendancePercentage').mockResolvedValue(80.5);

            await attendanceController.getAttendancePercentage(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Attendance percentage retrieved successfully',
                data: 80.5
            });
        });
    });
});

describe('Attendance Repository & Threshold Detection', () => {
    let mockDb;
    let AttendanceRepository;

    beforeAll(() => {
        const actualRepoModule = jest.requireActual('./attendance.repository');
        AttendanceRepository = actualRepoModule.AttendanceRepository;
    });

    beforeEach(() => {
        mockDb = {
            query: jest.fn()
        };
    });

    it('should query students below threshold successfully', async () => {
        const repo = new AttendanceRepository(mockDb);
        const mockRows = [
            { studentId: 'STU001', totalClasses: 10, presentClasses: 5, attendancePercentage: 50.0 }
        ];
        mockDb.query.mockResolvedValue({ rows: mockRows });

        const result = await repo.getStudentsBelowThreshold(75.0, { courseId: 'CSE101' });

        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('HAVING'),
            ['CSE101', 75.0, 100, 0]
        );
        expect(result).toEqual(mockRows);
    });

    it('should support checking above threshold by returning empty if all students meet the threshold', async () => {
        const repo = new AttendanceRepository(mockDb);
        mockDb.query.mockResolvedValue({ rows: [] });

        const result = await repo.getStudentsBelowThreshold(40.0, { courseId: 'CSE101' });

        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('HAVING'),
            ['CSE101', 40.0, 100, 0]
        );
        expect(result).toEqual([]);
    });

    it('should throw an error if a non-numeric threshold is provided', async () => {
        const repo = new AttendanceRepository(mockDb);
        await expect(repo.getStudentsBelowThreshold('invalid')).rejects.toThrow(
            'A numeric threshold parameter is required for getStudentsBelowThreshold'
        );
    });

    it('should wrap database query exceptions in AttendanceRepositoryError', async () => {
        const repo = new AttendanceRepository(mockDb);
        const dbError = new Error('Database connection lost');
        dbError.code = '57P01';
        mockDb.query.mockRejectedValue(dbError);

        await expect(repo.getStudentsBelowThreshold(75.0)).rejects.toThrow(
            'Database error in AttendanceRepository.getStudentsBelowThreshold'
        );
    });
});
