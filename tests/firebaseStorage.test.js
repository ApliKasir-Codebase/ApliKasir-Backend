// tests/firebaseStorage.test.js
const { uploadImageToFirebase } = require('../utils/firebaseStorage.helper');

// Mock Google Cloud Storage
jest.mock('@google-cloud/storage', () => {
    const mockFile = {
        createWriteStream: jest.fn(),
        makePublic: jest.fn()
    };
    
    const mockBucket = {
        file: jest.fn(() => mockFile)
    };
    
    const mockStorage = {
        bucket: jest.fn(() => mockBucket)
    };
    
    return {
        Storage: jest.fn(() => mockStorage)
    };
});

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
    jest.resetModules();
    process.env = {
        ...originalEnv,
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_BUCKET_NAME: 'test-bucket',
        GOOGLE_APPLICATION_CREDENTIALS: 'test-credentials.json'
    };
});

afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
});

describe('Firebase Storage Helper', () => {
    const { Storage } = require('@google-cloud/storage');
    
    const createMockStream = (shouldError = false, shouldPublicFail = false) => {
        return {
            on: jest.fn((event, callback) => {
                if (event === 'finish' && !shouldError) {
                    process.nextTick(callback);
                } else if (event === 'error' && shouldError) {
                    process.nextTick(() => callback(new Error('Upload failed')));
                }
            }),
            end: jest.fn()
        };
    };

    describe('uploadImageToFirebase', () => {
        test('should upload image successfully and return public URL', async () => {
            const mockBuffer = Buffer.from('test image data');
            const mockOriginalname = 'test-image.jpg';
            
            // Setup mock storage behavior
            const mockStorage = new Storage();
            const mockBucket = mockStorage.bucket();
            const mockFile = mockBucket.file();
            
            const mockStream = createMockStream(false, false);
            
            mockFile.createWriteStream.mockReturnValue(mockStream);
            mockFile.makePublic.mockResolvedValue();
            
            const result = await uploadImageToFirebase(mockBuffer, mockOriginalname);
            
            expect(result).toMatch(/^https:\/\/storage\.googleapis\.com\/test-bucket\/profile_images\/profile_\d+-\d+\.jpg$/);
            expect(mockFile.createWriteStream).toHaveBeenCalledWith({
                resumable: false,
                metadata: {
                    contentType: 'image/jpg'
                }
            });
            expect(mockFile.makePublic).toHaveBeenCalled();
            expect(mockStream.end).toHaveBeenCalledWith(mockBuffer);
        });

        test('should handle upload error', async () => {
            const mockBuffer = Buffer.from('test image data');
            const mockOriginalname = 'test-image.png';
            
            const mockStorage = new Storage();
            const mockBucket = mockStorage.bucket();
            const mockFile = mockBucket.file();
            
            const mockStream = createMockStream(true, false);
            
            mockFile.createWriteStream.mockReturnValue(mockStream);
            
            await expect(uploadImageToFirebase(mockBuffer, mockOriginalname))
                .rejects.toThrow('Error uploading image: Upload failed');
        });

        test('should handle makePublic error and return gs:// URL', async () => {
            const mockBuffer = Buffer.from('test image data');
            const mockOriginalname = 'test-image.gif';
            
            const mockStorage = new Storage();
            const mockBucket = mockStorage.bucket();
            const mockFile = mockBucket.file();
            
            const mockStream = createMockStream(false, false);
            
            mockFile.createWriteStream.mockReturnValue(mockStream);
            mockFile.makePublic.mockRejectedValue(new Error('Public access denied'));
            
            const result = await uploadImageToFirebase(mockBuffer, mockOriginalname);
            
            expect(result).toMatch(/^gs:\/\/test-bucket\/profile_images\/profile_\d+-\d+\.gif$/);
        });

        test('should reject with invalid buffer', async () => {
            await expect(uploadImageToFirebase(null, 'test.jpg'))
                .rejects.toThrow('Invalid file buffer or originalname provided.');
        });

        test('should reject with invalid originalname', async () => {
            const mockBuffer = Buffer.from('test');
            await expect(uploadImageToFirebase(mockBuffer, null))
                .rejects.toThrow('Invalid file buffer or originalname provided.');
        });

        test('should handle custom destination path', async () => {
            const mockBuffer = Buffer.from('test image data');
            const mockOriginalname = 'test-image.jpg';
            const destinationPath = 'custom/path/';
            
            const mockStorage = new Storage();
            const mockBucket = mockStorage.bucket();
            const mockFile = mockBucket.file();
            
            const mockStream = createMockStream(false, false);
            
            mockFile.createWriteStream.mockReturnValue(mockStream);
            mockFile.makePublic.mockResolvedValue();
            
            await uploadImageToFirebase(mockBuffer, mockOriginalname, destinationPath);
            
            expect(mockBucket.file).toHaveBeenCalledWith(
                expect.stringMatching(/^custom\/path\/profile_\d+-\d+\.jpg$/)
            );
        });

        test('should handle destination path without trailing slash', async () => {
            const mockBuffer = Buffer.from('test image data');
            const mockOriginalname = 'test-image.jpg';
            const destinationPath = 'custom/path';
            
            const mockStorage = new Storage();
            const mockBucket = mockStorage.bucket();
            const mockFile = mockBucket.file();
            
            const mockStream = createMockStream(false, false);
            
            mockFile.createWriteStream.mockReturnValue(mockStream);
            mockFile.makePublic.mockResolvedValue();
            
            await uploadImageToFirebase(mockBuffer, mockOriginalname, destinationPath);
            
            expect(mockBucket.file).toHaveBeenCalledWith(
                expect.stringMatching(/^custom\/path\/profile_\d+-\d+\.jpg$/)
            );
        });

        test('should handle different file extensions', async () => {
            const testCases = [
                { file: 'test.png', expected: 'image/png' },
                { file: 'test.jpeg', expected: 'image/jpeg' },
                { file: 'test.gif', expected: 'image/gif' },
                { file: 'test.webp', expected: 'image/webp' }
            ];

            for (const testCase of testCases) {
                const mockBuffer = Buffer.from('test');
                const mockStorage = new Storage();
                const mockBucket = mockStorage.bucket();
                const mockFile = mockBucket.file();
                const mockStream = createMockStream(false, false);
                
                mockFile.createWriteStream.mockReturnValue(mockStream);
                mockFile.makePublic.mockResolvedValue();
                
                await uploadImageToFirebase(mockBuffer, testCase.file);
                
                expect(mockFile.createWriteStream).toHaveBeenCalledWith({
                    resumable: false,
                    metadata: {
                        contentType: testCase.expected
                    }
                });
            }
        });
    });
});
