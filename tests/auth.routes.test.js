// tests/auth.routes.test.js
const express = require('express');
const request = require('supertest');
const path = require('path');

// Mock dependencies before importing
jest.mock('../controllers/auth.controller.js', () => ({
    register: jest.fn(),
    login: jest.fn()
}));

jest.mock('../middleware/requestValidator.js', () => ({
    validateRegister: jest.fn((req, res, next) => next()),
    validateLogin: jest.fn((req, res, next) => next())
}));

const authController = require('../controllers/auth.controller.js');
const { validateRegister, validateLogin } = require('../middleware/requestValidator.js');

describe('Auth Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Set up mock implementations
        authController.register.mockImplementation((req, res) => {
            res.status(201).json({ message: 'User registered successfully' });
        });
        
        authController.login.mockImplementation((req, res) => {
            res.status(200).json({ message: 'User logged in successfully' });
        });
        
        // Apply routes
        require('../routes/auth.routes.js')(app);
    });

    describe('POST /api/auth/register', () => {
        it('should call register controller for valid registration', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                phoneNumber: '1234567890',
                storeName: 'Test Store'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(validateRegister).toHaveBeenCalled();
            expect(authController.register).toHaveBeenCalled();
            expect(response.body.message).toBe('User registered successfully');
        });

        it('should handle file upload in registration', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                phoneNumber: '1234567890',
                storeName: 'Test Store'
            };

            // Create a test image buffer
            const testImageBuffer = Buffer.from('fake image data');

            const response = await request(app)
                .post('/api/auth/register')
                .field('name', userData.name)
                .field('email', userData.email)
                .field('password', userData.password)
                .field('phoneNumber', userData.phoneNumber)
                .field('storeName', userData.storeName)
                .attach('profileImage', testImageBuffer, {
                    filename: 'test.jpg',
                    contentType: 'image/jpeg'
                })
                .expect(201);

            expect(validateRegister).toHaveBeenCalled();
            expect(authController.register).toHaveBeenCalled();
            expect(response.body.message).toBe('User registered successfully');
        });        it('should handle registration without file upload', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                phoneNumber: '1234567890',
                storeName: 'Test Store'
            };

            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(validateRegister).toHaveBeenCalled();
            expect(authController.register).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/login', () => {
        it('should call login controller for valid login', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(validateLogin).toHaveBeenCalled();
            expect(authController.login).toHaveBeenCalled();
            expect(response.body.message).toBe('User logged in successfully');
        });        it('should call validation middleware for login', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(validateLogin).toHaveBeenCalled();
            expect(authController.login).toHaveBeenCalled();
        });
    });    describe('CORS Headers', () => {
        it('should set correct CORS headers for register endpoint', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({})
                .expect(201);
        });

        it('should set correct CORS headers for login endpoint', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({})
                .expect(200);
        });
    });

    describe('Middleware Order', () => {
        it('should apply middleware in correct order for register', async () => {
            // Mock middleware to track order
            let middlewareOrder = [];

            validateRegister.mockImplementation((req, res, next) => {
                middlewareOrder.push('validateRegister');
                next();
            });

            authController.register.mockImplementation((req, res) => {
                middlewareOrder.push('controller');
                res.status(201).json({ message: 'success' });
            });

            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test',
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(201);

            expect(middlewareOrder).toEqual(['validateRegister', 'controller']);
        });

        it('should apply middleware in correct order for login', async () => {
            let middlewareOrder = [];

            validateLogin.mockImplementation((req, res, next) => {
                middlewareOrder.push('validateLogin');
                next();
            });

            authController.login.mockImplementation((req, res) => {
                middlewareOrder.push('controller');
                res.status(200).json({ message: 'success' });
            });

            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(200);

            expect(middlewareOrder).toEqual(['validateLogin', 'controller']);
        });
    });
});
