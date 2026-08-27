const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_software';

async function connectMongoDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`==================================================`);
        console.log(`🍃 Connected to MongoDB Local Database: billing_software`);
        console.log(`📍 Connection URI: ${MONGODB_URI}`);
        console.log(`==================================================`);
        
        await seedMongoUsers();
    } catch (error) {
        console.warn(`⚠️ MongoDB Local Connection Warning (${MONGODB_URI}): ${error.message}`);
        console.warn(`ℹ️ Operating with SQLite database & ready for MongoDB synchronization.`);
    }
}

async function seedMongoUsers() {
    try {
        const CryptoJS = require('crypto-js');
        const User = require('../models/User');
        
        const count = await User.countDocuments();
        if (count === 0) {
            const adminPassHash = CryptoJS.SHA256('admin123').toString();
            const superAdminPassHash = CryptoJS.SHA256('superadmin123').toString();

            await User.create([
                {
                    username: 'admin',
                    email: 'admin@billing.local',
                    password_hash: adminPassHash,
                    role: 'ADMIN'
                },
                {
                    username: 'superadmin',
                    email: 'superadmin@billing.local',
                    password_hash: superAdminPassHash,
                    role: 'SUPERADMIN'
                }
            ]);
            console.log("✅ Seeded MongoDB default credentials: admin (ADMIN) & superadmin (SUPERADMIN)");
        }
    } catch (err) {
        console.error("Error seeding MongoDB users:", err.message);
    }
}

module.exports = {
    connectMongoDB,
    mongoose,
    MONGODB_URI
};
