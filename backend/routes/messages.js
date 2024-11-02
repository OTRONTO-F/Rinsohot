const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');

// Get messages
router.get('/:matchId', auth, async (req, res) => {
    try {
        const { matchId } = req.params;
        const userId = req.user.id;

        console.log('Getting messages for:', { userId, matchId }); // Debug log

        const [messages] = await pool.execute(
            `SELECT * FROM messages 
            WHERE (sender_id = ? AND receiver_id = ?)
            OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at ASC`,
            [userId, matchId, matchId, userId]
        );

        console.log('Found messages:', messages.length); // Debug log
        res.json(messages);

    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ 
            error: 'Failed to get messages',
            details: error.message 
        });
    }
});

// Send message
router.post('/:matchId', auth, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        console.log('Sending message:', { userId, matchId, content }); // Debug log

        if (!content?.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [userId, matchId, content.trim()]
        );

        const [message] = await pool.execute(
            'SELECT * FROM messages WHERE id = ?',
            [result.insertId]
        );

        console.log('Message sent:', message[0]); // Debug log
        res.json(message[0]);

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ 
            error: 'Failed to send message',
            details: error.message 
        });
    }
});

module.exports = router; 