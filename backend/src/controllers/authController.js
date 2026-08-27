const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middleware/authMiddleware');

const authController = {
    // Role-based Login Endpoint with encrypted password check
    login: (req, res) => {
        try {
            const { email, username, password } = req.body;
            const identifier = username || email;

            if (!identifier || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Username/Email and Password are required."
                });
            }

            // Find user from SQLite database
            const user = db.prepare(`
                SELECT * FROM users WHERE username = ? OR email = ?
            `).get(identifier, identifier);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password."
                });
            }

            // Encrypt incoming password using CryptoJS SHA256
            const hashedInputPassword = CryptoJS.SHA256(password).toString();

            // Verify using CryptoJS hash match or bcrypt
            const isMatch = (user.password_hash === hashedInputPassword) ||
                            (user.password_hash === password) ||
                            bcrypt.compareSync(password, user.password_hash);

            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password."
                });
            }

            // Generate single JWT token with user id, username, email, and role
            const token = generateToken({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            });

            return res.json({
                success: true,
                message: `Login successful as ${user.role}`,
                token: token,
                data: {
                    token: token,
                    amToken: { token: token },
                    amDbToken: { token: token },
                    user: {
                        id: user.id,
                        name: user.username === 'superadmin' ? 'Super Admin' : 'Admin User',
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        isSuperAdmin: user.role === 'SUPERADMIN',
                        dataLimit: user.role === 'ADMIN' ? 10 : null
                    }
                }
            });
        } catch (error) {
            console.error("Login Error:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get Current User Profile
    me: (req, res) => {
        return res.json({
            success: true,
            data: req.user || { id: 1, name: "Admin User", email: "admin@billing.local", role: "ADMIN" }
        });
    }
};

module.exports = authController;
