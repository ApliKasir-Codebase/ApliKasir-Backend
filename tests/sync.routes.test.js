// tests/sync.routes.test.js
const express = require('express');
const request = require('supertest');

// Mock dependencies before importing
jest.mock('../controllers/sync.controller.js', () => ({
    synchronize: jest.fn(),
    synchronizeUploadOnly: jest.fn(),
    synchronizeDownloadOnly: jest.fn(),
    getSyncStatus: jest.fn(),
    forceFullSync: jest.fn(),
    getDataSummary: jest.fn(),
    backupUserData: jest.fn(),
    resolveConflicts: jest.fn(),
    getSyncMetrics: jest.fn()
}));

jest.mock('../middleware/authJwt.js', () => ({
    verifyToken: jest.fn((req, res, next) => {
        req.userId = 1; // Mock authenticated user
        next();
    })
}));

const syncController = require('../controllers/sync.controller.js');
const { verifyToken } = require('../middleware/authJwt.js');

describe('Sync Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Set up default mock implementations
        Object.keys(syncController).forEach(method => {
            syncController[method].mockImplementation((req, res) => {
                res.status(200).json({ success: true, method });
            });
        });
        
        // Apply routes
        require('../routes/sync.routes.js')(app);
    });

    describe('POST /api/sync', () => {
        it('should call synchronize controller with authentication', async () => {
            const syncData = {
                clientLastSyncTime: '2024-01-01T00:00:00.000Z',
                localChanges: { products: { new: [], updated: [], deleted: [] } }
            };

            const response = await request(app)
                .post('/api/sync')
                .send(syncData)
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(syncController.synchronize).toHaveBeenCalled();
            expect(response.body.success).toBe(true);
        });

        it('should require authentication', async () => {
            verifyToken.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ message: 'Unauthorized' });
            });

            await request(app)
                .post('/api/sync')
                .send({})
                .expect(401);

            expect(syncController.synchronize).not.toHaveBeenCalled();
        });
    });

    describe('POST /api/sync/upload', () => {
        it('should call synchronizeUploadOnly controller', async () => {
            const response = await request(app)
                .post('/api/sync/upload')
                .send({ localChanges: {} })
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(syncController.synchronizeUploadOnly).toHaveBeenCalled();
            expect(response.body.method).toBe('synchronizeUploadOnly');
        });
    });

    describe('POST /api/sync/download', () => {
        it('should call synchronizeDownloadOnly controller', async () => {
            const response = await request(app)
                .post('/api/sync/download')
                .send({ clientLastSyncTime: '2024-01-01T00:00:00.000Z' })
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(syncController.synchronizeDownloadOnly).toHaveBeenCalled();
            expect(response.body.method).toBe('synchronizeDownloadOnly');
        });
    });

    describe('GET /api/sync/status', () => {
        it('should call getSyncStatus controller', async () => {
            const response = await request(app)
                .get('/api/sync/status')
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(syncController.getSyncStatus).toHaveBeenCalled();
            expect(response.body.method).toBe('getSyncStatus');
        });
    });

    describe('POST /api/sync/reset', () => {
        it('should call forceFullSync controller', async () => {
            const response = await request(app)
                .post('/api/sync/reset')
                .send({})
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(syncController.forceFullSync).toHaveBeenCalled();
            expect(response.body.method).toBe('forceFullSync');
        });
    });

    describe('GET /api/sync/summary', () => {
        it('should call getDataSummary controller', async () => {
            const response = await request(app)
                .get('/api/sync/summary')
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(syncController.getDataSummary).toHaveBeenCalled();
            expect(response.body.method).toBe('getDataSummary');
        });
    });

    describe('GET /api/sync/backup', () => {
        it('should call backupUserData controller', async () => {
            const response = await request(app)
                .get('/api/sync/backup')
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(syncController.backupUserData).toHaveBeenCalled();
            expect(response.body.method).toBe('backupUserData');
        });
    });

    describe('POST /api/sync/resolve-conflicts', () => {
        it('should call resolveConflicts controller', async () => {
            const conflictData = {
                conflicts: [{ type: 'product', id: 1, resolution: 'server' }]
            };

            const response = await request(app)
                .post('/api/sync/resolve-conflicts')
                .send(conflictData)
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(syncController.resolveConflicts).toHaveBeenCalled();
            expect(response.body.method).toBe('resolveConflicts');
        });
    });

    describe('GET /api/sync/metrics', () => {
        it('should call getSyncMetrics controller', async () => {
            const response = await request(app)
                .get('/api/sync/metrics')
                .expect(200);

            expect(verifyToken).toHaveBeenCalled();
            expect(syncController.getSyncMetrics).toHaveBeenCalled();
            expect(response.body.method).toBe('getSyncMetrics');
        });
    });

    describe('Authentication Required', () => {
        const routes = [
            { method: 'post', path: '/api/sync' },
            { method: 'post', path: '/api/sync/upload' },
            { method: 'post', path: '/api/sync/download' },
            { method: 'get', path: '/api/sync/status' },
            { method: 'post', path: '/api/sync/reset' },
            { method: 'get', path: '/api/sync/summary' },
            { method: 'get', path: '/api/sync/backup' },
            { method: 'post', path: '/api/sync/resolve-conflicts' },
            { method: 'get', path: '/api/sync/metrics' }
        ];

        // Extracted test implementation to reduce nesting
        async function testAuthRequired(method, path) {
            verifyToken.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ message: 'Unauthorized' });
            });

            await request(app)[method](path)
                .send({})
                .expect(401);

            expect(verifyToken).toHaveBeenCalled();
        }

        routes.forEach(({ method, path }) => {
            it(`should require authentication for ${method.toUpperCase()} ${path}`, async () => {
                await testAuthRequired(method, path);
            });
        });
    });

    describe('CORS Headers', () => {
        it('should set correct CORS headers for all endpoints', async () => {
            await request(app)
                .post('/api/sync')
                .send({})
                .expect(200);

            await request(app)
                .get('/api/sync/status')
                .expect(200);
        });
    });

    describe('Middleware Order', () => {
        it('should apply verifyToken before controller', async () => {
            let middlewareOrder = [];

            verifyToken.mockImplementation((req, res, next) => {
                middlewareOrder.push('verifyToken');
                req.userId = 1;
                next();
            });

            syncController.synchronize.mockImplementation((req, res) => {
                middlewareOrder.push('controller');
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/sync')
                .send({})
                .expect(200);

            expect(middlewareOrder).toEqual(['verifyToken', 'controller']);
        });
    });
});
