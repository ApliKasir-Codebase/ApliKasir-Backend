// controllers/sync.controller.js
const db = require("../config/db.config.js");

/**
 * Main synchronization endpoint for bidirectional data sync
 * Enhanced with performance monitoring and detailed logging
 */
exports.synchronize = async (req, res) => {
    const userId = req.userId;
    const { clientLastSyncTime, localChanges } = req.body;
    const startTime = Date.now();
    
    console.log(`=== SYNC START === User ${userId} at ${new Date().toISOString()}`);
    console.log(`Client last sync: ${clientLastSyncTime}`);
    console.log(`Local changes summary:`, {
        products: {
            new: localChanges?.products?.new?.length || 0,
            updated: localChanges?.products?.updated?.length || 0,
            deleted: localChanges?.products?.deleted?.length || 0
        },
        customers: {
            new: localChanges?.customers?.new?.length || 0,
            updated: localChanges?.customers?.updated?.length || 0,
            deleted: localChanges?.customers?.deleted?.length || 0
        },
        transactions: {
            new: localChanges?.transactions?.new?.length || 0,
            updated: localChanges?.transactions?.updated?.length || 0,
            deleted: localChanges?.transactions?.deleted?.length || 0
        }
    });

    let connection;
    let logId;
    const serverSyncTime = new Date();
    const performanceMetrics = {
        uploadTime: 0,
        downloadTime: 0,
        conflictDetectionTime: 0,
        totalItems: 0,
        memoryUsage: process.memoryUsage()
    };
    
    const response = {
        success: false,
        serverSyncTime: serverSyncTime.toISOString(),
        itemsUploaded: 0,
        itemsDownloaded: 0,
        serverChanges: {
            products: { new: [], updated: [], deleted: [] },
            customers: { new: [], updated: [], deleted: [] },
            transactions: { new: [], updated: [], deleted: [] }
        },
        conflicts: [],
        errors: [],
        performanceMetrics: performanceMetrics
    };

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();        // Create enhanced sync log
        const logSql = `INSERT INTO sync_logs (user_id, sync_start_time, direction, status, client_last_sync_time) VALUES (?, ?, ?, ?, ?)`;
        const [logResult] = await connection.query(logSql, [
            userId, 
            serverSyncTime, 
            'Bidirectional', 
            'In Progress', 
            clientLastSyncTime ? new Date(clientLastSyncTime) : null
        ]);
        logId = logResult.insertId;

        // =============================================================
        // PHASE 1: UPLOAD - Process client changes to server
        // =============================================================
        console.log("=== UPLOAD PHASE START ===");
        const uploadStartTime = Date.now();
        await processUploads(connection, userId, localChanges, response, serverSyncTime);
        performanceMetrics.uploadTime = Date.now() - uploadStartTime;
        console.log(`Upload phase completed in ${performanceMetrics.uploadTime}ms`);

        // =============================================================
        // PHASE 2: DOWNLOAD - Get server changes for client
        // =============================================================
        console.log("=== DOWNLOAD PHASE START ===");
        const downloadStartTime = Date.now();
        await processDownloads(connection, userId, clientLastSyncTime, response);
        performanceMetrics.downloadTime = Date.now() - downloadStartTime;
        console.log(`Download phase completed in ${performanceMetrics.downloadTime}ms`);

        // =============================================================
        // PHASE 3: CONFLICT RESOLUTION
        // =============================================================
        console.log("=== CONFLICT RESOLUTION START ===");
        const conflictStartTime = Date.now();
        await detectConflicts(connection, userId, localChanges, response);
        performanceMetrics.conflictDetectionTime = Date.now() - conflictStartTime;
        console.log(`Conflict detection completed in ${performanceMetrics.conflictDetectionTime}ms`);        // Update user's last sync time
        await connection.query(
            'UPDATE users SET last_sync_time = ? WHERE id = ?',
            [serverSyncTime, userId]
        );

        // Calculate total performance metrics
        performanceMetrics.totalItems = response.itemsUploaded + response.itemsDownloaded;
        performanceMetrics.totalTime = Date.now() - startTime;
        performanceMetrics.throughput = performanceMetrics.totalItems / (performanceMetrics.totalTime / 1000); // items per second
        performanceMetrics.memoryUsageAfter = process.memoryUsage();
        performanceMetrics.memoryDelta = {
            rss: performanceMetrics.memoryUsageAfter.rss - performanceMetrics.memoryUsage.rss,
            heapUsed: performanceMetrics.memoryUsageAfter.heapUsed - performanceMetrics.memoryUsage.heapUsed,
            heapTotal: performanceMetrics.memoryUsageAfter.heapTotal - performanceMetrics.memoryUsage.heapTotal
        };        // Update sync log with detailed success information
        const syncSummary = {
            products: {
                new: response.serverChanges.products.new.length,
                updated: response.serverChanges.products.updated.length,
                deleted: response.serverChanges.products.deleted.length
            },
            customers: {
                new: response.serverChanges.customers.new.length,
                updated: response.serverChanges.customers.updated.length,
                deleted: response.serverChanges.customers.deleted.length
            },
            transactions: {
                new: response.serverChanges.transactions.new.length,
                updated: response.serverChanges.transactions.updated.length,
                deleted: response.serverChanges.transactions.deleted.length
            }
        };
        
        await connection.query(
            `UPDATE sync_logs SET 
                sync_end_time = ?, 
                status = ?, 
                items_uploaded = ?, 
                items_downloaded = ?, 
                server_sync_time = ?,
                details = ?
            WHERE id = ?`,
            [
                new Date(),
                response.errors.length > 0 ? 'Partial Success' : 'Success',
                response.itemsUploaded,
                response.itemsDownloaded,
                serverSyncTime,
                JSON.stringify({
                    conflicts: response.conflicts.length,
                    errors: response.errors.length,
                    performance: performanceMetrics,
                    summary: syncSummary
                }),
                logId
            ]
        );

        await connection.commit();
        response.success = true;

        console.log(`=== SYNC COMPLETED === User ${userId}`);
        console.log(`Performance: ${performanceMetrics.totalTime}ms total, ${performanceMetrics.throughput.toFixed(2)} items/sec`);
        console.log(`Uploaded: ${response.itemsUploaded}, Downloaded: ${response.itemsDownloaded}, Conflicts: ${response.conflicts.length}`);
        
        res.status(200).json(response);

    } catch (error) {
        console.error(`=== SYNC FAILED === User ${userId}:`, error);
          if (connection) {
            try {
                await connection.rollback();                if (logId) {
                    await connection.query(
                        'UPDATE sync_logs SET sync_end_time = ?, status = ?, error_message = ? WHERE id = ?',
                        [new Date(), 'Failed', error.message, logId]
                    );
                }
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
        }

        response.errors.push(`Sync failed: ${error.message}`);
        res.status(500).json(response);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Process uploads from client to server
 */
async function processUploads(connection, userId, localChanges, response, serverSyncTime) {
    try {
        // Upload Products
        if (localChanges?.products) {
            await uploadProducts(connection, userId, localChanges.products, response, serverSyncTime);
        }

        // Upload Customers  
        if (localChanges?.customers) {
            await uploadCustomers(connection, userId, localChanges.customers, response, serverSyncTime);
        }

        // Upload Transactions
        if (localChanges?.transactions) {
            await uploadTransactions(connection, userId, localChanges.transactions, response, serverSyncTime);
        }

    } catch (error) {
        console.error('Upload processing error:', error);
        response.errors.push(`Upload error: ${error.message}`);
    }
}

/**
 * Upload products to server
 */
async function uploadProducts(connection, userId, productChanges, response, serverSyncTime) {
    // Handle new products
    if (productChanges.new?.length > 0) {
        console.log(`Uploading ${productChanges.new.length} new products...`);
        
        for (const product of productChanges.new) {
            try {
                const sql = `INSERT INTO products (user_id, nama_produk, kode_produk, jumlah_produk, harga_modal, harga_jual, gambar_produk, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                const [result] = await connection.query(sql, [
                    userId,
                    product.nama_produk,
                    product.kode_produk, 
                    product.jumlah_produk,
                    product.harga_modal,
                    product.harga_jual,
                    product.gambar_produk,
                    product.created_at ? new Date(product.created_at) : serverSyncTime,
                    product.updated_at ? new Date(product.updated_at) : serverSyncTime
                ]);

                // Return server ID to client for mapping
                response.serverChanges.products.new.push({
                    localId: product.id,
                    serverId: result.insertId,
                    nama_produk: product.nama_produk
                });

                response.itemsUploaded++;
                
            } catch (error) {
                console.error(`Error uploading product ${product.nama_produk}:`, error);
                response.errors.push(`Failed to upload product: ${product.nama_produk} - ${error.message}`);
            }
        }
    }

    // Handle updated products
    if (productChanges.updated?.length > 0) {
        console.log(`Uploading ${productChanges.updated.length} updated products...`);
        
        for (const product of productChanges.updated) {
            try {
                const sql = `UPDATE products SET nama_produk = ?, kode_produk = ?, jumlah_produk = ?, harga_modal = ?, harga_jual = ?, gambar_produk = ?, updated_at = ? WHERE id = ? AND user_id = ?`;
                
                const [result] = await connection.query(sql, [
                    product.nama_produk,
                    product.kode_produk,
                    product.jumlah_produk, 
                    product.harga_modal,
                    product.harga_jual,
                    product.gambar_produk,
                    product.updated_at ? new Date(product.updated_at) : serverSyncTime,
                    product.server_id,
                    userId
                ]);

                if (result.affectedRows > 0) {
                    response.itemsUploaded++;
                } else {
                    response.errors.push(`Product not found or not owned: ${product.nama_produk}`);
                }
                
            } catch (error) {
                console.error(`Error updating product ${product.nama_produk}:`, error);
                response.errors.push(`Failed to update product: ${product.nama_produk} - ${error.message}`);
            }
        }
    }

    // Handle deleted products (soft delete)
    if (productChanges.deleted?.length > 0) {
        console.log(`Deleting ${productChanges.deleted.length} products...`);
        
        for (const productId of productChanges.deleted) {
            try {
                const sql = `UPDATE products SET deleted_at = ? WHERE id = ? AND user_id = ?`;
                const [result] = await connection.query(sql, [serverSyncTime, productId, userId]);

                if (result.affectedRows > 0) {
                    response.itemsUploaded++;
                } else {
                    response.errors.push(`Product not found for deletion: ID ${productId}`);
                }
                
            } catch (error) {
                console.error(`Error deleting product ${productId}:`, error);
                response.errors.push(`Failed to delete product: ID ${productId} - ${error.message}`);
            }
        }
    }
}

/**
 * Upload customers to server
 */
async function uploadCustomers(connection, userId, customerChanges, response, serverSyncTime) {
    // Handle new customers
    if (customerChanges.new?.length > 0) {
        console.log(`Uploading ${customerChanges.new.length} new customers...`);
        
        for (const customer of customerChanges.new) {
            try {
                const sql = `INSERT INTO customers (user_id, nama_pelanggan, nomor_telepon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`;
                
                const [result] = await connection.query(sql, [
                    userId,
                    customer.nama_pelanggan,
                    customer.nomor_telepon,
                    customer.created_at ? new Date(customer.created_at) : serverSyncTime,
                    customer.updated_at ? new Date(customer.updated_at) : serverSyncTime
                ]);

                response.serverChanges.customers.new.push({
                    localId: customer.id,
                    serverId: result.insertId,
                    nama_pelanggan: customer.nama_pelanggan
                });

                response.itemsUploaded++;
                
            } catch (error) {
                console.error(`Error uploading customer ${customer.nama_pelanggan}:`, error);
                response.errors.push(`Failed to upload customer: ${customer.nama_pelanggan} - ${error.message}`);
            }
        }
    }

    // Handle updated customers
    if (customerChanges.updated?.length > 0) {
        console.log(`Uploading ${customerChanges.updated.length} updated customers...`);
        
        for (const customer of customerChanges.updated) {
            try {
                const sql = `UPDATE customers SET nama_pelanggan = ?, nomor_telepon = ?, updated_at = ? WHERE id = ? AND user_id = ?`;
                
                const [result] = await connection.query(sql, [
                    customer.nama_pelanggan,
                    customer.nomor_telepon,
                    customer.updated_at ? new Date(customer.updated_at) : serverSyncTime,
                    customer.server_id,
                    userId
                ]);

                if (result.affectedRows > 0) {
                    response.itemsUploaded++;
                } else {
                    response.errors.push(`Customer not found or not owned: ${customer.nama_pelanggan}`);
                }
                
            } catch (error) {
                console.error(`Error updating customer ${customer.nama_pelanggan}:`, error);
                response.errors.push(`Failed to update customer: ${customer.nama_pelanggan} - ${error.message}`);
            }
        }
    }

    // Handle deleted customers
    if (customerChanges.deleted?.length > 0) {
        console.log(`Deleting ${customerChanges.deleted.length} customers...`);
        
        for (const customerId of customerChanges.deleted) {
            try {
                const sql = `UPDATE customers SET deleted_at = ? WHERE id = ? AND user_id = ?`;
                const [result] = await connection.query(sql, [serverSyncTime, customerId, userId]);

                if (result.affectedRows > 0) {
                    response.itemsUploaded++;
                }
                
            } catch (error) {
                console.error(`Error deleting customer ${customerId}:`, error);
                response.errors.push(`Failed to delete customer: ID ${customerId} - ${error.message}`);
            }
        }
    }
}

/**
 * Upload transactions to server  
 */
async function uploadTransactions(connection, userId, transactionChanges, response, serverSyncTime) {
    // Handle new transactions
    if (transactionChanges.new?.length > 0) {
        console.log(`Uploading ${transactionChanges.new.length} new transactions...`);
        
        for (const transaction of transactionChanges.new) {
            try {
                // Map local customer ID to server customer ID if needed
                let serverCustomerId = transaction.id_pelanggan;
                if (transaction.id_pelanggan) {
                    const [customerResult] = await connection.query(
                        'SELECT id FROM customers WHERE user_id = ? AND id = ?',
                        [userId, transaction.id_pelanggan]
                    );
                    serverCustomerId = customerResult.length > 0 ? customerResult[0].id : null;
                }

                const sql = `INSERT INTO transactions (user_id, tanggal_transaksi, total_belanja, total_modal, metode_pembayaran, status_pembayaran, id_pelanggan, detail_items, jumlah_bayar, jumlah_kembali, id_transaksi_hutang, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                const [result] = await connection.query(sql, [
                    userId,
                    new Date(transaction.tanggal_transaksi),
                    transaction.total_belanja,
                    transaction.total_modal,
                    transaction.metode_pembayaran,
                    transaction.status_pembayaran,
                    serverCustomerId,
                    JSON.stringify(transaction.detail_items),
                    transaction.jumlah_bayar,
                    transaction.jumlah_kembali,
                    transaction.id_transaksi_hutang,
                    transaction.created_at ? new Date(transaction.created_at) : serverSyncTime,
                    transaction.updated_at ? new Date(transaction.updated_at) : serverSyncTime
                ]);

                response.serverChanges.transactions.new.push({
                    localId: transaction.id,
                    serverId: result.insertId,
                    tanggal_transaksi: transaction.tanggal_transaksi
                });

                response.itemsUploaded++;
                
            } catch (error) {
                console.error(`Error uploading transaction:`, error);
                response.errors.push(`Failed to upload transaction: ${error.message}`);
            }
        }
    }

    // Handle updated transactions
    if (transactionChanges.updated?.length > 0) {
        console.log(`Uploading ${transactionChanges.updated.length} updated transactions...`);
        
        for (const transaction of transactionChanges.updated) {
            try {
                const sql = `UPDATE transactions SET status_pembayaran = ?, jumlah_bayar = ?, jumlah_kembali = ?, updated_at = ? WHERE id = ? AND user_id = ?`;
                
                const [result] = await connection.query(sql, [
                    transaction.status_pembayaran,
                    transaction.jumlah_bayar,
                    transaction.jumlah_kembali,
                    transaction.updated_at ? new Date(transaction.updated_at) : serverSyncTime,
                    transaction.server_id,
                    userId
                ]);

                if (result.affectedRows > 0) {
                    response.itemsUploaded++;
                }
                
            } catch (error) {
                console.error(`Error updating transaction:`, error);
                response.errors.push(`Failed to update transaction: ${error.message}`);
            }
        }
    }

    // Handle deleted transactions
    if (transactionChanges.deleted?.length > 0) {
        console.log(`Deleting ${transactionChanges.deleted.length} transactions...`);
        
        for (const transactionId of transactionChanges.deleted) {
            try {
                const sql = `UPDATE transactions SET deleted_at = ? WHERE id = ? AND user_id = ?`;
                const [result] = await connection.query(sql, [serverSyncTime, transactionId, userId]);

                if (result.affectedRows > 0) {
                    response.itemsUploaded++;
                }
                
            } catch (error) {
                console.error(`Error deleting transaction ${transactionId}:`, error);
                response.errors.push(`Failed to delete transaction: ID ${transactionId} - ${error.message}`);
            }
        }
    }
}

/**
 * Get server changes to download to client
 */
async function processDownloads(connection, userId, clientLastSyncTime, response) {
    const lastSync = clientLastSyncTime ? new Date(clientLastSyncTime) : new Date(0);
    
    try {
        // Get updated products from server
        const [products] = await connection.query(`
            SELECT id, nama_produk, kode_produk, jumlah_produk, harga_modal, harga_jual, 
                   gambar_produk, created_at, updated_at, deleted_at
            FROM products 
            WHERE user_id = ? AND updated_at > ?
            ORDER BY updated_at ASC
        `, [userId, lastSync]);

        products.forEach(product => {
            if (product.deleted_at) {
                response.serverChanges.products.deleted.push(product.id);
            } else if (product.created_at > lastSync) {
                response.serverChanges.products.new.push(product);
            } else {
                response.serverChanges.products.updated.push(product);
            }
            response.itemsDownloaded++;
        });

        // Get updated customers from server
        const [customers] = await connection.query(`
            SELECT id, nama_pelanggan, nomor_telepon, created_at, updated_at, deleted_at
            FROM customers 
            WHERE user_id = ? AND updated_at > ?
            ORDER BY updated_at ASC
        `, [userId, lastSync]);

        customers.forEach(customer => {
            if (customer.deleted_at) {
                response.serverChanges.customers.deleted.push(customer.id);
            } else if (customer.created_at > lastSync) {
                response.serverChanges.customers.new.push(customer);
            } else {
                response.serverChanges.customers.updated.push(customer);
            }
            response.itemsDownloaded++;
        });

        // Get updated transactions from server
        const [transactions] = await connection.query(`
            SELECT id, tanggal_transaksi, total_belanja, total_modal, metode_pembayaran, 
                   status_pembayaran, id_pelanggan, detail_items, jumlah_bayar, jumlah_kembali, 
                   id_transaksi_hutang, created_at, updated_at, deleted_at
            FROM transactions 
            WHERE user_id = ? AND updated_at > ?
            ORDER BY updated_at ASC
        `, [userId, lastSync]);

        transactions.forEach(transaction => {
            if (transaction.deleted_at) {
                response.serverChanges.transactions.deleted.push(transaction.id);
            } else if (transaction.created_at > lastSync) {
                response.serverChanges.transactions.new.push(transaction);
            } else {
                response.serverChanges.transactions.updated.push(transaction);
            }
            response.itemsDownloaded++;
        });

        console.log(`Downloaded ${response.itemsDownloaded} items for user ${userId}`);
        
    } catch (error) {
        console.error('Download processing error:', error);
        response.errors.push(`Download error: ${error.message}`);
    }
}

/**
 * Detect and handle conflicts between local and server data
 * Enhanced conflict resolution with multiple strategies
 */
async function detectConflicts(connection, userId, localChanges, response) {
    try {
        console.log("Starting enhanced conflict detection...");
        
        // Check for conflicts in updated products
        if (localChanges?.products?.updated?.length > 0) {
            await detectProductConflicts(connection, userId, localChanges.products.updated, response);
        }
        
        // Check for conflicts in updated customers
        if (localChanges?.customers?.updated?.length > 0) {
            await detectCustomerConflicts(connection, userId, localChanges.customers.updated, response);
        }
        
        // Check for conflicts in updated transactions
        if (localChanges?.transactions?.updated?.length > 0) {
            await detectTransactionConflicts(connection, userId, localChanges.transactions.updated, response);
        }
        
        console.log(`Conflict detection completed. Found ${response.conflicts.length} conflicts.`);
        
    } catch (error) {
        console.error('Enhanced conflict detection error:', error);
        response.errors.push(`Conflict detection error: ${error.message}`);
    }
}

/**
 * Detect product conflicts with sophisticated resolution strategies
 */
async function detectProductConflicts(connection, userId, localProducts, response) {
    for (const localProduct of localProducts) {
        try {
            const [serverProducts] = await connection.query(
                'SELECT id, nama_produk, kode_produk, jumlah_produk, harga_modal, harga_jual, updated_at, created_at FROM products WHERE id = ? AND user_id = ?',
                [localProduct.server_id, userId]
            );
            
            if (serverProducts.length === 0) {
                response.conflicts.push({
                    type: 'product',
                    conflictType: 'missing_on_server',
                    id: localProduct.server_id,
                    localId: localProduct.id,
                    message: 'Product was deleted on server but updated locally',
                    resolution: 'recreate_on_server',
                    localData: localProduct,
                    timestamp: new Date().toISOString()
                });
                continue;
            }
            
            const serverProduct = serverProducts[0];
            const serverUpdatedAt = new Date(serverProduct.updated_at);
            const localUpdatedAt = new Date(localProduct.updated_at);
            
            // Check if there's a real conflict (both modified after last sync)
            if (Math.abs(serverUpdatedAt - localUpdatedAt) > 5000) { // 5 second tolerance for timestamp differences
                
                // Analyze the type of conflict
                const conflicts = [];
                
                if (serverProduct.nama_produk !== localProduct.nama_produk) {
                    conflicts.push({
                        field: 'nama_produk',
                        serverValue: serverProduct.nama_produk,
                        localValue: localProduct.nama_produk
                    });
                }
                
                if (serverProduct.kode_produk !== localProduct.kode_produk) {
                    conflicts.push({
                        field: 'kode_produk',
                        serverValue: serverProduct.kode_produk,
                        localValue: localProduct.kode_produk
                    });
                }
                
                if (serverProduct.jumlah_produk !== localProduct.jumlah_produk) {
                    conflicts.push({
                        field: 'jumlah_produk',
                        serverValue: serverProduct.jumlah_produk,
                        localValue: localProduct.jumlah_produk,
                        autoResolve: 'sum' // Automatically sum stock quantities
                    });
                }
                
                if (Math.abs(serverProduct.harga_jual - localProduct.harga_jual) > 0.01) {
                    conflicts.push({
                        field: 'harga_jual',
                        serverValue: serverProduct.harga_jual,
                        localValue: localProduct.harga_jual,
                        autoResolve: 'latest' // Use latest timestamp
                    });
                }
                
                if (Math.abs(serverProduct.harga_modal - localProduct.harga_modal) > 0.01) {
                    conflicts.push({
                        field: 'harga_modal',
                        serverValue: serverProduct.harga_modal,
                        localValue: localProduct.harga_modal,
                        autoResolve: 'latest'
                    });
                }
                
                if (conflicts.length > 0) {
                    // Determine resolution strategy
                    let resolutionStrategy = 'manual';
                    let resolvedData = { ...serverProduct };
                    
                    // Auto-resolve some conflicts
                    for (const conflict of conflicts) {
                        if (conflict.autoResolve === 'sum' && conflict.field === 'jumlah_produk') {
                            resolvedData.jumlah_produk = serverProduct.jumlah_produk + localProduct.jumlah_produk;
                            resolutionStrategy = 'auto_sum_stock';
                        } else if (conflict.autoResolve === 'latest') {
                            if (localUpdatedAt > serverUpdatedAt) {
                                resolvedData[conflict.field] = localProduct[conflict.field];
                            }
                            resolutionStrategy = 'auto_latest_wins';
                        }
                    }
                    
                    response.conflicts.push({
                        type: 'product',
                        conflictType: 'data_mismatch',
                        id: localProduct.server_id,
                        localId: localProduct.id,
                        message: `Product data conflicts detected in ${conflicts.length} field(s)`,
                        conflicts: conflicts,
                        resolution: resolutionStrategy,
                        serverUpdatedAt: serverUpdatedAt.toISOString(),
                        localUpdatedAt: localUpdatedAt.toISOString(),
                        serverData: serverProduct,
                        localData: localProduct,
                        resolvedData: resolutionStrategy.startsWith('auto') ? resolvedData : null,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Apply auto-resolution if possible
                    if (resolutionStrategy.startsWith('auto')) {
                        try {
                            await connection.query(
                                'UPDATE products SET nama_produk = ?, kode_produk = ?, jumlah_produk = ?, harga_modal = ?, harga_jual = ?, updated_at = ? WHERE id = ? AND user_id = ?',
                                [
                                    resolvedData.nama_produk,
                                    resolvedData.kode_produk,
                                    resolvedData.jumlah_produk,
                                    resolvedData.harga_modal,
                                    resolvedData.harga_jual,
                                    new Date(),
                                    localProduct.server_id,
                                    userId
                                ]
                            );
                            
                            console.log(`Auto-resolved product conflict for ID ${localProduct.server_id} using ${resolutionStrategy}`);
                        } catch (autoResolveError) {
                            console.error(`Failed to auto-resolve product conflict:`, autoResolveError);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error(`Error detecting conflict for product ${localProduct.server_id}:`, error);
            response.errors.push(`Product conflict detection error: ${error.message}`);
        }
    }
}

/**
 * Detect customer conflicts
 */
async function detectCustomerConflicts(connection, userId, localCustomers, response) {
    for (const localCustomer of localCustomers) {
        try {
            const [serverCustomers] = await connection.query(
                'SELECT id, nama_pelanggan, nomor_telepon, updated_at FROM customers WHERE id = ? AND user_id = ?',
                [localCustomer.server_id, userId]
            );
            
            if (serverCustomers.length === 0) {
                response.conflicts.push({
                    type: 'customer',
                    conflictType: 'missing_on_server',
                    id: localCustomer.server_id,
                    localId: localCustomer.id,
                    message: 'Customer was deleted on server but updated locally',
                    resolution: 'recreate_on_server',
                    localData: localCustomer,
                    timestamp: new Date().toISOString()
                });
                continue;
            }
            
            const serverCustomer = serverCustomers[0];
            const serverUpdatedAt = new Date(serverCustomer.updated_at);
            const localUpdatedAt = new Date(localCustomer.updated_at);
            
            if (Math.abs(serverUpdatedAt - localUpdatedAt) > 5000) {
                const conflicts = [];
                
                if (serverCustomer.nama_pelanggan !== localCustomer.nama_pelanggan) {
                    conflicts.push({
                        field: 'nama_pelanggan',
                        serverValue: serverCustomer.nama_pelanggan,
                        localValue: localCustomer.nama_pelanggan
                    });
                }
                
                if (serverCustomer.nomor_telepon !== localCustomer.nomor_telepon) {
                    conflicts.push({
                        field: 'nomor_telepon',
                        serverValue: serverCustomer.nomor_telepon,
                        localValue: localCustomer.nomor_telepon
                    });
                }
                
                if (conflicts.length > 0) {
                    response.conflicts.push({
                        type: 'customer',
                        conflictType: 'data_mismatch',
                        id: localCustomer.server_id,
                        localId: localCustomer.id,
                        message: `Customer data conflicts detected in ${conflicts.length} field(s)`,
                        conflicts: conflicts,
                        resolution: 'manual',
                        serverUpdatedAt: serverUpdatedAt.toISOString(),
                        localUpdatedAt: localUpdatedAt.toISOString(),
                        serverData: serverCustomer,
                        localData: localCustomer,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
        } catch (error) {
            console.error(`Error detecting conflict for customer ${localCustomer.server_id}:`, error);
            response.errors.push(`Customer conflict detection error: ${error.message}`);
        }
    }
}

/**
 * Detect transaction conflicts
 */
async function detectTransactionConflicts(connection, userId, localTransactions, response) {
    for (const localTransaction of localTransactions) {
        try {
            const [serverTransactions] = await connection.query(
                'SELECT id, total_belanja, status_pembayaran, metode_pembayaran, updated_at FROM transactions WHERE id = ? AND user_id = ?',
                [localTransaction.server_id, userId]
            );
            
            if (serverTransactions.length === 0) {
                response.conflicts.push({
                    type: 'transaction',
                    conflictType: 'missing_on_server',
                    id: localTransaction.server_id,
                    localId: localTransaction.id,
                    message: 'Transaction was deleted on server but updated locally',
                    resolution: 'manual_review',
                    localData: localTransaction,
                    timestamp: new Date().toISOString()
                });
                continue;
            }
            
            const serverTransaction = serverTransactions[0];
            const serverUpdatedAt = new Date(serverTransaction.updated_at);
            const localUpdatedAt = new Date(localTransaction.updated_at);
            
            if (Math.abs(serverUpdatedAt - localUpdatedAt) > 5000) {
                const conflicts = [];
                
                if (Math.abs(serverTransaction.total_belanja - localTransaction.total_belanja) > 0.01) {
                    conflicts.push({
                        field: 'total_belanja',
                        serverValue: serverTransaction.total_belanja,
                        localValue: localTransaction.total_belanja
                    });
                }
                
                if (serverTransaction.status_pembayaran !== localTransaction.status_pembayaran) {
                    conflicts.push({
                        field: 'status_pembayaran',
                        serverValue: serverTransaction.status_pembayaran,
                        localValue: localTransaction.status_pembayaran
                    });
                }
                
                if (conflicts.length > 0) {
                    response.conflicts.push({
                        type: 'transaction',
                        conflictType: 'data_mismatch',
                        id: localTransaction.server_id,
                        localId: localTransaction.id,
                        message: `Transaction data conflicts detected in ${conflicts.length} field(s)`,
                        conflicts: conflicts,
                        resolution: 'manual_review', // Transactions should be manually reviewed
                        serverUpdatedAt: serverUpdatedAt.toISOString(),
                        localUpdatedAt: localUpdatedAt.toISOString(),
                        serverData: serverTransaction,
                        localData: localTransaction,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
        } catch (error) {
            console.error(`Error detecting conflict for transaction ${localTransaction.server_id}:`, error);
            response.errors.push(`Transaction conflict detection error: ${error.message}`);
        }
    }
}

/**
 * Get sync status for a user
 */
exports.getSyncStatus = async (req, res) => {
    const userId = req.userId;
    
    try {
        const connection = await db.getConnection();
        
        // Get last sync time from user table
        const [userResult] = await connection.query(
            'SELECT last_sync_time FROM users WHERE id = ?',
            [userId]
        );
        
        // Get recent sync logs
        const [syncLogs] = await connection.query(`
            SELECT id, sync_start_time, sync_end_time, direction, status, 
                   items_uploaded, items_downloaded, error_message
            FROM sync_logs 
            WHERE user_id = ? 
            ORDER BY sync_start_time DESC 
            LIMIT 10
        `, [userId]);
        
        // Get counts of pending items (items that need to be synced)
        const [productCount] = await connection.query(
            'SELECT COUNT(*) as count FROM products WHERE user_id = ? AND updated_at > COALESCE((SELECT last_sync_time FROM users WHERE id = ?), "1970-01-01")',
            [userId, userId]
        );
        
        const [customerCount] = await connection.query(
            'SELECT COUNT(*) as count FROM customers WHERE user_id = ? AND updated_at > COALESCE((SELECT last_sync_time FROM users WHERE id = ?), "1970-01-01")',
            [userId, userId]
        );
        
        const [transactionCount] = await connection.query(
            'SELECT COUNT(*) as count FROM transactions WHERE user_id = ? AND updated_at > COALESCE((SELECT last_sync_time FROM users WHERE id = ?), "1970-01-01")',
            [userId, userId]
        );
        
        connection.release();
        
        res.status(200).json({
            success: true,
            lastSyncTime: userResult[0]?.last_sync_time || null,
            pendingChanges: {
                products: productCount[0].count,
                customers: customerCount[0].count,
                transactions: transactionCount[0].count
            },
            recentSyncLogs: syncLogs
        });
        
    } catch (error) {
        console.error('Error getting sync status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Force full sync - resets last sync time to trigger complete data download
 */
exports.forceFullSync = async (req, res) => {
    const userId = req.userId;
    
    try {
        const connection = await db.getConnection();
        
        // Reset last sync time to null
        await connection.query(
            'UPDATE users SET last_sync_time = NULL WHERE id = ?',
            [userId]
        );
        
        // Log this action
        await connection.query(
            'INSERT INTO sync_logs (user_id, sync_start_time, direction, status, items_uploaded, items_downloaded, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, new Date(), 'Reset', 'Success', 0, 0, JSON.stringify({action: 'Force full sync requested'})]
        );
        
        connection.release();
        
        res.status(200).json({
            success: true,
            message: 'Full sync reset successfully. Next sync will download all data.'
        });
        
    } catch (error) {
        console.error('Error forcing full sync:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get server data summary for a user
 */
exports.getDataSummary = async (req, res) => {
    const userId = req.userId;
    
    try {
        const connection = await db.getConnection();
        
        // Get counts of all data
        const [productCount] = await connection.query(
            'SELECT COUNT(*) as total, COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active FROM products WHERE user_id = ?',
            [userId]
        );
        
        const [customerCount] = await connection.query(
            'SELECT COUNT(*) as total, COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active FROM customers WHERE user_id = ?',
            [userId]
        );
        
        const [transactionCount] = await connection.query(
            'SELECT COUNT(*) as total, COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active FROM transactions WHERE user_id = ?',
            [userId]
        );
        
        // Get recent activity
        const [recentActivity] = await connection.query(`
            SELECT 'product' as type, nama_produk as name, updated_at FROM products WHERE user_id = ? AND updated_at IS NOT NULL
            UNION ALL
            SELECT 'customer' as type, nama_pelanggan as name, updated_at FROM customers WHERE user_id = ? AND updated_at IS NOT NULL  
            UNION ALL
            SELECT 'transaction' as type, CONCAT('Transaction #', id) as name, updated_at FROM transactions WHERE user_id = ? AND updated_at IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT 20
        `, [userId, userId, userId]);
        
        connection.release();
        
        res.status(200).json({
            success: true,
            summary: {
                products: productCount[0],
                customers: customerCount[0], 
                transactions: transactionCount[0]
            },
            recentActivity: recentActivity
        });
        
    } catch (error) {
        console.error('Error getting data summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Backup user data
 */
exports.backupUserData = async (req, res) => {
    const userId = req.userId;
    
    try {
        const connection = await db.getConnection();
        
        // Get all user data
        const [products] = await connection.query(
            'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL',
            [userId]
        );
        
        const [customers] = await connection.query(
            'SELECT * FROM customers WHERE user_id = ? AND deleted_at IS NULL',
            [userId]
        );
        
        const [transactions] = await connection.query(
            'SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL',
            [userId]
        );
        
        const [user] = await connection.query(
            'SELECT id, name, email, phoneNumber, storeName, storeAddress, last_sync_time FROM users WHERE id = ?',
            [userId]
        );
        
        connection.release();
        
        const backupData = {
            user: user[0],
            products: products,
            customers: customers,
            transactions: transactions,
            backupTime: new Date().toISOString(),
            version: '1.0'
        };
        
        res.status(200).json({
            success: true,
            backup: backupData
        });
        
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Resolve conflicts manually with user selection
 */
exports.resolveConflicts = async (req, res) => {
    const userId = req.userId;
    const { conflicts } = req.body;
    
    console.log(`Resolving ${conflicts.length} conflicts for user ${userId}`);
    
    let connection;
    const results = {
        success: false,
        resolved: 0,
        failed: 0,
        errors: []
    };

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        for (const conflict of conflicts) {
            try {
                await resolveConflictItem(connection, userId, conflict);
                results.resolved++;
            } catch (error) {
                console.error(`Failed to resolve conflict ${conflict.id}:`, error);
                results.errors.push(`Failed to resolve ${conflict.type} conflict ID ${conflict.id}: ${error.message}`);
                results.failed++;
            }
        }

        // Log conflict resolution
        await connection.query(
            'INSERT INTO sync_logs (user_id, sync_start_time, sync_end_time, direction, status, items_uploaded, items_downloaded, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                userId, 
                new Date(), 
                new Date(), 
                'Conflict Resolution', 
                results.failed > 0 ? 'Partial Success' : 'Success',
                0,
                0,
                JSON.stringify({
                    action: 'Manual conflict resolution',
                    resolved: results.resolved,
                    failed: results.failed,
                    errors: results.errors
                })
            ]
        );

        await connection.commit();
        results.success = true;

        console.log(`Conflict resolution completed. Resolved: ${results.resolved}, Failed: ${results.failed}`);
        res.status(200).json(results);

    } catch (error) {
        console.error('Error resolving conflicts:', error);
        
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
        }

        results.errors.push(`Conflict resolution failed: ${error.message}`);
        res.status(500).json(results);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Resolve individual conflict item
 */
async function resolveConflictItem(connection, userId, conflict) {
    const { type, id, resolution, resolvedData } = conflict;
    
    switch (type) {
        case 'product':
            await resolveProductConflict(connection, userId, id, resolution, resolvedData);
            break;
        case 'customer':
            await resolveCustomerConflict(connection, userId, id, resolution, resolvedData);
            break;
        case 'transaction':
            await resolveTransactionConflict(connection, userId, id, resolution, resolvedData);
            break;
        default:
            throw new Error(`Unknown conflict type: ${type}`);
    }
}

/**
 * Resolve product conflict
 */
async function resolveProductConflict(connection, userId, productId, resolution, resolvedData) {
    if (resolution === 'use_server') {
        // Keep server version, no action needed
        return;
    } else if (resolution === 'use_local') {
        // Update server with local data
        await connection.query(
            'UPDATE products SET nama_produk = ?, kode_produk = ?, jumlah_produk = ?, harga_modal = ?, harga_jual = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            [
                resolvedData.nama_produk,
                resolvedData.kode_produk,
                resolvedData.jumlah_produk,
                resolvedData.harga_modal,
                resolvedData.harga_jual,
                new Date(),
                productId,
                userId
            ]
        );
    } else if (resolution === 'merge') {
        // Use the merged data provided
        await connection.query(
            'UPDATE products SET nama_produk = ?, kode_produk = ?, jumlah_produk = ?, harga_modal = ?, harga_jual = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            [
                resolvedData.nama_produk,
                resolvedData.kode_produk,
                resolvedData.jumlah_produk,
                resolvedData.harga_modal,
                resolvedData.harga_jual,
                new Date(),
                productId,
                userId
            ]
        );
    }
}

/**
 * Resolve customer conflict
 */
async function resolveCustomerConflict(connection, userId, customerId, resolution, resolvedData) {
    if (resolution === 'use_server') {
        return;
    } else if (resolution === 'use_local' || resolution === 'merge') {
        await connection.query(
            'UPDATE customers SET nama_pelanggan = ?, nomor_telepon = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            [
                resolvedData.nama_pelanggan,
                resolvedData.nomor_telepon,
                new Date(),
                customerId,
                userId
            ]
        );
    }
}

/**
 * Resolve transaction conflict
 */
async function resolveTransactionConflict(connection, userId, transactionId, resolution, resolvedData) {
    if (resolution === 'use_server') {
        return;
    } else if (resolution === 'use_local' || resolution === 'merge') {
        await connection.query(
            'UPDATE transactions SET total_belanja = ?, status_pembayaran = ?, metode_pembayaran = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            [
                resolvedData.total_belanja,
                resolvedData.status_pembayaran,
                resolvedData.metode_pembayaran,
                new Date(),
                transactionId,
                userId
            ]
        );
    }
}

/**
 * Get detailed sync performance metrics
 */
exports.getSyncMetrics = async (req, res) => {
    const userId = req.userId;
    const { days = 7 } = req.query;
    
    try {
        const connection = await db.getConnection();        // Get sync performance over time
        const [syncMetrics] = await connection.query(`
            SELECT 
                DATE(sync_start_time) as sync_date,
                COUNT(*) as sync_count,
                AVG(items_uploaded + items_downloaded) as avg_items_synced,
                SUM(CASE WHEN status = 'Success' THEN 1 ELSE 0 END) as successful_syncs
            FROM sync_logs 
            WHERE user_id = ? 
                AND sync_start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND direction = 'Bidirectional'
            GROUP BY DATE(sync_start_time)
            ORDER BY sync_date DESC
        `, [userId, days]);

        // Get recent error patterns
        const [errorPatterns] = await connection.query(`
            SELECT 
                LEFT(error_message, 100) as error_pattern,
                COUNT(*) as occurrence_count,
                MAX(sync_start_time) as last_occurrence
            FROM sync_logs 
            WHERE user_id = ? 
                AND status = 'Failed'
                AND sync_start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY LEFT(error_message, 100)
            ORDER BY occurrence_count DESC
            LIMIT 10
        `, [userId, days]);

        connection.release();
        
        res.status(200).json({
            success: true,
            metrics: {
                dailyMetrics: syncMetrics,
                errorPatterns: errorPatterns,
                period: `${days} days`
            }
        });
        
    } catch (error) {
        console.error('Error getting sync metrics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Upload-only synchronization endpoint
 * Only processes client changes without sending server changes back
 */
exports.synchronizeUploadOnly = async (req, res) => {
    const userId = req.userId;
    const { clientLastSyncTime, localChanges } = req.body;
    const startTime = Date.now();
    
    console.log(`=== UPLOAD-ONLY SYNC START === User ${userId} at ${new Date().toISOString()}`);
    console.log(`Client last sync: ${clientLastSyncTime}`);
    
    let connection;
    let logId;
    const serverSyncTime = new Date();
    
    const response = {
        success: false,
        serverSyncTime: serverSyncTime.toISOString(),
        itemsUploaded: 0,
        errors: []
    };

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Create sync log
        const logSql = `INSERT INTO sync_logs (user_id, sync_start_time, direction, status, client_last_sync_time) VALUES (?, ?, ?, ?, ?)`;
        const [logResult] = await connection.query(logSql, [
            userId, 
            serverSyncTime, 
            'Upload Only', 
            'In Progress', 
            clientLastSyncTime ? new Date(clientLastSyncTime) : null
        ]);
        logId = logResult.insertId;

        // Process uploads only
        await processUploads(connection, userId, localChanges, response, serverSyncTime);

        // Update user's last sync time
        await connection.query(
            'UPDATE users SET last_sync_time = ? WHERE id = ?',
            [serverSyncTime, userId]
        );

        // Update sync log with success information
        await connection.query(
            `UPDATE sync_logs SET 
                sync_end_time = ?, 
                status = ?, 
                items_uploaded = ?, 
                items_downloaded = 0,
                server_sync_time = ?,
                details = ?
            WHERE id = ?`,
            [
                new Date(),
                response.errors.length > 0 ? 'Partial Success' : 'Success',
                response.itemsUploaded,
                serverSyncTime,
                JSON.stringify({
                    errors: response.errors.length,
                    totalTime: Date.now() - startTime,
                    type: 'upload_only'
                }),
                logId
            ]
        );

        await connection.commit();
        response.success = true;

        console.log(`=== UPLOAD-ONLY SYNC COMPLETED === User ${userId}`);
        console.log(`Uploaded: ${response.itemsUploaded} items`);
        
        res.status(200).json(response);

    } catch (error) {
        console.error(`=== UPLOAD-ONLY SYNC FAILED === User ${userId}:`, error);
        
        if (connection) {
            try {
                await connection.rollback();
                if (logId) {
                    await connection.query(
                        'UPDATE sync_logs SET sync_end_time = ?, status = ?, error_message = ? WHERE id = ?',
                        [new Date(), 'Failed', error.message, logId]
                    );
                }
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
        }

        response.errors.push(`Upload-only sync failed: ${error.message}`);
        res.status(500).json(response);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Download-only synchronization endpoint
 * Only sends server changes without processing client changes
 */
exports.synchronizeDownloadOnly = async (req, res) => {
    const userId = req.userId;
    const { clientLastSyncTime } = req.body;
    const startTime = Date.now();
    
    console.log(`=== DOWNLOAD-ONLY SYNC START === User ${userId} at ${new Date().toISOString()}`);
    console.log(`Client last sync: ${clientLastSyncTime}`);
    
    let connection;
    let logId;
    const serverSyncTime = new Date();
    
    const response = {
        success: false,
        serverSyncTime: serverSyncTime.toISOString(),
        itemsDownloaded: 0,
        serverChanges: {
            products: { new: [], updated: [], deleted: [] },
            customers: { new: [], updated: [], deleted: [] },
            transactions: { new: [], updated: [], deleted: [] }
        },
        errors: []
    };

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Create sync log
        const logSql = `INSERT INTO sync_logs (user_id, sync_start_time, direction, status, client_last_sync_time) VALUES (?, ?, ?, ?, ?)`;
        const [logResult] = await connection.query(logSql, [
            userId, 
            serverSyncTime, 
            'Download Only', 
            'In Progress', 
            clientLastSyncTime ? new Date(clientLastSyncTime) : null
        ]);
        logId = logResult.insertId;

        // Process downloads only
        await processDownloads(connection, userId, clientLastSyncTime, response);

        // Update user's last sync time
        await connection.query(
            'UPDATE users SET last_sync_time = ? WHERE id = ?',
            [serverSyncTime, userId]
        );

        // Update sync log with success information
        await connection.query(
            `UPDATE sync_logs SET 
                sync_end_time = ?, 
                status = ?, 
                items_uploaded = 0, 
                items_downloaded = ?,
                server_sync_time = ?,
                details = ?
            WHERE id = ?`,
            [
                new Date(),
                response.errors.length > 0 ? 'Partial Success' : 'Success',
                response.itemsDownloaded,
                serverSyncTime,
                JSON.stringify({
                    errors: response.errors.length,
                    totalTime: Date.now() - startTime,
                    type: 'download_only',
                    summary: response.serverChanges
                }),
                logId
            ]
        );

        await connection.commit();
        response.success = true;

        console.log(`=== DOWNLOAD-ONLY SYNC COMPLETED === User ${userId}`);
        console.log(`Downloaded: ${response.itemsDownloaded} items`);
        
        res.status(200).json(response);

    } catch (error) {
        console.error(`=== DOWNLOAD-ONLY SYNC FAILED === User ${userId}:`, error);
        
        if (connection) {
            try {
                await connection.rollback();
                if (logId) {
                    await connection.query(
                        'UPDATE sync_logs SET sync_end_time = ?, status = ?, error_message = ? WHERE id = ?',
                        [new Date(), 'Failed', error.message, logId]
                    );
                }
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
        }

        response.errors.push(`Download-only sync failed: ${error.message}`);
        res.status(500).json(response);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};