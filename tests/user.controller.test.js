// tests/user.controller.test.js
const userController = require('../controllers/user.controller');
const passwordUtils = require('../utils/passwordUtils');

// Mock dependencies
jest.mock('../config/db.config.js', () => ({
    query: jest.fn()
}));

jest.mock('../utils/passwordUtils', () => ({
    hashPassword: jest.fn()
}));

const db = require('../config/db.config.js');

describe('User Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            userId: 1,
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Default mock implementations
        db.query.mockImplementation(() => Promise.resolve([[]]));
        passwordUtils.hashPassword.mockImplementation(() => Promise.resolve('hashedPassword'));
    });

    describe('getUserProfile', () => {
        it('should return user profile successfully', async () => {
            const mockUser = {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '1234567890',
                storeName: 'Test Store',
                storeAddress: 'Test Address',
                profileImagePath: '/images/profile.jpg',
                created_at: new Date(),
                updated_at: new Date(),
                last_sync_time: new Date()
            };

            db.query.mockResolvedValueOnce([[mockUser]]);

            await userController.getUserProfile(req, res);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id, name, email'),
                [1]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(mockUser);
        });

        it('should return 404 if user not found', async () => {
            db.query.mockResolvedValueOnce([[]]);

            await userController.getUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({ 
                message: 'User profile not found.' 
            });
        });

        it('should handle database errors', async () => {
            const error = new Error('Database connection failed');
            db.query.mockRejectedValueOnce(error);

            // Mock console.error to avoid output during test
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await userController.getUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ 
                message: 'Database connection failed' 
            });

            consoleSpy.mockRestore();
        });
    });

    describe('updateUserProfile', () => {
        it('should update user profile successfully', async () => {
            req.body = {
                name: 'Updated Name',
                email: 'updated@example.com',
                storeName: 'Updated Store'
            };

            const mockResult = { affectedRows: 1 };
            const mockUpdatedUser = {
                id: 1,
                name: 'Updated Name',
                email: 'updated@example.com',
                storeName: 'Updated Store'
            };

            db.query
                .mockResolvedValueOnce([mockResult]) // UPDATE query
                .mockResolvedValueOnce([[mockUpdatedUser]]); // SELECT query

            await userController.updateUserProfile(req, res);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET'),
                expect.arrayContaining(['Updated Name', 'updated@example.com', 'Updated Store', 1])
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Profile updated successfully.',
                user: mockUpdatedUser
            });
        });

        it('should update user profile with new password', async () => {
            req.body = {
                name: 'Updated Name',
                newPassword: 'newPassword123'
            };

            passwordUtils.hashPassword.mockResolvedValueOnce('hashedNewPassword');
            
            const mockResult = { affectedRows: 1 };
            const mockUpdatedUser = { id: 1, name: 'Updated Name' };

            db.query
                .mockResolvedValueOnce([mockResult])
                .mockResolvedValueOnce([[mockUpdatedUser]]);

            await userController.updateUserProfile(req, res);

            expect(passwordUtils.hashPassword).toHaveBeenCalledWith('newPassword123');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET'),
                expect.arrayContaining(['Updated Name', 'hashedNewPassword', 1])
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 if no fields provided for update', async () => {
            req.body = {}; // No fields to update

            await userController.updateUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                message: 'No fields provided for update.'
            });
        });

        it('should handle no rows affected - user not found', async () => {
            req.body = { name: 'Updated Name' };

            const mockResult = { affectedRows: 0 };
            db.query
                .mockResolvedValueOnce([mockResult]) // UPDATE query
                .mockResolvedValueOnce([[]]); // Check if user exists

            await userController.updateUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                message: 'User not found.'
            });
        });

        it('should handle no rows affected - no changes detected', async () => {
            req.body = { name: 'Same Name' };

            const mockResult = { affectedRows: 0 };
            const mockUser = { id: 1 };
            
            db.query
                .mockResolvedValueOnce([mockResult]) // UPDATE query
                .mockResolvedValueOnce([[mockUser]]); // Check if user exists

            await userController.updateUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                message: 'No changes detected or user not found.'
            });
        });

        it('should handle duplicate email error', async () => {
            req.body = { email: 'duplicate@example.com' };

            const error = new Error('Duplicate entry');
            error.code = 'ER_DUP_ENTRY';
            error.sqlMessage = 'email already exists';

            db.query.mockRejectedValueOnce(error);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await userController.updateUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Update failed! Email is already in use by another account.'
            });

            consoleSpy.mockRestore();
        });

        it('should handle duplicate phone number error', async () => {
            req.body = { phoneNumber: '1234567890' };

            const error = new Error('Duplicate entry');
            error.code = 'ER_DUP_ENTRY';
            error.sqlMessage = 'phoneNumber already exists';

            db.query.mockRejectedValueOnce(error);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await userController.updateUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Update failed! Phone number is already in use by another account.'
            });

            consoleSpy.mockRestore();
        });

        it('should handle generic duplicate entry error', async () => {
            req.body = { name: 'Test Name' };

            const error = new Error('Duplicate entry');
            error.code = 'ER_DUP_ENTRY';
            error.sqlMessage = 'some other field duplicate';

            db.query.mockRejectedValueOnce(error);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await userController.updateUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Update failed! Duplicate entry detected.'
            });

            consoleSpy.mockRestore();
        });

        it('should handle generic database error', async () => {
            req.body = { name: 'Test Name' };

            const error = new Error('Database connection failed');
            db.query.mockRejectedValueOnce(error);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await userController.updateUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Database connection failed'
            });

            consoleSpy.mockRestore();
        });

        it('should handle successful update but failed to fetch details', async () => {
            req.body = { name: 'Updated Name' };

            const mockResult = { affectedRows: 1 };
            
            db.query
                .mockResolvedValueOnce([mockResult]) // UPDATE query
                .mockResolvedValueOnce([[]]); // SELECT query returns empty

            await userController.updateUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Profile updated successfully, but failed to fetch updated details.'
            });
        });

        it('should update all fields including profile image path', async () => {
            req.body = {
                name: 'Full Update',
                email: 'fullupdate@example.com',
                phoneNumber: '9876543210',
                storeName: 'New Store',
                storeAddress: 'New Address',
                profileImagePath: '/images/newprofile.jpg'
            };

            const mockResult = { affectedRows: 1 };
            const mockUpdatedUser = { id: 1, ...req.body };

            db.query
                .mockResolvedValueOnce([mockResult])
                .mockResolvedValueOnce([[mockUpdatedUser]]);

            await userController.updateUserProfile(req, res);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET'),
                expect.arrayContaining([
                    'Full Update',
                    'fullupdate@example.com',
                    '9876543210',
                    'New Store',
                    'New Address',
                    '/images/newprofile.jpg',
                    1
                ])
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
