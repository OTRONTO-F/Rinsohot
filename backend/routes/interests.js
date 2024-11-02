const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all interests
router.get('/', async (req, res) => {
    try {
        const [interests] = await pool.execute('SELECT * FROM interests ORDER BY name');
        res.json(interests);
    } catch (error) {
        console.error('Error fetching interests:', error);
        res.status(500).json({ error: 'Failed to fetch interests' });
    }
});

module.exports = router; 