const mysql = require('mysql2/promise');

// Create the connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // หรือ username ที่คุณตั้งไว้
    password: '276498_Fam', // password ที่คุณตั้งไว้
    database: 'dating_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

module.exports = pool;