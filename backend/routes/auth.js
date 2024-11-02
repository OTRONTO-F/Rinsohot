const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, birth_date, gender } = req.body;

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await pool.execute(
            'INSERT INTO users (email, password, first_name, last_name, birth_date, gender) VALUES (?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, first_name, last_name, birth_date, gender]
        );

        // Create token
        const token = jwt.sign(
            { id: result.insertId },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: result.insertId,
                email,
                first_name,
                last_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body); // Debug log

        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        console.log('Found users:', users.length); // Debug log

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        
        console.log('Password match:', isMatch); // Debug log

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create token
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Check if user has preferences
        const [preferences] = await pool.execute(
            'SELECT * FROM user_preferences WHERE user_id = ?',
            [user.id]
        );

        // Send response
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name
            },
            hasPreferences: preferences.length > 0
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error occurred' });
    }
});

module.exports = router; 