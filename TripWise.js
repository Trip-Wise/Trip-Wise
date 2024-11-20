require('dotenv').config();  // Load environment variables from .env file
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5432;

// Configure PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection to the database
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected to Neon PostgreSQL database');
    release();
});

// Middleware to parse JSON requests
app.use(express.json());

// Example endpoint to test database connection
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users'); // Adjust table name as necessary
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
