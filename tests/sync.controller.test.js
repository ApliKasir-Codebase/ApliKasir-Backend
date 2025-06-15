// tests/sync.controller.test.js
const syncController = require('../controllers/sync.controller');

// Mock dependencies
jest.mock('../config/db.config.js', () => ({
    query: jest.fn(),
    getConnection: jest.fn()
}));

const db = require('../config/db.config.js');

describe('Sync Controller', () => {
    let req, res, mockConnection;

    beforeEach(() => {
        req = {
            userId: 1,
            body: {
                clientLastSyncTime: '2024-01-01T00:00:00.000Z',
                localChanges: {
                    products: { new: [], updated: [], deleted: [] },
                    customers: { new: [], updated: [], deleted: [] },
                    transactions: { new: [], updated: [], deleted: [] }
                }
            }
        };        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Mock console methods to avoid output during tests
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        
        // Setup mock connection
        mockConnection = {
            beginTransaction: jest.fn().mockResolvedValue(),
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
            release: jest.fn().mockResolvedValue(),
            query: jest.fn().mockResolvedValue([[]])
        };
        
        db.getConnection.mockResolvedValue(mockConnection);
        db.query.mockResolvedValue([[]]);
    });

    afterEach(() => {
        // Restore console methods
        jest.restoreAllMocks();
    });

    describe('synchronize', () => {
        it('should handle synchronization with empty local changes', async () => {
            const mockConnection = {
                beginTransaction: jest.fn().mockResolvedValue(),
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                release: jest.fn().mockResolvedValue(),
                query: jest.fn().mockResolvedValue([[]])
            };
            
            db.getConnection.mockResolvedValue(mockConnection);
            
            // Mock database queries for sync log and user update
            db.query
                .mockResolvedValueOnce([[{ insertId: 1 }]]) // Insert sync log
                .mockResolvedValueOnce([[]]) // Check server changes
                .mockResolvedValueOnce([[]]) // Update user sync time
                .mockResolvedValueOnce([[]]) // Update sync log;

            await syncController.synchronize(req, res);

            expect(db.getConnection).toHaveBeenCalled();
            expect(mockConnection.beginTransaction).toHaveBeenCalled();
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.release).toHaveBeenCalled();
              expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    itemsUploaded: 0,
                    itemsDownloaded: 0,
                    serverChanges: expect.objectContaining({
                        products: { new: [], updated: [], deleted: [] },
                        customers: { new: [], updated: [], deleted: [] },
                        transactions: { new: [], updated: [], deleted: [] }
                    })
                })
            );
        });

        it('should handle database connection failure', async () => {
            const error = new Error('Database connection failed');
            db.getConnection.mockRejectedValueOnce(error);

            await syncController.synchronize(req, res);            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errors: expect.arrayContaining(['Sync failed: Database connection failed'])
                })
            );
        });

        it('should handle transaction failure and rollback', async () => {
            const mockConnection = {
                beginTransaction: jest.fn().mockResolvedValue(),
                commit: jest.fn().mockRejectedValueOnce(new Error('Commit failed')),
                rollback: jest.fn().mockResolvedValue(),
                release: jest.fn().mockResolvedValue(),
                query: jest.fn().mockResolvedValue([[]])
            };
            
            db.getConnection.mockResolvedValue(mockConnection);
            db.query.mockResolvedValueOnce([[{ insertId: 1 }]]); // Insert sync log

            await syncController.synchronize(req, res);            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errors: expect.arrayContaining(['Sync failed: Commit failed'])
                })
            );
        });

        it('should handle synchronization with local changes', async () => {
            req.body.localChanges = {
                products: {
                    new: [{ name: 'New Product', price: 100 }],
                    updated: [{ id: 1, name: 'Updated Product' }],
                    deleted: [{ id: 2 }]
                },
                customers: {
                    new: [{ name: 'New Customer', email: 'new@test.com' }],
                    updated: [],
                    deleted: []
                },
                transactions: {
                    new: [{ total: 1000, customer_id: 1 }],
                    updated: [],
                    deleted: []
                }
            };

            const mockConnection = {
                beginTransaction: jest.fn().mockResolvedValue(),
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                release: jest.fn().mockResolvedValue(),
                query: jest.fn().mockResolvedValue([[]])
            };
            
            db.getConnection.mockResolvedValue(mockConnection);
            
            // Mock successful sync log insertion
            db.query.mockResolvedValueOnce([[{ insertId: 1 }]]);

            await syncController.synchronize(req, res);            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    itemsUploaded: expect.any(Number),
                    itemsDownloaded: expect.any(Number)
                })
            );
        });

        it('should handle missing request body parameters', async () => {
            req.body = {}; // Missing required parameters

            const mockConnection = {
                beginTransaction: jest.fn().mockResolvedValue(),
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                release: jest.fn().mockResolvedValue(),
                query: jest.fn().mockResolvedValue([[]])
            };
            
            db.getConnection.mockResolvedValue(mockConnection);
            db.query.mockResolvedValueOnce([[{ insertId: 1 }]]);

            await syncController.synchronize(req, res);            // Should still process even with missing parameters
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true
                })
            );
        });

        it('should log performance metrics and sync details', async () => {
            const mockConnection = {
                beginTransaction: jest.fn().mockResolvedValue(),
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                release: jest.fn().mockResolvedValue(),
                query: jest.fn().mockResolvedValue([[]])
            };
            
            db.getConnection.mockResolvedValue(mockConnection);
            db.query.mockResolvedValueOnce([[{ insertId: 1 }]]);

            await syncController.synchronize(req, res);

            // Verify that console.log was called for sync start
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('=== SYNC START ===')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Client last sync:')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Local changes summary:'),
                expect.any(Object)
            );
        });

        it('should include performance metrics in response', async () => {
            const mockConnection = {
                beginTransaction: jest.fn().mockResolvedValue(),
                commit: jest.fn().mockResolvedValue(),
                rollback: jest.fn().mockResolvedValue(),
                release: jest.fn().mockResolvedValue(),
                query: jest.fn().mockResolvedValue([[]])
            };
            
            db.getConnection.mockResolvedValue(mockConnection);
            db.query.mockResolvedValueOnce([[{ insertId: 1 }]]);

            await syncController.synchronize(req, res);            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    serverSyncTime: expect.any(String),
                    performanceMetrics: expect.objectContaining({
                        totalTime: expect.any(Number),
                        uploadTime: expect.any(Number),
                        downloadTime: expect.any(Number),
                        conflictDetectionTime: expect.any(Number),
                        totalItems: expect.any(Number),
                        memoryUsage: expect.any(Object)
                    })
                })
            );
        });

        it('should catch errors during uploading new products and continue sync', async () => {
            // Prepare localChanges with new products
            req.body.localChanges.products.new = [
                {
                    id: 1,
                    nama_produk: 'Prod1',
                    kode_produk: 'K1',
                    jumlah_produk: 5,
                    harga_modal: 10,
                    harga_jual: 15,
                    gambar_produk: 'img1',
                    created_at: null,
                    updated_at: null
                }
            ];
            // Stub queries: 1) insert log, 2) upload error
            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 2 }])
                .mockRejectedValueOnce(new Error('InsertProdError'))
                .mockResolvedValue([[/* download products return empty */]])
                .mockResolvedValue([[/* update users */]])
                .mockResolvedValue([[/* update sync_logs */]]);

            await syncController.synchronize(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const resp = res.json.mock.calls[0][0];
            expect(resp.success).toBe(true);
            // Error pushed from uploadProducts
            expect(resp.errors).toEqual(expect.arrayContaining([
                'Failed to upload product: Prod1 - InsertProdError'
            ]));
        });

        it('should add serverIds for new products when upload succeeds', async () => {
            req.body.localChanges.products.new = [
                { id: 3, nama_produk: 'Prod2', kode_produk: 'K2', jumlah_produk: 2, harga_modal: 5, harga_jual: 10, gambar_produk: 'img2' }
            ];
            // Stub queries: insert log, insert prod success, download phase and updates
            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 5 }])
                .mockResolvedValueOnce([{ insertId: 100 }])  // uploadNewProducts
                .mockResolvedValue([[/* download...*/]])
                .mockResolvedValue([[/* update users*/]])
                .mockResolvedValue([[/* update sync_logs*/]]);

            await syncController.synchronize(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const resp = res.json.mock.calls[0][0];
            expect(resp.success).toBe(true);
            // itemsUploaded incremented
            expect(resp.itemsUploaded).toBeGreaterThanOrEqual(1);
            // serverChanges.products.new includes the mapping
            expect(resp.serverChanges.products.new).toEqual([
                expect.objectContaining({ localId: 3, serverId: 100, nama_produk: 'Prod2' })
            ]);
        });

        it('should update products and handle success and no-change scenarios', async () => {
            req.body.localChanges.products.updated = [
                { server_id: 20, nama_produk: 'ProdU', kode_produk: 'KU', jumlah_produk: 3, harga_modal: 8, harga_jual: 12, gambar_produk: 'imgU', updated_at: null }
            ];
            // Sequence: insert log, update product (affectedRows>0), download, update user, update log
            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 3 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]) // update succeeds
                .mockResolvedValue([[/* download...*/]])
                .mockResolvedValue([[/* update users*/]])
                .mockResolvedValue([[/* update sync_logs*/]]);
            
            await syncController.synchronize(req, res);
            const resp = res.json.mock.calls[0][0];
            expect(resp.itemsUploaded).toBeGreaterThanOrEqual(1);
            expect(resp.errors).not.toEqual(expect.arrayContaining([expect.stringContaining('Product not found')]));
        });

        it('should report error when updating non-existent products', async () => {
            req.body.localChanges.products.updated = [
                { server_id: 30, nama_produk: 'ProdX', kode_produk: 'KX', jumlah_produk: 1, harga_modal: 5, harga_jual: 10, gambar_produk: 'imgX', updated_at: null }
            ];
            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 4 }])
                .mockResolvedValueOnce([{ affectedRows: 0 }]) // update no row
                .mockResolvedValue([[/* download...*/]])
                .mockResolvedValue([[/* update users*/]])
                .mockResolvedValue([[/* update sync_logs*/]]);
            
            await syncController.synchronize(req, res);
            const resp = res.json.mock.calls[0][0];
            expect(resp.errors).toEqual(expect.arrayContaining([
                'Product not found or not owned: ProdX'
            ]));
        });

        it('should delete products and handle success and failures accordingly', async () => {
            req.body.localChanges.products.deleted = [40, 50];
            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 5 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]) // delete 40
                .mockResolvedValueOnce([{ affectedRows: 0 }]) // delete 50 fails
                .mockResolvedValue([[/* download...*/]])
                .mockResolvedValue([[/* update users*/]])
                .mockResolvedValue([[/* update sync_logs*/]]);

            await syncController.synchronize(req, res);
            const resp = res.json.mock.calls[0][0];
            expect(resp.itemsUploaded).toBe(1);
            expect(resp.errors).toEqual(expect.arrayContaining([
                'Product not found for deletion: ID 50'
            ]));
        });

        it('should handle new customers upload with success and errors', async () => {
            req.body.localChanges.customers.new = [
                { id: 10, nama_pelanggan: 'Cust1', nomor_telepon: '08123', created_at: null, updated_at: null },
                { id: 11, nama_pelanggan: 'Cust2', nomor_telepon: '08456', created_at: null, updated_at: null }
            ];
            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 6 }]) // sync log
                .mockResolvedValueOnce([{ insertId: 101 }]) // Cust1 success
                .mockRejectedValueOnce(new Error('InsertCustError')) // Cust2 fail
                .mockResolvedValue([[/* download...*/]])
                .mockResolvedValue([[/* update users*/]])
                .mockResolvedValue([[/* update sync_logs*/]]);

            await syncController.synchronize(req, res);
            const resp = res.json.mock.calls[0][0];
            expect(resp.itemsUploaded).toBe(1);
            expect(resp.serverChanges.customers.new).toEqual([
                expect.objectContaining({ localId: 10, serverId: 101, nama_pelanggan: 'Cust1' })
            ]);
            expect(resp.errors).toEqual(expect.arrayContaining([
                'Failed to upload customer: Cust2 - InsertCustError'
            ]));
        });

        it('should handle updated customers with success and not found scenarios', async () => {
            req.body.localChanges.customers.updated = [
                { server_id: 200, nama_pelanggan: 'CustU', nomor_telepon: '08789', updated_at: null },
                { server_id: 300, nama_pelanggan: 'CustX', nomor_telepon: '08000', updated_at: null }
            ];
            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 7 }]) // sync log
                .mockResolvedValueOnce([{ affectedRows: 1 }]) // CustU success
                .mockResolvedValueOnce([{ affectedRows: 0 }]) // CustX not found
                .mockResolvedValue([[/* download...*/]])
                .mockResolvedValue([[/* update users*/]])
                .mockResolvedValue([[/* update sync_logs*/]]);

            await syncController.synchronize(req, res);
            const resp = res.json.mock.calls[0][0];
            expect(resp.itemsUploaded).toBe(1);
            expect(resp.errors).toEqual(expect.arrayContaining([
                'Customer not found or not owned: CustX'
            ]));
        });

        it('should handle deleted customers with success and error reporting', async () => {
            req.body.localChanges.customers.deleted = [400, 500];
            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 8 }]) // sync log
                .mockResolvedValueOnce([{ affectedRows: 1 }]) // 400 success
                .mockRejectedValueOnce(new Error('DeleteCustError')) // 500 fail
                .mockResolvedValue([[/* download...*/]])
                .mockResolvedValue([[/* update users*/]])
                .mockResolvedValue([[/* update sync_logs*/]]);

            await syncController.synchronize(req, res);
            const resp = res.json.mock.calls[0][0];
            expect(resp.itemsUploaded).toBe(1);
            expect(resp.errors).toEqual(expect.arrayContaining([
                'Failed to delete customer: ID 500 - DeleteCustError'
            ]));
        });

        // Test cases for uploadTransactions
        describe('uploadTransactions', () => {
            it('should upload new transactions successfully', async () => {
                req.body.localChanges.transactions.new = [
                    { id_transaksi_local: 'local-tx-1', tanggal_transaksi: new Date().toISOString(), total_belanja: 100, total_modal: 50, metode_pembayaran: 'cash', status_pembayaran: 'paid', id_pelanggan: null, detail_items: '[]', jumlah_bayar: 100, jumlah_kembali: 0, id_transaksi_hutang: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
                ];
                // Precise mock sequence for this test case
                mockConnection.query
                    .mockResolvedValueOnce([ { insertId: 9 } ])       // 1. sync log insert
                    // Since transaction.id_pelanggan is null, getServerCustomerId is NOT called.
                    .mockResolvedValueOnce([ { insertId: 1001, affectedRows: 1 } ]) // 2. insertNewTransaction's INSERT query
                    .mockResolvedValueOnce([[]])                    // 3. processDownloads - products
                    .mockResolvedValueOnce([[]])                    // 4. processDownloads - customers
                    .mockResolvedValueOnce([[]])                    // 5. processDownloads - transactions
                    .mockResolvedValueOnce([[]])                    // 6. update users table
                    .mockResolvedValueOnce([[]]);                   // 7. update sync_logs table

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                expect(resp.itemsUploaded).toBe(1);
                expect(resp.serverChanges.transactions.new).toEqual([
                    expect.objectContaining({ localId: 'local-tx-1', serverId: 1001 })
                ]);
                expect(resp.errors).toEqual([]);
            });

            it('should handle errors when uploading new transactions', async () => {
                req.body.localChanges.transactions.new = [
                    { id_transaksi_local: 'local-tx-err', tanggal_transaksi: new Date().toISOString(), total_belanja: 200, total_modal: 100, metode_pembayaran: 'card', status_pembayaran: 'pending', id_pelanggan: 1, detail_items: '[]', jumlah_bayar: 200, jumlah_kembali: 0, id_transaksi_hutang: null }
                ];
                mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 10 }]) // sync log
                    .mockResolvedValueOnce([[{ id: 501 }]]) // getServerCustomerId (found)
                    .mockRejectedValueOnce(new Error('InsertTransactionError')) // insertNewTransaction fails
                    .mockResolvedValue([[/* download...*/]])
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];
                expect(resp.success).toBe(true); // Sync itself might succeed partially
                expect(resp.itemsUploaded).toBe(0);
                expect(resp.errors).toEqual(expect.arrayContaining([
                    'Failed to upload transaction: InsertTransactionError'
                ]));
            });

            it('should upload updated transactions successfully', async () => {
                req.body.localChanges.transactions.updated = [
                    { server_id: 701, id_transaksi_local: 'local-tx-upd', tanggal_transaksi: new Date().toISOString(), total_belanja: 150, total_modal: 70, metode_pembayaran: 'cash', status_pembayaran: 'paid', id_pelanggan: null, detail_items: '[{"id":1}]', jumlah_bayar: 150, jumlah_kembali: 0, id_transaksi_hutang: null, updated_at: new Date().toISOString() }
                ];
                // Precise mock sequence for this test case
                mockConnection.query
                    .mockResolvedValueOnce([ { insertId: 11 } ])      // 1. sync log insert
                    .mockResolvedValueOnce([ { affectedRows: 1 } ]) // 2. uploadUpdatedTransactions's UPDATE query
                    .mockResolvedValueOnce([[]])                    // 3. processDownloads - products
                    .mockResolvedValueOnce([[]])                    // 4. processDownloads - customers
                    .mockResolvedValueOnce([[]])                    // 5. processDownloads - transactions
                    // 6. detectConflicts:
                    //    - localChanges.products.updated is empty from beforeEach
                    //    - localChanges.customers.updated is empty from beforeEach
                    //    - localChanges.transactions.updated has one item (server_id: 701)
                    //      detectTransactionConflicts -> processTransactionConflict -> getServerTransaction(701)
                    .mockResolvedValueOnce([[]]) // 6. getServerTransaction for conflict check on tx 701 (e.g., returns empty, no conflict)
                    .mockResolvedValueOnce([[]])                    // 7. update users table
                    .mockResolvedValueOnce([[]]);                   // 8. update sync_logs table

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                expect(resp.itemsUploaded).toBe(1);
                expect(resp.errors).toEqual([]);
            });

            it('should report error when updating non-existent transactions', async () => {
                req.body.localChanges.transactions.updated = [
                    { server_id: 702, id_transaksi_local: 'local-tx-upd-fail', total_belanja: 160 }
                ];
                mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 12 }]) // sync log
                    .mockResolvedValueOnce([{ affectedRows: 0 }]) // updateTransaction (not found)
                    .mockResolvedValue([[/* download...*/]])
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);
                
                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                expect(resp.itemsUploaded).toBe(0);
                expect(resp.errors).toEqual(expect.arrayContaining([
                    'Transaction not found or not owned for update: local-tx-upd-fail'
                ]));
            });

            it('should delete transactions successfully', async () => {
                req.body.localChanges.transactions.deleted = [
                    // Now expects objects with server_id
                    { server_id: 801, id_transaksi_local: 'local-tx-del' }
                ];
                mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 13 }]) // sync log
                    .mockResolvedValueOnce([{ affectedRows: 1 }]) // deleteTransaction
                    .mockResolvedValue([[/* download...*/]])
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                expect(resp.itemsUploaded).toBe(1);
                expect(resp.errors).toEqual([]);
            });

            it('should report error when deleting non-existent transactions', async () => {
                req.body.localChanges.transactions.deleted = [
                     // Now expects objects with server_id
                    { server_id: 802, id_transaksi_local: 'local-tx-del-fail' }
                ];
                 mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 14 }]) // sync log
                    .mockResolvedValueOnce([{ affectedRows: 0 }]) // deleteTransaction (not found)
                    .mockResolvedValue([[/* download...*/]])
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                expect(resp.itemsUploaded).toBe(0);
                expect(resp.errors).toEqual(expect.arrayContaining([
                    'Transaction not found for deletion: ID local-tx-del-fail' // Adjusted expected error message
                ]));
            });
        });

        // Test cases for processDownloads
        describe('processDownloads', () => {
            it('should download new, updated, and deleted data successfully', async () => {
                const clientLastSyncTime = '2024-01-01T00:00:00.000Z';
                req.body.clientLastSyncTime = clientLastSyncTime;

                const mockProductsNew = [{ id: 1, nama_produk: 'Downloaded Prod New', created_at: '2024-01-02T00:00:00.000Z', updated_at: '2024-01-02T00:00:00.000Z' }]; // CORRECTED updated_at
                // const mockProductsUpdated = [{ id: 2, nama_produk: 'Downloaded Prod Updated' }]; // Unused
                // const mockProductsDeleted = [{ id: 3 }]; // Unused

                const mockCustomersNew = [{ id: 10, nama_pelanggan: 'Downloaded Cust New', created_at: '2024-01-02T00:00:00.000Z', updated_at: '2024-01-02T00:00:00.000Z' }]; // CORRECTED updated_at
                // const mockCustomersUpdated = [{ id: 11, nama_pelanggan: 'Downloaded Cust Updated' }]; // Unused
                // const mockCustomersDeleted = [{ id: 12 }]; // Unused

                const mockTransactionsNew = [{ id: 100, total_belanja: 500, created_at: '2024-01-02T00:00:00.000Z', updated_at: '2024-01-02T00:00:00.000Z' }]; // CORRECTED updated_at
                // const mockTransactionsUpdated = [{ id: 101, total_belanja: 600 }]; // Unused
                // const mockTransactionsDeleted = [{ id: 102 }]; // Unused

                mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 15 }]) // sync log
                    // Products downloads
                    .mockResolvedValueOnce([mockProductsNew])       // downloadNewProducts (via processDownloads internal call)
                    .mockResolvedValueOnce([mockCustomersNew])      // downloadNewCustomers
                    .mockResolvedValueOnce([mockTransactionsNew])     // downloadNewTransactions
                    // No separate calls for updated/deleted in this simplified mock structure for processDownloads
                    // The single query in processDownloads per entity type handles all (new, updated, deleted)
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                // Adjusting expected itemsDownloaded based on the new understanding of processDownloads
                // It fetches all items > lastSync and then categorizes them.
                // The mockProductsNew, mockCustomersNew, mockTransactionsNew are now the direct results of the SELECT queries.
                // Let's assume the mock data implies these are all 'new' for simplicity of this test fix.
                const expectedDownloaded = mockProductsNew.length + mockCustomersNew.length + mockTransactionsNew.length;
                expect(resp.itemsDownloaded).toBe(expectedDownloaded);
                expect(resp.serverChanges.products.new).toEqual(mockProductsNew);
                expect(resp.serverChanges.products.updated).toEqual([]); // Assuming no updates in this simplified mock
                expect(resp.serverChanges.products.deleted).toEqual([]); // Assuming no deletes
                expect(resp.serverChanges.customers.new).toEqual(mockCustomersNew);
                expect(resp.serverChanges.customers.updated).toEqual([]);
                expect(resp.serverChanges.customers.deleted).toEqual([]);
                expect(resp.serverChanges.transactions.new).toEqual(mockTransactionsNew);
                expect(resp.serverChanges.transactions.updated).toEqual([]);
                expect(resp.serverChanges.transactions.deleted).toEqual([]);
                expect(resp.errors).toEqual([]);
            });

            it('should handle no changes to download', async () => {
                req.body.clientLastSyncTime = new Date().toISOString();
                mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 16 }]) // sync log
                    // All download queries return empty arrays
                    .mockResolvedValueOnce([[]]) // products
                    .mockResolvedValueOnce([[]]) // customers
                    .mockResolvedValueOnce([[]]) // transactions
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                expect(resp.itemsDownloaded).toBe(0);
                expect(resp.serverChanges.products.new).toEqual([]);
                expect(resp.serverChanges.products.updated).toEqual([]);
                expect(resp.serverChanges.products.deleted).toEqual([]);
                expect(resp.errors).toEqual([]);
            });

            it('should handle errors during download phase and continue sync', async () => {
                req.body.clientLastSyncTime = '2024-01-01T00:00:00.000Z';
                mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 17 }]) // sync log
                    .mockRejectedValueOnce(new Error('DownloadProductError')) // downloadNewProducts fails
                    // Subsequent download queries might still run or be skipped depending on implementation
                    // For this test, assume it tries to continue
                    .mockResolvedValueOnce([[]]) // downloadUpdatedProducts
                    .mockResolvedValueOnce([[]]) // downloadDeletedProducts
                    .mockResolvedValueOnce([[]]) // downloadNewCustomers
                    .mockResolvedValueOnce([[]]) // downloadUpdatedCustomers
                    .mockResolvedValueOnce([[]]) // downloadDeletedCustomers
                    .mockResolvedValueOnce([[]]) // downloadNewTransactions
                    .mockResolvedValueOnce([[]]) // downloadUpdatedTransactions
                    .mockResolvedValueOnce([[]]) // downloadDeletedTransactions
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true); // Sync might partially succeed
                expect(resp.itemsDownloaded).toBe(0); // Or some items if others succeeded before error
                expect(resp.errors).toEqual(expect.arrayContaining([
                    'Download error: DownloadProductError'
                ]));
            });
        });

        // Test cases for detectConflicts
        describe('detectConflicts', () => {
            it('should detect conflicts between local changes and server changes', async () => {
                req.userId = 123; // Ensure userId matches what the controller expects
                // Simulate local changes
                const localProductToUpdate = { server_id: 1, id: 'local-prod-1', nama_produk: 'Local Updated Product', updated_at: new Date(Date.now() - 20000).toISOString() };
                const localTransactionToUpdate = { server_id: 100, id: 'local-tx-100', total_belanja: 777, updated_at: new Date(Date.now() - 60000).toISOString() };

                req.body.localChanges = {
                    products: {
                        updated: [localProductToUpdate],
                        deleted: [] 
                    },
                    customers: {
                        updated: [] // Ensure this is empty to avoid customer conflict in this specific test
                    },
                    transactions: {
                        updated: [localTransactionToUpdate] 
                    }
                };

                // Simulate server state that would be fetched by conflict detection queries
                const serverProductConflict = { id: 1, nama_produk: 'Server Product Newer', updated_at: new Date(Date.now() - 10000).toISOString() }; // Server is newer
                
                const serverTransactionConflict = { id: 100, total_belanja: 888, updated_at: new Date(Date.now() - 50000).toISOString() }; // Server is newer

                mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 18 }]) // sync log
                    // processUploads mocks
                    .mockResolvedValueOnce([{ affectedRows: 1 }]) // update product 1
                    .mockResolvedValueOnce([[{id: null}]])       // get server customer id for tx (still needed if tx has customer_id)
                    .mockResolvedValueOnce([{ affectedRows: 1 }]) // update transaction 100
                    // processDownloads mocks (empty)
                    .mockResolvedValueOnce([[]]) // products download
                    .mockResolvedValueOnce([[]]) // customers download
                    .mockResolvedValueOnce([[]]) // transactions download
                    // detectConflicts mocks: getServerProduct, getServerTransaction
                    .mockResolvedValueOnce([[serverProductConflict]])   // Product 1 (server newer)
                    .mockResolvedValueOnce([[serverTransactionConflict]]) // Transaction 100 (server newer)
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                expect(resp.conflicts.length).toBe(2); // Product and Transaction conflict
                
                assertProductConflict(resp.conflicts, {
                    type: 'product',
                    conflictType: 'data_mismatch',
                    id: 1,
                    localId: 'local-prod-1',
                    serverData: expect.objectContaining({ nama_produk: 'Server Product Newer' }),
                    localData: expect.objectContaining({ nama_produk: 'Local Updated Product' }),
                });

                assertTransactionConflict(resp.conflicts, {
                    type: 'transaction',
                    conflictType: 'data_mismatch',
                    id: 100,
                    localId: 'local-tx-100',
                    serverData: expect.objectContaining({ total_belanja: 888 }),
                    localData: expect.objectContaining({ total_belanja: 777 }),
                });
                expect(resp.errors).toEqual([]);
            });

            it('should handle no conflicts if local and server changes do not overlap or local is newer/same (within tolerance)', async () => {
                req.body.localChanges = {
                    products: {
                        updated: [{ server_id: 1, id: 'local-prod-1', nama_produk: 'Local Updated Product', updated_at: new Date().toISOString() }]
                    }
                };
                // Server product is older, or updated_at is within tolerance, so no conflict by data_mismatch due to timestamp
                const serverProductOlder = [{ id: 1, nama_produk: 'Server Original Product', updated_at: new Date(Date.now() - 1000).toISOString() }];

                mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 19 }]) // sync log
                    .mockResolvedValueOnce([{ affectedRows: 1 }]) // upload product
                    .mockResolvedValueOnce([[]]) // downloads products empty
                    .mockResolvedValueOnce([[]]) // downloads customers empty
                    .mockResolvedValueOnce([[]]) // downloads transactions empty
                    .mockResolvedValueOnce([serverProductOlder]) // detectConflicts for product 1 (local is newer or same)
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);

                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                expect(resp.conflicts).toEqual([]); // No conflict if local is newer or timestamps are close
                expect(resp.errors).toEqual([]);
            });

            it('should report missing on server if local item updated but not found on server during conflict check', async () => {
                req.body.localChanges = {
                    products: {
                        updated: [{ server_id: 999, id: 'local-prod-999', nama_produk: 'Local Prod Missing', updated_at: new Date().toISOString() }]
                    }
                };
                mockConnection.query
                    .mockResolvedValueOnce([{ insertId: 20 }]) // sync log
                    .mockResolvedValueOnce([{ affectedRows: 0 }]) // upload (product 999 not found, so 0 affected)
                    .mockResolvedValueOnce([[]]) // downloads products
                    .mockResolvedValueOnce([[]]) // downloads customers
                    .mockResolvedValueOnce([[]]) // downloads transactions
                    .mockResolvedValueOnce([[]]) // detectConflicts: getServerProduct returns empty for ID 999
                    .mockResolvedValue([[/* update users*/]])
                    .mockResolvedValue([[/* update sync_logs*/]]);
                
                await syncController.synchronize(req, res);
                const resp = res.json.mock.calls[0][0];

                expect(resp.success).toBe(true);
                expect(resp.conflicts.length).toBe(1);
                expect(resp.conflicts[0]).toEqual(expect.objectContaining({
                    type: 'product',
                    conflictType: 'missing_on_server',
                    id: 999,
                    localId: 'local-prod-999'
                }));
                // An error might also be present from the upload phase if it tries to update a non-existent item
                // For this test, we focus on the conflict detection part.
                // Depending on strictness, an error from upload phase could also be checked.
            });
        });

        // Test cases for processUploads
        describe('processUploads', () => {
            let mockConnection, response;
            beforeEach(() => {
                mockConnection = {
                    query: jest.fn().mockResolvedValue([[]])
                };
                response = { errors: [], itemsUploaded: 0 };
            });

            it('should call uploadProducts, uploadCustomers, and uploadTransactions if localChanges present', async () => {
                const localChanges = {
                    products: { new: [], updated: [], deleted: [] },
                    customers: { new: [], updated: [], deleted: [] },
                    transactions: { new: [], updated: [], deleted: [] }
                };
                const userId = 1;
                const serverSyncTime = new Date().toISOString();
                // Spy on upload* functions
                const upProducts = jest.spyOn(syncController, 'uploadProducts').mockResolvedValue();
                const upCustomers = jest.spyOn(syncController, 'uploadCustomers').mockResolvedValue();
                const upTransactions = jest.spyOn(syncController, 'uploadTransactions').mockResolvedValue();
                await syncController.processUploads(mockConnection, userId, localChanges, response, serverSyncTime);
                expect(upProducts).toHaveBeenCalled();
                expect(upCustomers).toHaveBeenCalled();
                expect(upTransactions).toHaveBeenCalled();
            });

            it('should handle error and push to response.errors', async () => {
                const localChanges = { products: null, customers: null, transactions: null };
                const userId = 1;
                const serverSyncTime = new Date().toISOString();
                // Force error
                jest.spyOn(syncController, 'uploadProducts').mockImplementation(() => { throw new Error('fail'); });
                await syncController.processUploads(mockConnection, userId, localChanges, response, serverSyncTime);
                expect(response.errors.length).toBeGreaterThan(0);
            });
        });
    });

    describe('uploadProducts', () => {
        let mockConnection, response;
        beforeEach(() => {
            mockConnection = { query: jest.fn().mockResolvedValue([[]]) };
            response = { serverChanges: { products: { new: [] } }, itemsUploaded: 0, errors: [] };
        });
        it('should upload new products and update response', async () => {
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const newProducts = [{ id: 'local-1', nama_produk: 'Produk A' }];
            await syncController.uploadNewProducts(mockConnection, userId, newProducts, response, serverSyncTime);
            expect(response.serverChanges.products.new.length).toBe(1);
            expect(response.itemsUploaded).toBe(1);
            expect(response.errors.length).toBe(0);
        });
        it('should handle error and push to response.errors', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('fail insert'));
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const newProducts = [{ id: 'local-2', nama_produk: 'Produk B' }];
            await syncController.uploadNewProducts(mockConnection, userId, newProducts, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
    });

    describe('uploadUpdatedProducts', () => {
        let mockConnection, response;
        beforeEach(() => {
            mockConnection = { query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]) };
            response = { itemsUploaded: 0, errors: [] };
        });
        it('should update products and increment itemsUploaded', async () => {
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const updatedProducts = [{ nama_produk: 'Produk C', server_id: 10 }];
            await syncController.uploadUpdatedProducts(mockConnection, userId, updatedProducts, response, serverSyncTime);
            expect(response.itemsUploaded).toBe(1);
            expect(response.errors.length).toBe(0);
        });
        it('should push error if no rows affected', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const updatedProducts = [{ nama_produk: 'Produk D', server_id: 11 }];
            await syncController.uploadUpdatedProducts(mockConnection, userId, updatedProducts, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
        it('should handle error and push to response.errors', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('fail update'));
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const updatedProducts = [{ nama_produk: 'Produk E', server_id: 12 }];
            await syncController.uploadUpdatedProducts(mockConnection, userId, updatedProducts, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
    });

    describe('uploadDeletedProducts', () => {
        let mockConnection, response;
        beforeEach(() => {
            mockConnection = { query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]) };
            response = { itemsUploaded: 0, errors: [] };
        });
        it('should soft delete products and increment itemsUploaded', async () => {
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const deletedProductIds = [99];
            await syncController.uploadDeletedProducts(mockConnection, userId, deletedProductIds, response, serverSyncTime);
            expect(response.itemsUploaded).toBe(1);
            expect(response.errors.length).toBe(0);
        });
        it('should push error if no rows affected', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const deletedProductIds = [100];
            await syncController.uploadDeletedProducts(mockConnection, userId, deletedProductIds, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
        it('should handle error and push to response.errors', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('fail delete'));
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const deletedProductIds = [101];
            await syncController.uploadDeletedProducts(mockConnection, userId, deletedProductIds, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
    });

    describe('uploadNewCustomers', () => {
        let mockConnection, response;
        beforeEach(() => {
            mockConnection = { query: jest.fn().mockResolvedValue([{ insertId: 201 }]) };
            response = { serverChanges: { customers: { new: [] } }, itemsUploaded: 0, errors: [] };
        });
        it('should upload new customers and update response', async () => {
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const newCustomers = [{ id: 'local-cust-1', nama_pelanggan: 'Cust A' }];
            await syncController.uploadNewCustomers(mockConnection, userId, newCustomers, response, serverSyncTime);
            expect(response.serverChanges.customers.new.length).toBe(1);
            expect(response.itemsUploaded).toBe(1);
            expect(response.errors.length).toBe(0);
        });
        it('should handle error and push to response.errors', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('fail insert'));
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const newCustomers = [{ id: 'local-cust-2', nama_pelanggan: 'Cust B' }];
            await syncController.uploadNewCustomers(mockConnection, userId, newCustomers, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
    });

    describe('uploadUpdatedCustomers', () => {
        let mockConnection, response;
        beforeEach(() => {
            mockConnection = { query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]) };
            response = { itemsUploaded: 0, errors: [] };
        });
        it('should update customers and increment itemsUploaded', async () => {
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const updatedCustomers = [{ nama_pelanggan: 'Cust C', server_id: 10 }];
            await syncController.uploadUpdatedCustomers(mockConnection, userId, updatedCustomers, response, serverSyncTime);
            expect(response.itemsUploaded).toBe(1);
            expect(response.errors.length).toBe(0);
        });
        it('should push error if no rows affected', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const updatedCustomers = [{ nama_pelanggan: 'Cust D', server_id: 11 }];
            await syncController.uploadUpdatedCustomers(mockConnection, userId, updatedCustomers, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
        it('should handle error and push to response.errors', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('fail update'));
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const updatedCustomers = [{ nama_pelanggan: 'Cust E', server_id: 12 }];
            await syncController.uploadUpdatedCustomers(mockConnection, userId, updatedCustomers, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
    });

    describe('uploadDeletedCustomers', () => {
        let mockConnection, response;
        beforeEach(() => {
            mockConnection = { query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]) };
            response = { itemsUploaded: 0, errors: [] };
        });
        it('should soft delete customers and increment itemsUploaded', async () => {
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const deletedCustomerIds = [99];
            await syncController.uploadDeletedCustomers(mockConnection, userId, deletedCustomerIds, response, serverSyncTime);
            expect(response.itemsUploaded).toBe(1);
            expect(response.errors.length).toBe(0);
        });
        it('should push error if no rows affected', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const deletedCustomerIds = [100];
            await syncController.uploadDeletedCustomers(mockConnection, userId, deletedCustomerIds, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
        it('should handle error and push to response.errors', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('fail delete'));
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const deletedCustomerIds = [101];
            await syncController.uploadDeletedCustomers(mockConnection, userId, deletedCustomerIds, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
    });

    describe('uploadNewTransactions', () => {
        let mockConnection, response;
        beforeEach(() => {
            mockConnection = { query: jest.fn().mockResolvedValue([{ insertId: 301 }]) };
            response = { serverChanges: { transactions: { new: [] } }, itemsUploaded: 0, errors: [] };
        });
        it('should upload new transactions and update response', async () => {
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const newTransactions = [{ id_transaksi_local: 'local-tx-1', total_belanja: 100 }];
            await syncController.uploadNewTransactions(mockConnection, userId, newTransactions, response, serverSyncTime);
            expect(response.serverChanges.transactions.new.length).toBe(1);
            expect(response.itemsUploaded).toBe(1);
            expect(response.errors.length).toBe(0);
        });
        it('should handle error and push to response.errors', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('fail insert'));
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const newTransactions = [{ id_transaksi_local: 'local-tx-2', total_belanja: 200 }];
            await syncController.uploadNewTransactions(mockConnection, userId, newTransactions, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
    });

    describe('uploadUpdatedTransactions', () => {
        let mockConnection, response;
        beforeEach(() => {
            mockConnection = { query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]) };
            response = { itemsUploaded: 0, errors: [] };
        });
        it('should update transactions and increment itemsUploaded', async () => {
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const updatedTransactions = [{ server_id: 10, total_belanja: 150 }];
            await syncController.uploadUpdatedTransactions(mockConnection, userId, updatedTransactions, response, serverSyncTime);
            expect(response.itemsUploaded).toBe(1);
            expect(response.errors.length).toBe(0);
        });
        it('should push error if no rows affected', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const updatedTransactions = [{ server_id: 11, total_belanja: 160 }];
            await syncController.uploadUpdatedTransactions(mockConnection, userId, updatedTransactions, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
        it('should handle error and push to response.errors', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('fail update'));
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const updatedTransactions = [{ server_id: 12, total_belanja: 170 }];
            await syncController.uploadUpdatedTransactions(mockConnection, userId, updatedTransactions, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
    });

    describe('uploadDeletedTransactions', () => {
        let mockConnection, response;
        beforeEach(() => {
            mockConnection = { query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]) };
            response = { itemsUploaded: 0, errors: [] };
        });
        it('should soft delete transactions and increment itemsUploaded', async () => {
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const deletedTransactions = [{ server_id: 99 }];
            await syncController.uploadDeletedTransactions(mockConnection, userId, deletedTransactions, response, serverSyncTime);
            expect(response.itemsUploaded).toBe(1);
            expect(response.errors.length).toBe(0);
        });
        it('should push error if no rows affected', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const deletedTransactions = [{ server_id: 100 }];
            await syncController.uploadDeletedTransactions(mockConnection, userId, deletedTransactions, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
        it('should handle error and push to response.errors', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('fail delete'));
            const userId = 1;
            const serverSyncTime = new Date().toISOString();
            const deletedTransactions = [{ server_id: 101 }];
            await syncController.uploadDeletedTransactions(mockConnection, userId, deletedTransactions, response, serverSyncTime);
            expect(response.errors.length).toBe(1);
        });
    });
});

// Helper functions for conflict assertions (extracted to top-level to avoid deep nesting)
function assertProductConflict(conflicts, expected) {
    const productConflict = conflicts.find(c => c.type === 'product');
    expect(productConflict).toEqual(expect.objectContaining(expected));
}

function assertTransactionConflict(conflicts, expected) {
    const transactionConflict = conflicts.find(c => c.type === 'transaction');
    expect(transactionConflict).toEqual(expect.objectContaining(expected));
}

// Endpoint handler tests for coverage

describe('Sync Controller Endpoint Handlers', () => {
    let req, res;
    beforeEach(() => {
        req = { userId: 1, body: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    it('getSyncStatus should return sync status (mocked DB, count)', async () => {
        req.userId = 1;
        const db = require('../config/db.config.js');
        db.query = jest.fn().mockResolvedValue([[{ count: 1 }]]);
        await syncController.getSyncStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('forceFullSync should trigger full sync (mocked DB)', async () => {
        req.userId = 1;
        const db = require('../config/db.config.js');
        db.query = jest.fn().mockResolvedValue([[{ affectedRows: 1 }]]);
        await syncController.forceFullSync(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('getDataSummary should return data summary (mocked DB)', async () => {
        req.userId = 1;
        const db = require('../config/db.config.js');
        db.query = jest.fn().mockResolvedValue([[{ total: 10 }]]);
        await syncController.getDataSummary(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('backupUserData should backup user data (mocked DB)', async () => {
        req.userId = 1;
        const db = require('../config/db.config.js');
        db.query = jest.fn().mockResolvedValue([[{ backup: 'ok' }]]);
        await syncController.backupUserData(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('resolveConflicts should resolve conflicts (mocked DB)', async () => {
        req.userId = 1;
        req.body.conflicts = [];
        const db = require('../config/db.config.js');
        db.getConnection = jest.fn().mockResolvedValue({
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
            query: jest.fn().mockResolvedValue([[]])
        });
        await syncController.resolveConflicts(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('getSyncMetrics should return sync metrics (mocked DB)', async () => {
        req.userId = 1;
        req.query.days = 7;
        const db = require('../config/db.config.js');
        db.getConnection = jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue([[]]),
            release: jest.fn()
        });
        await syncController.getSyncMetrics(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('synchronizeUploadOnly should handle upload only (mocked DB)', async () => {
        req.userId = 1;
        req.body = { clientLastSyncTime: '2024-01-01T00:00:00.000Z', localChanges: { products: { new: [], updated: [], deleted: [] }, customers: { new: [], updated: [], deleted: [] }, transactions: { new: [], updated: [], deleted: [] } } };
        const db = require('../config/db.config.js');
        db.getConnection = jest.fn().mockResolvedValue({
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
            query: jest.fn().mockResolvedValue([[]])
        });
        await syncController.synchronizeUploadOnly(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('synchronizeDownloadOnly should handle download only (mocked DB, full connection)', async () => {
        req.userId = 1;
        req.body = { clientLastSyncTime: '2024-01-01T00:00:00.000Z' };
        const db = require('../config/db.config.js');
        db.getConnection = jest.fn().mockResolvedValue({
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
            query: jest.fn().mockResolvedValue([[]])
        });
        await syncController.synchronizeDownloadOnly(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    // Error/edge case for one handler as example
    it('getSyncStatus should handle error', async () => {
        req.userId = 1;
        const db = require('../config/db.config.js');
        db.query = jest.fn().mockRejectedValue(new Error('fail'));
        await syncController.getSyncStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
});

describe('Sync Controller Helper Functions', () => {
    const { 
        analyzeProductFieldConflicts,
        analyzeCustomerFieldConflicts,
        analyzeTransactionFieldConflicts,
        createProductConflictRecord,
        addMissingProductConflict,
        addMissingCustomerConflict,
        addMissingTransactionConflict,
        hasTimestampConflict,
        resolveProductConflicts
    } = syncController;

    it('analyzeProductFieldConflicts should detect all field differences', () => {
        const server = { nama_produk: 'A', kode_produk: 'K1', jumlah_produk: 5, harga_modal: 10, harga_jual: 20 };
        const local = { nama_produk: 'B', kode_produk: 'K2', jumlah_produk: 7, harga_modal: 11, harga_jual: 21 };
        const result = analyzeProductFieldConflicts(server, local);
        expect(result.length).toBeGreaterThanOrEqual(5);
    });
    it('analyzeCustomerFieldConflicts should detect name/phone differences', () => {
        const server = { nama_pelanggan: 'A', nomor_telepon: '1' };
        const local = { nama_pelanggan: 'B', nomor_telepon: '2' };
        const result = analyzeCustomerFieldConflicts(server, local);
        expect(result.length).toBe(2);
    });
    it('analyzeTransactionFieldConflicts should detect value differences', () => {
        const server = { total_belanja: 100, status_pembayaran: 'paid' };
        const local = { total_belanja: 200, status_pembayaran: 'unpaid' };
        const result = analyzeTransactionFieldConflicts(server, local);
        expect(result.length).toBe(2);
    });
    it('createProductConflictRecord returns correct structure', () => {
        const rec = createProductConflictRecord(
            { id: 'local', server_id: 1, updated_at: new Date().toISOString() },
            { id: 1, updated_at: new Date().toISOString() },
            [{ field: 'nama_produk', serverValue: 'A', localValue: 'B' }],
            'manual',
            { id: 1 }
        );
        expect(rec).toHaveProperty('type', 'product');
        expect(rec).toHaveProperty('conflictType', 'data_mismatch');
        expect(rec).toHaveProperty('conflicts');
    });
    it('addMissingProductConflict adds conflict to response', () => {
        const response = { conflicts: [] };
        addMissingProductConflict(response, { id: 'local', server_id: 1 });
        expect(response.conflicts.length).toBe(1);
        expect(response.conflicts[0]).toHaveProperty('conflictType', 'missing_on_server');
    });
    it('addMissingCustomerConflict adds conflict to response', () => {
        const response = { conflicts: [] };
        addMissingCustomerConflict(response, { id: 'local', server_id: 2 });
        expect(response.conflicts.length).toBe(1);
        expect(response.conflicts[0]).toHaveProperty('conflictType', 'missing_on_server');
    });
    it('addMissingTransactionConflict adds conflict to response', () => {
        const response = { conflicts: [] };
        addMissingTransactionConflict(response, { id: 'local', server_id: 3 });
        expect(response.conflicts.length).toBe(1);
        expect(response.conflicts[0]).toHaveProperty('conflictType', 'missing_on_server');
    });
    it('hasTimestampConflict returns true for >5s diff', () => {
        const now = new Date();
        const old = new Date(now.getTime() - 10000);
        expect(hasTimestampConflict(now, old)).toBe(true);
    });
    it('hasTimestampConflict returns false for <5s diff', () => {
        const now = new Date();
        const close = new Date(now.getTime() - 2000);
        expect(hasTimestampConflict(now, close)).toBe(false);
    });
    it('resolveProductConflicts returns auto_sum_stock for jumlah_produk', () => {
        const conflicts = [{ field: 'jumlah_produk', autoResolve: 'sum' }];
        const server = { jumlah_produk: 2, updated_at: new Date().toISOString() };
        const local = { jumlah_produk: 3, updated_at: new Date().toISOString() };
        const result = resolveProductConflicts(conflicts, server, local);
        expect(result.resolutionStrategy).toMatch(/sum/);
    });
    it('resolveProductConflicts returns auto_latest_wins for latest', () => {
        const conflicts = [{ field: 'harga_jual', autoResolve: 'latest' }];
        const server = { harga_jual: 10, updated_at: new Date().toISOString() };
        const local = { harga_jual: 20, updated_at: new Date(Date.now() + 10000).toISOString() };
        const result = resolveProductConflicts(conflicts, server, local);
        expect(result.resolutionStrategy).toMatch(/latest/);
    });
});
