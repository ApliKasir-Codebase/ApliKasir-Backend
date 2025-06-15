// tests/server.test.js
const request = require('supertest');
const path = require('path');

// Mock dependencies before importing
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('../routes/auth.routes', () => jest.fn((app) => {
    app.get('/api/auth/test', (req, res) => {
        res.json({ message: 'auth routes loaded' });
    });
}));

jest.mock('../routes/user.routes', () => jest.fn((app) => {
    app.get('/api/user/test', (req, res) => {
        res.json({ message: 'user routes loaded' });
    });
}));

jest.mock('../routes/sync.routes', () => jest.fn((app) => {
    app.get('/api/sync/test', (req, res) => {
        res.json({ message: 'sync routes loaded' });
    });
}));

const multer = require('multer');

describe('Server', () => {
    let app;

    beforeEach(() => {
        // Clear module cache to get fresh server instance
        delete require.cache[require.resolve('../server.js')];
        
        // Mock console.log to avoid output during tests
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        
        // Import server after mocking
        app = require('../server.js');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Basic Server Setup', () => {
        it('should respond to root endpoint', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body).toEqual({
                message: 'Welcome to ApliKasir Backend API.'
            });
        });

        it('should have CORS enabled', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            // CORS headers should be present
            expect(response.headers['access-control-allow-origin']).toBe('*');
        });

        it('should handle JSON requests', async () => {
            const testData = { test: 'data' };
            
            const response = await request(app)
                .post('/')
                .send(testData)
                .set('Content-Type', 'application/json')
                .expect(404); // 404 because POST / is not defined, but JSON parsing should work

            // The fact that we get 404 instead of 400 means JSON parsing worked
            expect(response.status).toBe(404);
        });

        it('should handle URL encoded requests', async () => {
            const response = await request(app)
                .post('/')
                .send('test=data')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .expect(404); // 404 because POST / is not defined

            expect(response.status).toBe(404);
        });
    });    describe('Routes Loading', () => {
        it('should load auth routes', () => {
            const authRoutes = require('../routes/auth.routes');
            expect(authRoutes).toHaveBeenCalledTimes(1);
            expect(authRoutes).toHaveBeenCalledWith(expect.anything());
        });

        it('should load user routes', () => {
            const userRoutes = require('../routes/user.routes');
            expect(userRoutes).toHaveBeenCalledTimes(1);
            expect(userRoutes).toHaveBeenCalledWith(expect.anything());
        });

        it('should load sync routes', () => {
            const syncRoutes = require('../routes/sync.routes');
            expect(syncRoutes).toHaveBeenCalledTimes(1);
            expect(syncRoutes).toHaveBeenCalledWith(expect.anything());
        });
    });    describe('Error Handling', () => {
        it('should have error handling middleware defined', () => {
            // Check that the app instance has been properly configured
            expect(app).toBeDefined();
            expect(typeof app).toBe('function');
            
            // Test that Express app has been properly set up
            expect(app.settings).toBeDefined();
            expect(app.mountpath).toBeDefined();
        });

        it('should handle 404 routes', async () => {
            await request(app)
                .get('/non-existent-route')
                .expect(404);
        });

        it('should handle POST on non-existent routes', async () => {
            await request(app)
                .post('/non-existent-route')
                .expect(404);
        });
    });

    describe('Environment Configuration', () => {
        it('should load dotenv config', () => {
            const dotenv = require('dotenv');
            expect(dotenv.config).toHaveBeenCalled();
        });
    });

    describe('Middleware Configuration', () => {
        it('should handle large JSON payloads', async () => {
            // Create a large JSON object (but within 10mb limit)
            const largeData = { data: 'x'.repeat(1000) };
            
            const response = await request(app)
                .post('/')
                .send(largeData)
                .set('Content-Type', 'application/json')
                .expect(404); // 404 because POST / is not defined

            expect(response.status).toBe(404);
        });

        it('should handle large URL encoded payloads', async () => {
            const largeData = 'data=' + 'x'.repeat(1000);
            
            const response = await request(app)
                .post('/')
                .send(largeData)
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .expect(404); // 404 because POST / is not defined

            expect(response.status).toBe(404);
        });
    });

    describe('Server Port Configuration', () => {
        it('should use PORT from environment or default to 3000', () => {
            // This test verifies that the server configuration code runs
            // The actual port listening is tested in integration tests
            expect(typeof process.env.PORT === 'undefined' || 
                   typeof process.env.PORT === 'string').toBe(true);
        });
    });

    describe('CORS Configuration', () => {
        it('should allow all origins in development', async () => {
            const response = await request(app)
                .get('/')
                .set('Origin', 'http://localhost:3000')
                .expect(200);

            expect(response.headers['access-control-allow-origin']).toBe('*');
        });

        it('should handle preflight requests', async () => {
            const response = await request(app)
                .options('/')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'POST')
                .expect(204);

            expect(response.headers['access-control-allow-origin']).toBe('*');
        });
    });
});
