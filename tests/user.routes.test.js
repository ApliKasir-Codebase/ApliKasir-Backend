// tests/user.routes.test.js
const express = require('express');
const request = require('supertest');

// Mock dependencies before importing
jest.mock('../controllers/user.controller.js', () => ({
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn()
}));

jest.mock('../middleware/authJwt.js', () => ({
    verifyToken: jest.fn((req, res, next) => {
        req.userId = 1; // Mock authenticated user
        next();
    })
}));

jest.mock('../middleware/requestValidator.js', () => ({
    validateUpdateUserProfile: jest.fn((req, res, next) => next())
}));

const userController = require('../controllers/user.controller.js');
const { verifyToken } = require('../middleware/authJwt.js');
const { validateUpdateUserProfile } = require('../middleware/requestValidator.js');

describe('User Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Set up mock implementations
        userController.getUserProfile.mockImplementation((req, res) => {
            res.status(200).json({ id: req.userId, name: 'Test User' });
        });
        
        userController.updateUserProfile.mockImplementation((req, res) => {
            res.status(200).json({ message: 'Profile updated successfully' });
        });
        
        // Apply routes
        require('../routes/user.routes.js')(app);
    });

    describe('GET /api/user/profile', () => {
        it('should get user profile successfully', async () => {
            const response = await request(app)
                .get('/api/user/profile')
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(userController.getUserProfile).toHaveBeenCalled();
            expect(response.body).toEqual({ id: 1, name: 'Test User' });
        });

        it('should require authentication', async () => {
            // Mock authentication failure
            verifyToken.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ message: 'Unauthorized' });
            });

            await request(app)
                .get('/api/user/profile')
                .expect(401);

            expect(verifyToken).toHaveBeenCalled();
            expect(userController.getUserProfile).not.toHaveBeenCalled();
        });
    });

    describe('PUT /api/user/profile', () => {
        it('should update user profile successfully', async () => {
            const updateData = {
                name: 'Updated Name',
                email: 'updated@example.com'
            };

            const response = await request(app)
                .put('/api/user/profile')
                .send(updateData)
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(validateUpdateUserProfile).toHaveBeenCalled();
            expect(userController.updateUserProfile).toHaveBeenCalled();
            expect(response.body.message).toBe('Profile updated successfully');
        });

        it('should require authentication for update', async () => {
            verifyToken.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ message: 'Unauthorized' });
            });

            await request(app)
                .put('/api/user/profile')
                .send({ name: 'New Name' })
                .expect(401);

            expect(verifyToken).toHaveBeenCalled();
            expect(userController.updateUserProfile).not.toHaveBeenCalled();
        });

        it('should validate update data', async () => {
            validateUpdateUserProfile.mockImplementationOnce((req, res, next) => {
                res.status(400).json({ message: 'Validation failed' });
            });

            await request(app)
                .put('/api/user/profile')
                .send({ invalidField: 'invalid' })
                .expect(400);

            expect(verifyToken).toHaveBeenCalled();
            expect(validateUpdateUserProfile).toHaveBeenCalled();
            expect(userController.updateUserProfile).not.toHaveBeenCalled();
        });
    });

    describe('CORS Headers', () => {
        it('should set correct CORS headers', async () => {
            await request(app)
                .get('/api/user/profile')
                .expect(200);
        });
    });

    describe('Middleware Order', () => {
        it('should apply middleware in correct order for GET profile', async () => {
            let middlewareOrder = [];

            verifyToken.mockImplementation((req, res, next) => {
                middlewareOrder.push('verifyToken');
                req.userId = 1;
                next();
            });

            userController.getUserProfile.mockImplementation((req, res) => {
                middlewareOrder.push('controller');
                res.status(200).json({ success: true });
            });

            await request(app)
                .get('/api/user/profile')
                .expect(200);

            expect(middlewareOrder).toEqual(['verifyToken', 'controller']);
        });

        it('should apply middleware in correct order for PUT profile', async () => {
            let middlewareOrder = [];

            verifyToken.mockImplementation((req, res, next) => {
                middlewareOrder.push('verifyToken');
                req.userId = 1;
                next();
            });

            validateUpdateUserProfile.mockImplementation((req, res, next) => {
                middlewareOrder.push('validateUpdateUserProfile');
                next();
            });

            userController.updateUserProfile.mockImplementation((req, res) => {
                middlewareOrder.push('controller');
                res.status(200).json({ success: true });
            });

            await request(app)
                .put('/api/user/profile')
                .send({ name: 'Test' })
                .expect(200);

            expect(middlewareOrder).toEqual(['verifyToken', 'validateUpdateUserProfile', 'controller']);
        });
    });
});
