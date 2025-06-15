// tests/db.config.test.js
describe('Database Configuration', () => {
    let mockPool;
    let mockConnection;
    let mysql;
    let dotenv;

    beforeEach(() => {
        // Clear module cache first
        jest.resetModules();
        
        // Mock console methods to avoid output during tests
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        
        // Create mock connection
        mockConnection = {
            release: jest.fn(),
            query: jest.fn(),
            execute: jest.fn()
        };
        
        // Create mock pool with properly mocked getConnection method
        mockPool = {
            getConnection: jest.fn().mockResolvedValue(mockConnection),
            query: jest.fn(),
            execute: jest.fn(),
            end: jest.fn()
        };
        
        // Mock mysql2/promise
        mysql = {
            createPool: jest.fn().mockReturnValue(mockPool)
        };
        jest.doMock('mysql2/promise', () => mysql);
        
        // Mock dotenv
        dotenv = {
            config: jest.fn()
        };
        jest.doMock('dotenv', () => dotenv);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    describe('Pool Creation', () => {
        it('should create database pool with correct configuration', () => {
            require('../config/db.config.js');
            
            expect(mysql.createPool).toHaveBeenCalledWith({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'aplikasir_db',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
        });

        it('should use environment variables when available', () => {
            // Set environment variables
            process.env.DB_HOST = 'test-host';
            process.env.DB_USER = 'test-user';
            process.env.DB_PASSWORD = 'test-password';
            process.env.DB_NAME = 'test-database';
            
            require('../config/db.config.js');
            
            expect(mysql.createPool).toHaveBeenCalledWith({
                host: 'test-host',
                user: 'test-user',
                password: 'test-password',
                database: 'test-database',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            
            // Clean up
            delete process.env.DB_HOST;
            delete process.env.DB_USER;
            delete process.env.DB_PASSWORD;
            delete process.env.DB_NAME;
        });

        it('should use default values when environment variables are not set', () => {
            // Ensure env vars are not set
            delete process.env.DB_HOST;
            delete process.env.DB_USER;
            delete process.env.DB_PASSWORD;
            delete process.env.DB_NAME;
            
            require('../config/db.config.js');
            
            expect(mysql.createPool).toHaveBeenCalledWith({
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'aplikasir_db',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
        });
    });

    describe('Environment Configuration', () => {
        it('should load dotenv config', () => {
            require('../config/db.config.js');
            expect(dotenv.config).toHaveBeenCalled();
        });
    });    describe('Connection Testing', () => {
        it('should test database connection on startup - success', async () => {
            require('../config/db.config.js');
            
            // Wait for connection test to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(mockPool.getConnection).toHaveBeenCalled();
            expect(mockConnection.release).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('Successfully connected to the database.');
        });

        it('should handle database connection failure', async () => {
            const connectionError = new Error('Connection failed');
            mockPool.getConnection.mockRejectedValue(connectionError);
            
            require('../config/db.config.js');
            
            // Wait for connection test to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(mockPool.getConnection).toHaveBeenCalled();
            expect(console.error).toHaveBeenCalledWith('Error connecting to the database:', connectionError);
        });
    });    describe('Module Export', () => {
        it('should export the database pool', () => {
            const dbConfig = require('../config/db.config.js');
            expect(dbConfig).toEqual(mockPool);
        });

        it('should return the same pool instance on multiple requires', () => {
            const dbConfig1 = require('../config/db.config.js');
            const dbConfig2 = require('../config/db.config.js');
            
            expect(dbConfig1).toBe(dbConfig2);
            expect(dbConfig1).toEqual(mockPool);
        });
    });

    describe('Pool Configuration Properties', () => {
        it('should configure pool with correct connection limits', () => {
            require('../config/db.config.js');
            
            const poolConfig = mysql.createPool.mock.calls[0][0];
            expect(poolConfig.waitForConnections).toBe(true);
            expect(poolConfig.connectionLimit).toBe(10);
            expect(poolConfig.queueLimit).toBe(0);
        });

        it('should use mysql2/promise for async support', () => {
            require('../config/db.config.js');
            expect(mysql.createPool).toHaveBeenCalled();
        });
    });

    describe('Database Configuration Validation', () => {
        it('should handle empty string password', () => {
            process.env.DB_PASSWORD = '';
            
            require('../config/db.config.js');
            
            const poolConfig = mysql.createPool.mock.calls[0][0];
            expect(poolConfig.password).toBe('');
            
            delete process.env.DB_PASSWORD;
        });

        it('should handle special characters in database name', () => {
            process.env.DB_NAME = 'test_db-123';
            
            require('../config/db.config.js');
            
            const poolConfig = mysql.createPool.mock.calls[0][0];
            expect(poolConfig.database).toBe('test_db-123');
            
            delete process.env.DB_NAME;
        });

        it('should handle numeric port in host', () => {
            process.env.DB_HOST = 'localhost:3306';
            
            require('../config/db.config.js');
            
            const poolConfig = mysql.createPool.mock.calls[0][0];
            expect(poolConfig.host).toBe('localhost:3306');
            
            delete process.env.DB_HOST;
        });
    });

    describe('Error Handling', () => {
        it('should not crash when connection test fails', async () => {
            mockPool.getConnection.mockRejectedValue(new Error('Database unavailable'));
            
            expect(() => {
                require('../config/db.config.js');
            }).not.toThrow();
        });

        it('should handle connection timeout errors', async () => {
            const timeoutError = new Error('Connection timeout');
            timeoutError.code = 'ETIMEDOUT';
            mockPool.getConnection.mockRejectedValue(timeoutError);
            
            require('../config/db.config.js');
            
            // Wait for connection test to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(console.error).toHaveBeenCalledWith('Error connecting to the database:', timeoutError);
        });

        it('should handle authentication errors', async () => {
            const authError = new Error('Access denied');
            authError.code = 'ER_ACCESS_DENIED_ERROR';
            mockPool.getConnection.mockRejectedValue(authError);
            
            require('../config/db.config.js');
            
            // Wait for connection test to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(console.error).toHaveBeenCalledWith('Error connecting to the database:', authError);
        });
    });
});
