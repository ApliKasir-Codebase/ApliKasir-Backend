// tests/passwordUtils.test.js
const { hashPassword, verifyPassword } = require('../utils/passwordUtils');
const bcrypt = require('bcryptjs');

// Mock bcryptjs
jest.mock('bcryptjs');

describe('Password Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('hashPassword', () => {
        test('should hash password successfully', async () => {
            const password = 'testpassword123';
            const saltRounds = 10;
            const mockSalt = 'mockSalt';
            const mockHash = 'mockHashedPassword';

            bcrypt.genSalt.mockResolvedValue(mockSalt);
            bcrypt.hash.mockResolvedValue(mockHash);

            const result = await hashPassword(password);

            expect(bcrypt.genSalt).toHaveBeenCalledWith(saltRounds);
            expect(bcrypt.hash).toHaveBeenCalledWith(password, mockSalt);
            expect(result).toBe(mockHash);
        });

        test('should handle bcrypt error during salt generation', async () => {
            const password = 'testpassword123';
            const error = new Error('Salt generation failed');

            bcrypt.genSalt.mockRejectedValue(error);

            await expect(hashPassword(password)).rejects.toThrow('Salt generation failed');
        });

        test('should handle bcrypt error during hashing', async () => {
            const password = 'testpassword123';
            const mockSalt = 'mockSalt';
            const error = new Error('Hashing failed');

            bcrypt.genSalt.mockResolvedValue(mockSalt);
            bcrypt.hash.mockRejectedValue(error);

            await expect(hashPassword(password)).rejects.toThrow('Hashing failed');
        });
    });

    describe('verifyPassword', () => {
        test('should verify password successfully when passwords match', async () => {
            const enteredPassword = 'testpassword123';
            const storedHash = 'mockHashedPassword';

            bcrypt.compare.mockResolvedValue(true);

            const result = await verifyPassword(enteredPassword, storedHash);

            expect(bcrypt.compare).toHaveBeenCalledWith(enteredPassword, storedHash);
            expect(result).toBe(true);
        });

        test('should return false when passwords do not match', async () => {
            const enteredPassword = 'wrongpassword';
            const storedHash = 'mockHashedPassword';

            bcrypt.compare.mockResolvedValue(false);

            const result = await verifyPassword(enteredPassword, storedHash);

            expect(bcrypt.compare).toHaveBeenCalledWith(enteredPassword, storedHash);
            expect(result).toBe(false);
        });

        test('should handle bcrypt error during comparison', async () => {
            const enteredPassword = 'testpassword123';
            const storedHash = 'mockHashedPassword';
            const error = new Error('Comparison failed');

            bcrypt.compare.mockRejectedValue(error);

            await expect(verifyPassword(enteredPassword, storedHash)).rejects.toThrow('Comparison failed');
        });

        test('should handle empty passwords', async () => {
            bcrypt.compare.mockResolvedValue(false);

            const result1 = await verifyPassword('', 'hash');
            const result2 = await verifyPassword('password', '');

            expect(result1).toBe(false);
            expect(result2).toBe(false);
        });
    });
});
