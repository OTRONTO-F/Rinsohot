const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');

// Get potential matches
router.get('/suggestions', auth, async (req, res) => {
    try {
        // 1. Get user preferences
        const [userPrefs] = await pool.execute(
            'SELECT interested_in, min_age, max_age FROM user_preferences WHERE user_id = ?',
            [req.user.id]
        );

        if (!userPrefs.length) {
            return res.status(400).json({ error: 'Please set your preferences first' });
        }

        // 2. Calculate age range dates
        const today = new Date();
        const minBirthDate = new Date(today.getFullYear() - userPrefs[0].max_age, today.getMonth(), today.getDate());
        const maxBirthDate = new Date(today.getFullYear() - userPrefs[0].min_age, today.getMonth(), today.getDate());

        // 3. Get potential matches with proper filtering
        const query = `
            SELECT DISTINCT 
                u.id, 
                u.first_name, 
                u.last_name, 
                u.profile_picture, 
                u.bio,
                u.gender,
                u.birth_date
            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            WHERE u.id != ?
            AND u.id NOT IN (
                SELECT to_user_id 
                FROM likes 
                WHERE from_user_id = ?
            )
            AND (
                ? = 'both' 
                OR u.gender = ?
            )
            AND u.birth_date BETWEEN ? AND ?
            LIMIT 10
        `;

        console.log('Executing suggestions query with params:', [
            req.user.id,
            req.user.id,
            userPrefs[0].interested_in,
            userPrefs[0].interested_in,
            minBirthDate,
            maxBirthDate
        ]);

        const [users] = await pool.execute(query, [
            req.user.id,
            req.user.id,
            userPrefs[0].interested_in,
            userPrefs[0].interested_in,
            minBirthDate,
            maxBirthDate
        ]);

        console.log('Found users:', users.length);
        res.json(users);

    } catch (error) {
        console.error('Error in suggestions route:', error);
        res.status(500).json({ 
            error: 'Failed to get suggestions',
            details: error.message 
        });
    }
});

// Like a user
router.post('/:id/like', auth, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        console.log('Attempting to like user:', {
            from_user_id: req.user.id,
            to_user_id: req.params.id
        });

        // Add like
        await connection.execute(
            'INSERT INTO likes (from_user_id, to_user_id) VALUES (?, ?)',
            [req.user.id, req.params.id]
        );

        // Check if there's a mutual like
        const [mutualLike] = await connection.execute(
            'SELECT * FROM likes WHERE from_user_id = ? AND to_user_id = ?',
            [req.params.id, req.user.id]
        );

        let isMatch = false;
        if (mutualLike.length > 0) {
            // Create a match
            await connection.execute(
                'INSERT INTO matches (user1_id, user2_id) VALUES (?, ?)',
                [Math.min(req.user.id, req.params.id), Math.max(req.user.id, req.params.id)]
            );
            isMatch = true;
        }

        await connection.commit();
        res.json({ 
            success: true, 
            isMatch: isMatch
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error in like route:', error);
        res.status(500).json({ 
            error: 'Failed to like user',
            details: error.message 
        });
    } finally {
        connection.release();
    }
});

// Get matches
router.get('/list', auth, async (req, res) => {
    try {
        const [matches] = await pool.execute(`
            SELECT 
                m.id as match_id,
                u.id, u.first_name, u.last_name, u.profile_picture,
                (SELECT message 
                 FROM messages 
                 WHERE match_id = m.id 
                 ORDER BY sent_at DESC 
                 LIMIT 1) as last_message,
                (SELECT COUNT(*)
                 FROM messages
                 WHERE match_id = m.id
                 AND sender_id != ?
                 AND read_at IS NULL) as unread_messages
            FROM matches m
            JOIN users u ON (m.user1_id = u.id OR m.user2_id = u.id)
            WHERE (m.user1_id = ? OR m.user2_id = ?)
            AND u.id != ?
            ORDER BY last_message DESC
        `, [req.user.id, req.user.id, req.user.id, req.user.id]);

        res.json(matches);
    } catch (error) {
        console.error('Error getting matches:', error);
        res.status(500).json({ error: 'Failed to get matches' });
    }
});

// Get unread messages count
router.get('/unread/:matchId', auth, async (req, res) => {
    try {
        const [unread] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM messages
            WHERE match_id = ?
            AND sender_id != ?
            AND read_at IS NULL
        `, [req.params.matchId, req.user.id]);

        res.json({ count: unread[0].count });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// Mark messages as read
router.post('/read/:matchId', auth, async (req, res) => {
    try {
        await pool.execute(`
            UPDATE messages
            SET read_at = CURRENT_TIMESTAMP
            WHERE match_id = ?
            AND sender_id != ?
            AND read_at IS NULL
        `, [req.params.matchId, req.user.id]);

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

// Get user's matches
router.get('/', auth, async (req, res) => {
    try {
        console.log('User ID from token:', req.user.id);

        const query = `
            SELECT DISTINCT 
                u.id,
                u.first_name,
                u.last_name,
                u.profile_picture,
                u.bio,
                u.gender,
                u.birth_date
            FROM users u
            INNER JOIN likes l1 ON u.id = l1.to_user_id
            INNER JOIN likes l2 ON u.id = l2.from_user_id
            WHERE l1.from_user_id = ? 
            AND l2.to_user_id = ?
            AND l1.to_user_id = l2.from_user_id
        `;

        const [matches] = await pool.execute(query, [req.user.id, req.user.id]);
        console.log('Matches found:', matches);

        res.json(matches);

    } catch (error) {
        console.error('Error in matches route:', error);
        res.status(500).json({ 
            error: 'Failed to get matches',
            details: error.message 
        });
    }
});

// Get messages for a match
router.get('/:matchId/messages', auth, async (req, res) => {
    try {
        const { matchId } = req.params;
        const userId = req.user.id;

        console.log('Getting messages:', { userId, matchId }); // Debug log

        // Get messages
        const [messages] = await pool.execute(
            `SELECT m.*, 
                u_sender.first_name as sender_name,
                u_receiver.first_name as receiver_name
            FROM messages m
            JOIN users u_sender ON m.sender_id = u_sender.id
            JOIN users u_receiver ON m.receiver_id = u_receiver.id
            WHERE (m.sender_id = ? AND m.receiver_id = ?)
            OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC`,
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

// Send a message
router.post('/:matchId/messages', auth, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        console.log('Sending message:', { userId, matchId, content }); // Debug log

        if (!content?.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Insert message
        const [result] = await pool.execute(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [userId, matchId, content.trim()]
        );

        // Get the inserted message with user names
        const [message] = await pool.execute(
            `SELECT m.*, 
                u_sender.first_name as sender_name,
                u_receiver.first_name as receiver_name
            FROM messages m
            JOIN users u_sender ON m.sender_id = u_sender.id
            JOIN users u_receiver ON m.receiver_id = u_receiver.id
            WHERE m.id = ?`,
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