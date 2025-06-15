// tests/setup.js
// Test setup file untuk konfigurasi global

const path = require('path');

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = 'testpassword';
process.env.DB_NAME = 'aplikasir_test_db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.PORT = '3001'; // Use different port for testing

// Mock Firebase if not available
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_BUCKET_NAME = 'test-bucket';
}

// Set longer timeout for database operations
jest.setTimeout(30000);

// Global setup untuk database
beforeAll(async () => {
    console.log('Setting up test environment...');
});

afterAll(async () => {
    console.log('Cleaning up test environment...');
});
