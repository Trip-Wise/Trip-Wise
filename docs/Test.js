const { Pool } = require('pg');

// Configure the database connection
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:eDuzrq2N1AYK@ep-bitter-feather-a5tii7ii-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false  // Allows SSL connection with self-signed certificates
    }
});

// Test the connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error connecting to the database:', err.stack);
    }
    console.log('Connected to PostgreSQL database');

    // Close the connection
    release();
    pool.end();
});

// Example query function (optional)
async function queryDatabase(queryText) {
    try {
        const res = await pool.query(queryText);
        console.log(res.rows);
    } catch (err) {
        console.error('Error executing query:', err.stack);
    }
}

// Run a test query
queryDatabase('SELECT NOW();');
