const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join personal room
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
    });

    // Handle private messages
    socket.on('private_message', async (data) => {
        try {
            const { from_user, to_user, message } = data;
            
            // Save message to database
            const [result] = await pool.execute(
                'INSERT INTO messages (match_id, sender_id, message) VALUES (?, ?, ?)',
                [data.match_id, from_user, message]
            );

            // Emit to both sender and receiver
            io.to(`user_${to_user}`).to(`user_${from_user}`).emit('new_message', {
                id: result.insertId,
                match_id: data.match_id,
                sender_id: from_user,
                message,
                sent_at: new Date()
            });
        } catch (error) {
            console.error('Error handling message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Handle typing status
    socket.on('typing', (data) => {
        socket.to(`user_${data.to_user}`).emit('user_typing', {
            match_id: data.match_id,
            user_id: data.from_user
        });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
        socket.to(`user_${data.to_user}`).emit('user_stop_typing', {
            match_id: data.match_id,
            user_id: data.from_user
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/preferences', require('./routes/preferences'));
app.use('/api/interests', require('./routes/interests'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/chat', require('./routes/chat'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});