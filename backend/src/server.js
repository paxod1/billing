const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/database');
const { connectMongoDB } = require('./config/mongo');
const { authMiddleware } = require('./middleware/authMiddleware');

const authRoutes = require('./routes/authRoutes');
const partyRoutes = require('./routes/partyRoutes');
const salesRoutes = require('./routes/salesRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const compatRoutes = require('./routes/compatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-am-authorization', 'x-am-user-authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Single Token JWT Verification Middleware
app.use(authMiddleware);

// Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Billing Node.js Express Backend is running', timestamp: new Date() });
});

// Primary REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/reports', reportRoutes);

// Compatibility Routes for legacy service calls
app.use('/api', compatRoutes);
app.use('/', compatRoutes);

// Global 404 handler
app.use((req, res) => {
    console.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found on server` });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

let server;

function startServer(portToUse) {
    server = app.listen(portToUse, async () => {
        console.log(`==================================================`);
        console.log(`🚀 Billing Backend Server running on port ${portToUse}`);
        console.log(`📊 Health Check: http://localhost:${portToUse}/api/health`);
        console.log(`==================================================`);
        await connectMongoDB();
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`⚠️ Port ${portToUse} is in use. Retrying on port ${portToUse}...`);
            setTimeout(() => {
                server.close();
                startServer(portToUse);
            }, 1000);
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(PORT);
