const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// Get chat messages
router.get('/:matchId/messages', auth, async (req, res) => {
    try {
        // Verify user is part of the match
        const [match] = await pool.execute(
            'SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [req.params.matchId, req.user.id, req.user.id]
        );

        if (match.length === 0) {
            return res.status(403).json({ error: 'Not authorized to view these messages' });
        }

        const [messages] = await pool.execute(`
            SELECT 
                m.id,
                m.sender_id,
                m.message,
                m.sent_at,
                m.read_at
            FROM messages m
            WHERE m.match_id = ?
            ORDER BY m.sent_at ASC
        `, [req.params.matchId]);

        res.json(messages);
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Get match information
router.get('/:matchId/info', auth, async (req, res) => {
    try {
        const [matchInfo] = await pool.execute(`
            SELECT 
                m.id as match_id,
                u.id,
                u.first_name,
                u.last_name,
                u.profile_picture
            FROM matches m
            JOIN users u ON (
                CASE 
                    WHEN m.user1_id = ? THEN m.user2_id = u.id
                    ELSE m.user1_id = u.id
                END
            )
            WHERE m.id = ?
            AND (m.user1_id = ? OR m.user2_id = ?)
        `, [req.user.id, req.params.matchId, req.user.id, req.user.id]);

        if (matchInfo.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        res.json({
            match_id: matchInfo[0].match_id,
            user: {
                id: matchInfo[0].id,
                first_name: matchInfo[0].first_name,
                last_name: matchInfo[0].last_name,
                profile_picture: matchInfo[0].profile_picture
            }
        });
    } catch (error) {
        console.error('Error getting match info:', error);
        res.status(500).json({ error: 'Failed to get match information' });
    }
});

module.exports = router; 