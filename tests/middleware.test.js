// tests/middleware.test.js
const { verifyToken } = require('../middleware/authJwt');
const jwt = require('jsonwebtoken');

// Mock JWT
jest.mock('jsonwebtoken');
// Mock config
jest.mock('../config/auth.config.js', () => ({
    secret: 'test-secret'
}));

describe('Auth JWT Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {},
            userId: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('verifyToken', () => {
        test('should verify valid token successfully with Bearer format', () => {
            const mockPayload = { id: 123 };
            req.headers.authorization = 'Bearer valid-token';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockPayload);
            });

            verifyToken(req, res, next);

            expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret', expect.any(Function));
            expect(req.userId).toBe(123);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should verify valid token with x-access-token header', () => {
            const mockPayload = { id: 456 };
            req.headers['x-access-token'] = 'valid-token';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockPayload);
            });

            verifyToken(req, res, next);

            expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret', expect.any(Function));
            expect(req.userId).toBe(456);
            expect(next).toHaveBeenCalled();
        });

        test('should reject request without any token header', () => {
            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({ message: 'No token provided!' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should handle JWT verification error', () => {
            req.headers.authorization = 'Bearer invalid-token';
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('Token verification failed'), null);
            });

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized! Invalid Token.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should handle expired token error', () => {
            req.headers.authorization = 'Bearer expired-token';
            const expiredError = new Error('Token expired');
            expiredError.name = 'TokenExpiredError';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(expiredError, null);
            });

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized! Token was expired.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should handle token without Bearer prefix', () => {
            const mockPayload = { id: 789 };
            req.headers.authorization = 'plain-token';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockPayload);
            });

            verifyToken(req, res, next);

            expect(jwt.verify).toHaveBeenCalledWith('plain-token', 'test-secret', expect.any(Function));
            expect(req.userId).toBe(789);
            expect(next).toHaveBeenCalled();
        });

        test('should prefer authorization header over x-access-token', () => {
            const mockPayload = { id: 111 };
            req.headers.authorization = 'Bearer auth-token';
            req.headers['x-access-token'] = 'x-token';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockPayload);
            });

            verifyToken(req, res, next);

            expect(jwt.verify).toHaveBeenCalledWith('auth-token', 'test-secret', expect.any(Function));
            expect(req.userId).toBe(111);
            expect(next).toHaveBeenCalled();
        });

        test('should handle malformed JWT error', () => {
            req.headers.authorization = 'Bearer malformed-token';
            const malformedError = new Error('Malformed token');
            malformedError.name = 'JsonWebTokenError';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(malformedError, null);
            });

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized! Invalid Token.' });
            expect(next).not.toHaveBeenCalled();
        });
    });
});
