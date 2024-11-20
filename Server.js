const express = require('express');
const bodyParser = require('body-parser');
const pool = require('./dbConnect');  // Import the database connection

const app = express();
const PORT = 5432;

// Middleware to parse URL-encoded data (form data)
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static HTML form
app.use(express.static('public')); // Place the HTML in a 'public' folder

// Handle form submission
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const query = 'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *';
        const values = [name, email, password];

        // Execute the query
        const result = await pool.query(query, values);

        console.log('New user added:', result.rows[0]);
        res.send('Sign-up successful!'); // Respond back to the client
    } catch (err) {
        console.error('Error inserting user:', err);
        res.status(500).send('Error registering user');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
