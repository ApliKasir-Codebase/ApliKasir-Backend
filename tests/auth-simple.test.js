// tests/auth-simple.test.js
const request = require('supertest');
const express = require('express');

// Mock semua dependencies sebelum import controller
jest.mock('../config/db.config', () => ({
    query: jest.fn()
}));

jest.mock('../utils/passwordUtils', () => ({
    hashPassword: jest.fn(),
    verifyPassword: jest.fn()
}));

jest.mock('../utils/firebaseStorage.helper', () => ({
    uploadImageToFirebase: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn()
}));

const authController = require('../controllers/auth.controller');
const mockDb = require('../config/db.config');
const passwordUtils = require('../utils/passwordUtils');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);

describe('Auth Controller Coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        passwordUtils.hashPassword.mockResolvedValue('hashedPassword');
        passwordUtils.verifyPassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('mock-jwt-token');
    });

    describe('register', () => {
        test('should handle successful registration', async () => {
            mockDb.query
                .mockResolvedValueOnce([{ insertId: 1 }])
                .mockResolvedValueOnce([[{
                    id: 1,
                    name: 'Test User',
                    email: 'test@example.com',
                    phoneNumber: '+6281234567890',
                    storeName: 'Test Store',
                    storeAddress: 'Test Address',
                    profileImagePath: null,
                    created_at: new Date(),
                    updated_at: new Date()
                }]]);

            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                phoneNumber: '+6281234567890',
                storeName: 'Test Store',
                storeAddress: 'Test Address',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(response.status).toBe(201);
            expect(mockDb.query).toHaveBeenCalledTimes(2);
        });

        test('should handle duplicate email error', async () => {
            const error = new Error('Duplicate entry');
            error.code = 'ER_DUP_ENTRY';
            error.sqlMessage = 'email';
            mockDb.query.mockRejectedValue(error);

            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                phoneNumber: '+6281234567890',
                storeName: 'Test Store',
                storeAddress: 'Test Address',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(response.status).toBe(409);
        });

        test('should handle duplicate phone error', async () => {
            const error = new Error('Duplicate entry');
            error.code = 'ER_DUP_ENTRY';
            error.sqlMessage = 'phoneNumber';
            mockDb.query.mockRejectedValue(error);

            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                phoneNumber: '+6281234567890',
                storeName: 'Test Store',
                storeAddress: 'Test Address',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(response.status).toBe(409);
        });

        test('should handle general database error', async () => {
            const error = new Error('Database connection failed');
            mockDb.query.mockRejectedValue(error);

            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                phoneNumber: '+6281234567890',
                storeName: 'Test Store',
                storeAddress: 'Test Address',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(response.status).toBe(500);
        });
    });

    describe('login', () => {
        test('should handle successful login with email', async () => {
            mockDb.query.mockResolvedValue([[{
                id: 1,
                name: 'Test User',
                email: 'test@example.com',
                phoneNumber: '+6281234567890',
                storeName: 'Test Store',
                storeAddress: 'Test Address',
                passwordHash: 'hashedPassword',
                profileImagePath: null
            }]]);

            const loginData = {
                identifier: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(response.status).toBe(200);
            expect(response.body.accessToken).toBe('mock-jwt-token');
        });

        test('should handle successful login with phone', async () => {
            mockDb.query.mockResolvedValue([[{
                id: 1,
                name: 'Test User',
                email: 'test@example.com',
                phoneNumber: '+6281234567890',
                storeName: 'Test Store',
                storeAddress: 'Test Address',
                passwordHash: 'hashedPassword',
                profileImagePath: null
            }]]);

            const loginData = {
                identifier: '+6281234567890',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(response.status).toBe(200);
        });

        test('should handle user not found', async () => {
            mockDb.query.mockResolvedValue([[]]);

            const loginData = {
                identifier: 'notfound@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(response.status).toBe(404);
        });

        test('should handle invalid password', async () => {
            mockDb.query.mockResolvedValue([[{
                id: 1,
                passwordHash: 'hashedPassword'
            }]]);
            passwordUtils.verifyPassword.mockResolvedValue(false);

            const loginData = {
                identifier: 'test@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(response.status).toBe(401);
        });

        test('should handle database error', async () => {
            mockDb.query.mockRejectedValue(new Error('Database error'));

            const loginData = {
                identifier: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(response.status).toBe(500);
        });
    });
});
