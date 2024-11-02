const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const matchesRoutes = require('./routes/matches');

const app = express();

app.use(cors());
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchesRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something broke!',
        details: err.message 
    });
});

module.exports = app; 