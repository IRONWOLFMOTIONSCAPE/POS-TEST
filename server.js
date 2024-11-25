const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let db; // Global database connection

async function initializeDatabase() {
    try {
        // First create a connection without database selected
        const initialConnection = mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306
        });

        // Create database if it doesn't exist
        await new Promise((resolve, reject) => {
            initialConnection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('Database checked/created successfully');
        
        // Now connect to the database
        db = mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'POS',
            port: process.env.DB_PORT || 3306
        });

        await new Promise((resolve, reject) => {
            db.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('Connected to MySQL database');
        
        // Create tables if they don't exist
        const createSalesTable = `
            CREATE TABLE IF NOT EXISTS sales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                total DECIMAL(10,2) NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        const createSaleItemsTable = `
            CREATE TABLE IF NOT EXISTS sale_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sale_id INT,
                product_id INT,
                product_name VARCHAR(255),
                price DECIMAL(10,2),
                FOREIGN KEY (sale_id) REFERENCES sales(id)
            )
        `;
        
        await new Promise((resolve, reject) => {
            db.query(createSalesTable, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        await new Promise((resolve, reject) => {
            db.query(createSaleItemsTable, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('Database tables checked/created successfully');
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

// API Routes
app.get('/api/sales', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not initialized' });
    }

    try {
        const query = `
            SELECT 
                s.id,
                s.total,
                s.timestamp,
                COUNT(si.id) as item_count,
                GROUP_CONCAT(si.product_name) as item_names
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            GROUP BY s.id
            ORDER BY s.timestamp DESC
        `;
        
        const [results] = await db.promise().query(query);
        
        const formattedResults = results.map(sale => ({
            id: sale.id,
            timestamp: sale.timestamp,
            total: parseFloat(sale.total),
            items: {
                length: sale.item_count,
                names: sale.item_names ? sale.item_names.split(',') : []
            }
        }));
        
        res.json(formattedResults);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: 'Failed to fetch sales history' });
    }
});

app.post('/api/sales', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not initialized' });
    }

    const { items, total, timestamp } = req.body;
    console.log('Received sale request:', { items, total, timestamp });

    if (!items || !Array.isArray(items) || items.length === 0) {
        console.error('Invalid items data:', items);
        return res.status(400).json({ error: 'Invalid items data' });
    }

    try {
        // Start transaction
        await db.promise().beginTransaction();

        // Insert sale
        const [saleResult] = await db.promise().query(
            'INSERT INTO sales (total, timestamp) VALUES (?, NOW())',
            [total]
        );

        const saleId = saleResult.insertId;
        console.log('Sale created with ID:', saleId);

        // Prepare item values
        const itemValues = items.map(item => [
            saleId,
            item.id || 0,
            item.name,
            parseFloat(item.price) || 0
        ]);

        // Insert sale items
        await db.promise().query(
            'INSERT INTO sale_items (sale_id, product_id, product_name, price) VALUES ?',
            [itemValues]
        );

        // Commit transaction
        await db.promise().commit();
        console.log('Sale completed successfully');
        res.json({ success: true, saleId });
    } catch (error) {
        console.error('Error processing sale:', error);
        await db.promise().rollback();
        res.status(500).json({ error: 'Failed to process sale: ' + error.message });
    }
});

// Initialize database and start server
(async () => {
    const dbInitialized = await initializeDatabase();
    if (dbInitialized) {
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } else {
        console.error('Failed to initialize database. Server not started.');
        process.exit(1);
    }
})();
