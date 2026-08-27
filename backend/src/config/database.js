const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');

// Determine local file storage directory
const customDataDir = process.env.BILLING_DATA_DIR;
let dataDir;

if (customDataDir) {
    dataDir = customDataDir;
} else if (process.env.APPDATA) {
    dataDir = path.join(process.env.APPDATA, 'Billing', 'data');
} else {
    dataDir = path.join(__dirname, '../../');
}

if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {
        console.warn('Could not create APPDATA directory, using local folder:', e.message);
        dataDir = path.join(__dirname, '../../');
    }
}

const dbPath = path.join(dataDir, 'billing.db');
console.log(`==================================================`);
console.log(`📁 Local File Database path: ${dbPath}`);
console.log(`==================================================`);

const db = new Database(dbPath);
db.dbFilePath = dbPath;
db.dataDirectoryPath = dataDir;

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'ADMIN',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS parties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'CUSTOMER',
            email TEXT,
            phone TEXT,
            address TEXT,
            currency TEXT DEFAULT 'INR',
            gst_reg TEXT,
            opening_balance REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT,
            category TEXT NOT NULL,
            parent_id INTEGER,
            is_folder INTEGER DEFAULT 0,
            balance REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tax_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            country TEXT DEFAULT 'India',
            rate REAL DEFAULT 0,
            tax_rates TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT,
            description TEXT,
            unit TEXT DEFAULT 'Pcs',
            rate REAL DEFAULT 0,
            unit_price REAL DEFAULT 0,
            cost_price REAL DEFAULT 0,
            Production_cost REAL DEFAULT 0,
            item_type TEXT DEFAULT 'CUSTOMISED PRODUCTS',
            category TEXT DEFAULT 'SALES',
            quantity REAL DEFAULT 0,
            tax_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS raw_materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            unit TEXT DEFAULT 'Kg',
            unit_price REAL DEFAULT 0,
            quantity REAL DEFAULT 0,
            tax_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS product_compositions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            raw_material_id INTEGER,
            quantity REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sales_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL,
            invoice_name TEXT,
            customer_id INTEGER,
            invoice_date TEXT,
            status TEXT DEFAULT 'DRAFT',
            total_amount REAL DEFAULT 0,
            subtotal REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            notes TEXT,
            payment_terms TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sales_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_number TEXT NOT NULL,
            customer_id INTEGER,
            invoice_id INTEGER,
            payment_date TEXT,
            amount REAL DEFAULT 0,
            payment_mode TEXT DEFAULT 'Bank Transfer',
            reference TEXT,
            status TEXT DEFAULT 'PAID',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sales_returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL,
            invoice_name TEXT,
            customer_id INTEGER,
            return_against INTEGER,
            invoice_date TEXT,
            total_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'DRAFT',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sales_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_type TEXT NOT NULL,
            document_id INTEGER NOT NULL,
            source_type TEXT DEFAULT 'customized_product',
            source_id INTEGER,
            description TEXT,
            quantity REAL DEFAULT 0,
            rate REAL DEFAULT 0,
            tax_percent REAL DEFAULT 0,
            tax_id INTEGER,
            amount REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS purchase_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL,
            invoice_name TEXT,
            supplier_id INTEGER,
            invoice_date TEXT,
            status TEXT DEFAULT 'DRAFT',
            total_amount REAL DEFAULT 0,
            subtotal REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS purchase_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_number TEXT NOT NULL,
            supplier_id INTEGER,
            invoice_id INTEGER,
            payment_date TEXT,
            amount REAL DEFAULT 0,
            payment_mode TEXT DEFAULT 'Bank Transfer',
            reference TEXT,
            status TEXT DEFAULT 'PAID',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS purchase_returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL,
            invoice_name TEXT,
            supplier_id INTEGER,
            return_against INTEGER,
            invoice_date TEXT,
            total_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'DRAFT',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS purchase_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_type TEXT NOT NULL,
            document_id INTEGER NOT NULL,
            source_type TEXT DEFAULT 'customized_product',
            source_id INTEGER,
            description TEXT,
            quantity REAL DEFAULT 0,
            rate REAL DEFAULT 0,
            tax_percent REAL DEFAULT 0,
            tax_id INTEGER,
            amount REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_no TEXT NOT NULL UNIQUE,
            date TEXT NOT NULL,
            reference TEXT,
            narration TEXT,
            entry_type TEXT DEFAULT 'JOURNAL',
            status TEXT DEFAULT 'POSTED',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS journal_lines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journal_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            debit REAL DEFAULT 0,
            credit REAL DEFAULT 0
        );
    `);

    seedInitialData();
}

function seedInitialData() {
    // 0. Seed Users if empty
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    if (userCount === 0) {
        const userStmt = db.prepare(`
            INSERT INTO users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        `);

        // Encrypt passwords using CryptoJS SHA256 & bcrypt hash
        const adminPassHash = CryptoJS.SHA256('admin123').toString();
        const superAdminPassHash = CryptoJS.SHA256('superadmin123').toString();

        userStmt.run('admin', 'admin@billing.local', adminPassHash, 'ADMIN');
        userStmt.run('superadmin', 'superadmin@billing.local', superAdminPassHash, 'SUPERADMIN');
        console.log("✅ Seeded initial users: admin (ADMIN) & superadmin (SUPERADMIN)");
    }

    // 1. Seed Accounts if empty
    const accountCount = db.prepare("SELECT COUNT(*) as count FROM accounts").get().count;
    if (accountCount === 0) {
        const accountsStmt = db.prepare(`
            INSERT INTO accounts (name, code, category, parent_id, is_folder, balance)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Root Categories (Folders)
        const assetsFolder = accountsStmt.run('Assets', '1000', 'Assets', null, 1, 0).lastInsertRowid;
        const liabFolder = accountsStmt.run('Liabilities', '2000', 'Liabilities', null, 1, 0).lastInsertRowid;
        const equityFolder = accountsStmt.run('Equity', '3000', 'Equity', null, 1, 0).lastInsertRowid;
        const incomeFolder = accountsStmt.run('Income', '4000', 'Income', null, 1, 0).lastInsertRowid;
        const expenseFolder = accountsStmt.run('Expenses', '5000', 'Expenses', null, 1, 0).lastInsertRowid;

        // Sub Accounts
        const cashAcc = accountsStmt.run('Cash', '1010', 'Assets', assetsFolder, 0, 150000).lastInsertRowid;
        const arAcc = accountsStmt.run('Accounts Receivable', '1020', 'Assets', assetsFolder, 0, 45000).lastInsertRowid;
        const invAcc = accountsStmt.run('Inventory Asset', '1030', 'Assets', assetsFolder, 0, 30000).lastInsertRowid;

        const apAcc = accountsStmt.run('Accounts Payable', '2010', 'Liabilities', liabFolder, 0, 20000).lastInsertRowid;
        const gstPayAcc = accountsStmt.run('GST Payable', '2020', 'Liabilities', liabFolder, 0, 5400).lastInsertRowid;

        const capitalAcc = accountsStmt.run('Owner Capital', '3010', 'Equity', equityFolder, 0, 200000).lastInsertRowid;

        const salesAcc = accountsStmt.run('Sales Income', '4010', 'Income', incomeFolder, 0, 120000).lastInsertRowid;
        const serviceAcc = accountsStmt.run('Service Income', '4020', 'Income', incomeFolder, 0, 35000).lastInsertRowid;

        const cogsAcc = accountsStmt.run('Cost of Goods Sold', '5010', 'Expenses', expenseFolder, 0, 40000).lastInsertRowid;
        const opExpAcc = accountsStmt.run('Operating Expenses', '5020', 'Expenses', expenseFolder, 0, 14600).lastInsertRowid;
    }

    // Tax codes are created manually by the user on demand (e.g. 5%, 10%, custom names).

    // Sample demo data seeding removed to allow clean data testing.
}

initDatabase();

module.exports = db;
