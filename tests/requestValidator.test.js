// tests/requestValidator.test.js
const request = require('supertest');
const express = require('express');
const {
    validateRegister,
    validateLogin,
    validateProduct,
    validateCustomer,
    validateTransaction,
    validateUpdateUserProfile,
    validateIdParam
} = require('../middleware/requestValidator');

const app = express();
app.use(express.json());

// Test routes
app.post('/test-register', validateRegister, (req, res) => {
    res.json({ message: 'Valid registration data' });
});

app.post('/test-login', validateLogin, (req, res) => {
    res.json({ message: 'Valid login data' });
});

app.post('/test-product', validateProduct, (req, res) => {
    res.json({ message: 'Valid product data' });
});

app.post('/test-customer', validateCustomer, (req, res) => {
    res.json({ message: 'Valid customer data' });
});

app.post('/test-transaction', validateTransaction, (req, res) => {
    res.json({ message: 'Valid transaction data' });
});

app.put('/test-user-profile', validateUpdateUserProfile, (req, res) => {
    res.json({ message: 'Valid user profile data' });
});

app.get('/test-id/:id', validateIdParam, (req, res) => {
    res.json({ message: 'Valid ID parameter' });
});

describe('Request Validator Middleware', () => {
    describe('validateRegister', () => {
        test('should pass with valid registration data', async () => {
            const validData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+6281234567890',
                storeName: 'John Store',
                storeAddress: '123 Main St',
                password: 'password123'
            };

            const response = await request(app)
                .post('/test-register')
                .send(validData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valid registration data');
        });

        test('should fail with empty name', async () => {
            const invalidData = {
                email: 'john@example.com',
                phoneNumber: '+6281234567890',
                storeName: 'John Store',
                storeAddress: '123 Main St',
                password: 'password123'
            };

            const response = await request(app)
                .post('/test-register')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Nama tidak boleh kosong');
        });

        test('should fail with invalid email', async () => {
            const invalidData = {
                name: 'John Doe',
                email: 'invalid-email',
                phoneNumber: '+6281234567890',
                storeName: 'John Store',
                storeAddress: '123 Main St',
                password: 'password123'
            };

            const response = await request(app)
                .post('/test-register')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Format email tidak valid');
        });

        test('should fail with invalid phone number', async () => {
            const invalidData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '123',
                storeName: 'John Store',
                storeAddress: '123 Main St',
                password: 'password123'
            };

            const response = await request(app)
                .post('/test-register')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Format nomor telepon tidak valid');
        });

        test('should fail with short password', async () => {
            const invalidData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+6281234567890',
                storeName: 'John Store',
                storeAddress: '123 Main St',
                password: '123'
            };

            const response = await request(app)
                .post('/test-register')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Password minimal 6 karakter');
        });
    });

    describe('validateLogin', () => {
        test('should pass with valid login data', async () => {
            const validData = {
                identifier: 'john@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/test-login')
                .send(validData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valid login data');
        });

        test('should fail with empty identifier', async () => {
            const invalidData = {
                password: 'password123'
            };

            const response = await request(app)
                .post('/test-login')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Email atau nomor telepon tidak boleh kosong');
        });

        test('should fail with empty password', async () => {
            const invalidData = {
                identifier: 'john@example.com'
            };

            const response = await request(app)
                .post('/test-login')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Password tidak boleh kosong');
        });
    });

    describe('validateProduct', () => {
        test('should pass with valid product data', async () => {
            const validData = {
                nama_produk: 'Test Product',
                kode_produk: 'PROD001',
                jumlah_produk: 10,
                harga_modal: 5000,
                harga_jual: 7000
            };

            const response = await request(app)
                .post('/test-product')
                .send(validData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valid product data');
        });

        test('should fail with empty product name', async () => {
            const invalidData = {
                kode_produk: 'PROD001',
                jumlah_produk: 10,
                harga_modal: 5000,
                harga_jual: 7000
            };

            const response = await request(app)
                .post('/test-product')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Nama produk tidak boleh kosong');
        });

        test('should fail with negative quantity', async () => {
            const invalidData = {
                nama_produk: 'Test Product',
                kode_produk: 'PROD001',
                jumlah_produk: -5,
                harga_modal: 5000,
                harga_jual: 7000
            };

            const response = await request(app)
                .post('/test-product')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Jumlah produk harus angka non-negatif');
        });
    });

    describe('validateCustomer', () => {
        test('should pass with valid customer data', async () => {
            const validData = {
                nama_pelanggan: 'Jane Doe',
                nomor_telepon: '+6281234567890'
            };

            const response = await request(app)
                .post('/test-customer')
                .send(validData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valid customer data');
        });

        test('should pass with customer data without phone', async () => {
            const validData = {
                nama_pelanggan: 'Jane Doe'
            };

            const response = await request(app)
                .post('/test-customer')
                .send(validData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valid customer data');
        });

        test('should fail with empty customer name', async () => {
            const invalidData = {
                nomor_telepon: '+6281234567890'
            };

            const response = await request(app)
                .post('/test-customer')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Nama pelanggan tidak boleh kosong');
        });
    });

    describe('validateTransaction', () => {
        test('should pass with valid transaction data', async () => {
            const validData = {
                total_belanja: 15000,
                total_modal: 10000,
                metode_pembayaran: 'Tunai',
                status_pembayaran: 'Lunas',
                detail_items: [
                    {
                        product_id: 1,
                        quantity: 2,
                        harga_jual: 7500
                    }
                ],
                jumlah_bayar: 15000,
                jumlah_kembali: 0
            };

            const response = await request(app)
                .post('/test-transaction')
                .send(validData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valid transaction data');
        });

        test('should fail with invalid payment method', async () => {
            const invalidData = {
                total_belanja: 15000,
                total_modal: 10000,
                metode_pembayaran: 'Invalid Method',
                status_pembayaran: 'Lunas',
                detail_items: [
                    {
                        product_id: 1,
                        quantity: 2,
                        harga_jual: 7500
                    }
                ]
            };

            const response = await request(app)
                .post('/test-transaction')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Metode pembayaran tidak valid');
        });

        test('should fail with empty detail items', async () => {
            const invalidData = {
                total_belanja: 15000,
                total_modal: 10000,
                metode_pembayaran: 'Tunai',
                status_pembayaran: 'Lunas',
                detail_items: []
            };

            const response = await request(app)
                .post('/test-transaction')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Detail item harus ada minimal 1');
        });
    });

    describe('validateUpdateUserProfile', () => {
        test('should pass with valid update data', async () => {
            const validData = {
                name: 'Updated Name',
                email: 'updated@example.com'
            };

            const response = await request(app)
                .put('/test-user-profile')
                .send(validData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valid user profile data');
        });

        test('should pass with new password and confirmation', async () => {
            const validData = {
                name: 'Updated Name',
                newPassword: 'newpassword123',
                confirmPassword: 'newpassword123'
            };

            const response = await request(app)
                .put('/test-user-profile')
                .send(validData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valid user profile data');
        });

        test('should fail with mismatched password confirmation', async () => {
            const invalidData = {
                name: 'Updated Name',
                newPassword: 'newpassword123',
                confirmPassword: 'differentpassword'
            };

            const response = await request(app)
                .put('/test-user-profile')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Konfirmasi password baru tidak cocok');
        });

        test('should fail with new password but no confirmation', async () => {
            const invalidData = {
                name: 'Updated Name',
                newPassword: 'newpassword123'
            };

            const response = await request(app)
                .put('/test-user-profile')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Konfirmasi password baru diperlukan');
        });
    });

    describe('validateIdParam', () => {
        test('should pass with valid ID', async () => {
            const response = await request(app).get('/test-id/123');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valid ID parameter');
        });

        test('should fail with invalid ID', async () => {
            const response = await request(app).get('/test-id/invalid');

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Parameter ID tidak valid');
        });
    });
});
