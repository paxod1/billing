const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'billing_jwt_secret_key_2026';

function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers['authorization'] || req.headers['x-am-authorization'] || req.headers['x-am-user-authorization'];

        if (!authHeader) {
            req.user = getUserWithPermissions(1);
            return next();
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

        if (!token) {
            req.user = getUserWithPermissions(1);
            return next();
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err || !decoded) {
                req.user = getUserWithPermissions(1);
                return next();
            }

            // Extract user ID from decoded JWT payload
            const userId = decoded.id || decoded.userId || 1;
            req.user = getUserWithPermissions(userId, decoded);
            return next();
        });
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        req.user = getUserWithPermissions(1);
        return next();
    }
}

// Fetch user from DB and attach role & permissions / data limits
function getUserWithPermissions(userId, tokenDecoded = null) {
    try {
        let user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(userId);
        if (!user && tokenDecoded && (tokenDecoded.username || tokenDecoded.email)) {
            user = db.prepare('SELECT id, username, email, role FROM users WHERE username = ? OR email = ?').get(
                tokenDecoded.username || tokenDecoded.email,
                tokenDecoded.email || tokenDecoded.username
            );
        }
        if (!user) {
            user = { id: 1, username: 'admin', email: 'admin@billing.local', role: 'ADMIN' };
        }

        const isSuperAdmin = user.role === 'SUPERADMIN';
        const isAdmin = user.role === 'ADMIN' || isSuperAdmin;

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isSuperAdmin: isSuperAdmin,
            isAdmin: isAdmin,
            // Admin role has data limits (e.g. max 10 records limit), SuperAdmin has full access (no limit)
            dataLimit: isSuperAdmin ? null : 10,
            hasAllAccess: isSuperAdmin
        };
    } catch (err) {
        console.error("Error fetching user permissions:", err);
        return { id: 1, username: 'admin', email: 'admin@billing.local', role: 'ADMIN', isSuperAdmin: false, isAdmin: true, dataLimit: 10, hasAllAccess: false };
    }
}

// Middleware to enforce role-based authorization
function requireRole(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized access" });
        }

        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole) && !req.user.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Role '${userRole}' does not have required permissions. SuperAdmin required.`
            });
        }
        next();
    };
}

// Generate single JWT token containing user id and role
function generateToken(payload = {}) {
    const userPayload = {
        id: payload.id || 1,
        username: payload.username || 'admin',
        email: payload.email || 'admin@billing.local',
        role: payload.role || 'ADMIN'
    };
    return jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = {
    authMiddleware,
    requireRole,
    getUserWithPermissions,
    generateToken,
    JWT_SECRET
};
