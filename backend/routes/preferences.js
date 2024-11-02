const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// Get all interests
router.get('/interests', async (req, res) => {
    try {
        const [interests] = await pool.execute('SELECT * FROM interests');
        res.json(interests);
    } catch (error) {
        console.error('Error fetching interests:', error);
        res.status(500).json({ error: 'Failed to fetch interests' });
    }
});

// Save preferences
router.post('/', auth, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { 
            interested_in, 
            min_age, 
            max_age, 
            location, 
            max_distance, 
            selected_interests 
        } = req.body;

        // ลบข้อมูลเก่า (ถ้ามี)
        await connection.execute(
            'DELETE FROM user_preferences WHERE user_id = ?',
            [req.user.id]
        );

        await connection.execute(
            'DELETE FROM user_interests WHERE user_id = ?',
            [req.user.id]
        );

        // เพิ่มข้อมูล preferences ใหม่
        await connection.execute(
            `INSERT INTO user_preferences 
            (user_id, interested_in, min_age, max_age, location, max_distance) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.id, interested_in, min_age, max_age, location, max_distance]
        );

        // เพิ่ม interests
        if (selected_interests && selected_interests.length > 0) {
            const values = selected_interests
                .map(interest_id => [req.user.id, interest_id])
                .map(pair => '(?, ?)').join(', ');

            const params = selected_interests.flatMap(interest_id => [req.user.id, interest_id]);

            await connection.execute(
                `INSERT INTO user_interests (user_id, interest_id) VALUES ${values}`,
                params
            );
        }

        await connection.commit();
        res.json({ message: 'Preferences saved successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error saving preferences:', error);
        res.status(500).json({ error: 'Failed to save preferences' });
    } finally {
        connection.release();
    }
});

// Add check preferences endpoint
router.get('/check', auth, async (req, res) => {
    try {
        const [preferences] = await pool.execute(
            'SELECT * FROM user_preferences WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            hasPreferences: preferences.length > 0
        });
    } catch (error) {
        console.error('Error checking preferences:', error);
        res.status(500).json({ error: 'Failed to check preferences' });
    }
});

module.exports = router; 