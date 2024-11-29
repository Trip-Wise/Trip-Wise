const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const { Duffel } = require('@duffel/api');
const path = require('path');
const bcrypt = require('bcryptjs');
const app = express();
const Amadeus = require("amadeus");
const axios = require('axios');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const duffel = new Duffel({
    token: 'duffel_test_1NOK7MNY9fKnKfU0PQmArDHwngnmIiAxKs4bk-trXTQ',
});

app.use(cors({
    origin: ['http://localhost:3000', 'https://trip-wise.github.io'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));


app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.redirect('/signup.html');
});

app.get('Trip.html', (req, res) => {
    if (!req.session.userName) {
        return res.redirect('/signup.html');
    }
    res.redirect('/Trip.html');
});





app.get('/get-user', (req, res) => {
    if (req.session.userName) {
        res.json({ name: req.session.userName });
    } else {
        res.json({ name: null });
    }
});



app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out.');
        }
        res.redirect('/login.html'); // Redirect to the login page after logout
    });
});






app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Store hashed password in the database
        const query = 'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *';
        const values = [name, email, hashedPassword];

        const result = await pool.query(query, values);
        const user = result.rows[0];

        // Create a session
        req.session.userId = user.id;
        req.session.userName = user.name;

        res.redirect('/Trip.html');
    } catch (err) {
        console.error('Error inserting user:', err);
        res.status(500).send('Error registering user');
    }
});






app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Fetch user data from the database
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' }); // Send error in JSON
        }

        const user = result.rows[0];

        // Compare provided password with hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' }); // Send error in JSON
        }

        // Create session for the logged-in user
        req.session.userId = user.id;
        req.session.userName = user.name;

        // Send a JSON response with user_id on successful login
        res.status(200).json({ user_id: user.id }); // Return JSON
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Error logging in.' }); // Return error in JSON
    }
});






// Flight search endpoint
app.post('/search-flights', async (req, res) => {
    const { origin, destination, departure_date } = req.body;

    try {
        const response = await duffel.offerRequests.create({
            return_offers: true,
            slices: [
                { origin, destination, departure_date }



            ],
            passengers: [{ type: 'adult' }],
            cabin_class: 'economy'
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching flight offers:', error);
        res.status(500).json({ error: 'Failed to fetch flight offers' });
    }
});



const amadeus = new Amadeus({
    clientId: "AvxA5QTArLDOYko3B9pANHuZG03jvPGD",
    clientSecret: "ekshil9ox9NGqRbr",
  });
  
  // Middleware
  app.use(bodyParser.json());
  

 
 
 
  app.post('/search-hotels-by-iata', async (req, res) => {
    const { iataCode } = req.body;
  
    if (!iataCode) {
      return res.status(400).json({ error: 'IATA code is required.' });
    }
  
    try {
      const response = await amadeus.referenceData.locations.hotels.byCity.get({
        cityCode: iataCode,
      });
  
      // Extract relevant fields, including hotelId
      const hotels = response.data.map((hotel) => ({
        name: hotel.name,
        geoCode: hotel.geoCode,
        hotelId: hotel.hotelId, // Include hotelId
      }));
  
      res.json(hotels); // Send back the updated data
    } catch (error) {
      console.error('Error fetching hotel data:', error);
      res.status(500).json({ error: 'Failed to fetch hotel data.' });
    }
});

  
  
  
  
app.post('/search-activities', async (req, res) => {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and Longitude are required' });
    }

    try {
        const response = await amadeus.shopping.activities.get({
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
        });

        // Transform the data to include only the desired fields
        const activities = response.data.map((activity) => ({
            name: activity.name || 'No Name Available',
            shortDescription: activity.shortDescription || 'No Description Available',
            latitude: activity.geoCode?.latitude || null,
            longitude: activity.geoCode?.longitude || null,
            category: activity.category || 'Not Specified',
            rating: activity.rating || 'No rating available',  // Add rating field
            pictures: activity.pictures || [], // Add pictures (it could be an array of URLs)
            bookingLink: activity.bookingLink,
            price: activity.price.amount,
            type: activity.type,
            currencyCode: activity.price.currencyCode
        }));



        console.log('Raw API Response:', JSON.stringify(response.data, null, 2));
        res.json(activities); // Send the transformed activities
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});


 

  let accessToken = null;
  let tokenExpiry = null;
  
  // Function to get a new access token
  async function getAccessToken() {
    try {
        const response = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token',
            new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.AMADEUS_CLIENT_ID, // Replace with your Amadeus Client ID
                client_secret: process.env.AMADEUS_CLIENT_SECRET, // Replace with your Amadeus Client Secret
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + response.data.expires_in * 1000;
        console.log('Access token refreshed successfully.');
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Failed to retrieve access token.');
    }
}

// Middleware to ensure a valid access token
async function ensureAccessToken(req, res, next) {
    if (!accessToken || Date.now() >= tokenExpiry) {
        try {
            await getAccessToken();
        } catch (error) {
            return res.status(500).json({ error: 'Failed to authenticate with Amadeus API.' });
        }
    }
    next();
}

// Hotel Offers Search Endpoint
app.post('/search-hotel-offers', ensureAccessToken, async (req, res) => {
    const { hotelId, adults } = req.body;

    if (!hotelId || !adults) {
        return res.status(400).json({ error: 'Both Hotel ID and number of adults are required.' });
    }

    try {
        const response = await axios.get('https://test.api.amadeus.com/v3/shopping/hotel-offers', {
            params: { hotelIds: hotelId, adults },
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        res.json(response.data.data || []);
    } catch (error) {
        console.error('Error fetching hotel offers:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch hotel offers.' });
    }
    console.log('Full Response:', response);

        // Log the data portion (commonly needed)
    console.log('Response Data:', response.data);


});

app.post('/add-itinerary', async (req, res) => {
    const { user_id, destination, start_date, end_date, notes } = req.body;

    // Validation: Ensure user_id and other required fields are present
    if (!user_id || !destination || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Set default value for notes if not provided
        const defaultNotes = notes || 'N/A';

        // Insert data into the itinerary table
        const query = `
            INSERT INTO itinerary (user_id, destination, start_date, end_date, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const values = [user_id, destination, start_date, end_date, defaultNotes];
        const result = await pool.query(query, values);

        // Respond with the newly created itinerary
        res.status(201).json({
            message: 'Itinerary created successfully',
            itinerary: result.rows[0],
        });
    } catch (error) {
        console.error('Error inserting itinerary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to fetch user itineraries
app.get('/itineraries', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    const userId = req.session.userId;
    
    try {
        const result = await pool.query('SELECT * FROM itinerary WHERE user_id = $1', [userId]);
        
        // Return the list of itineraries as an array
        res.json(result.rows); // `result.rows` is an array of itineraries
    } catch (error) {
        console.error('Error fetching itineraries:', error);
        res.status(500).json({ error: 'Failed to fetch itineraries' });
    }
});




app.post('/itineraries', async (req, res) => {
    const user_id = req.session.userId;
    const { destination, start_date, end_date, notes } = req.body;

    if (!user_id || !destination || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
            INSERT INTO itinerary (user_id, destination, start_date, end_date, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [user_id, destination, start_date, end_date, notes || 'N/A'];

        const result = await pool.query(query, values);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating itinerary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/itineraries/:id', async (req, res) => {
    const user_id = req.session.userId;
    const { id } = req.params;
    const { destination, start_date, end_date, notes } = req.body;

    if (!user_id || !id || !destination || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
            UPDATE itinerary
            SET destination = $1, start_date = $2, end_date = $3, notes = $4
            WHERE id = $5 AND user_id = $6
            RETURNING *;
        `;
        const values = [destination, start_date, end_date, notes || 'N/A', id, user_id];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Itinerary not found or not authorized' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating itinerary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/itineraries/:id', async (req, res) => {
    const user_id = req.session.userId;
    const { id } = req.params;

    if (!user_id || !id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
            DELETE FROM itinerary
            WHERE id = $1 AND user_id = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [id, user_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Itinerary not found or not authorized' });
        }

        res.json({ message: 'Itinerary deleted successfully' });
    } catch (error) {
        console.error('Error deleting itinerary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/budget', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not logged in' }); // Ensure user is logged in
        }

        const query = `
            SELECT id, expense_name, amount_spent
            FROM budget
            WHERE user_id = $1;
        `;
        const result = await pool.query(query, [userId]);

        // Ensure result.rows is returned as an array
        if (!Array.isArray(result.rows)) {
            console.error('Expected an array, got:', result.rows);
            return res.status(500).json({ error: 'Unexpected response from database' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching budget records:', error);
        res.status(500).json({ error: 'Failed to fetch budget records' });
    }
});


app.post('/budget', async (req, res) => {
    const { expense_name, amount_spent } = req.body;

    try {
        const userId = req.session.userId; // Ensure the user is logged in
        if (!userId) {
            return res.status(401).json({ error: 'User not logged in' });
        }

        if (!expense_name || !amount_spent) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const query = `
            INSERT INTO budget (user_id, expense_name, amount_spent)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result = await pool.query(query, [userId, expense_name, amount_spent]);

        res.status(201).json({
            message: 'Budget record added successfully',
            budget: result.rows[0],
        });
    } catch (error) {
        console.error('Error adding budget record:', error);
        res.status(500).json({ error: 'Failed to add budget record' });
    }
});


app.put('/budget/:id', async (req, res) => {
    const { id } = req.params;
    const { expense_name, amount_spent } = req.body;

    try {
        const userId = req.session.userId; // Ensure the user is logged in
        if (!userId) {
            return res.status(401).json({ error: 'User not logged in' });
        }

        if (!expense_name || !amount_spent) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const query = `
            UPDATE budget
            SET expense_name = $1, amount_spent = $2
            WHERE id = $3 AND user_id = $4
            RETURNING *;
        `;
        const result = await pool.query(query, [expense_name, amount_spent, id, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Budget record not found or not authorized' });
        }

        res.status(200).json({
            message: 'Budget record updated successfully',
            budget: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating budget record:', error);
        res.status(500).json({ error: 'Failed to update budget record' });
    }
});

app.delete('/budget/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const userId = req.session.userId; // Ensure the user is logged in
        if (!userId) {
            return res.status(401).json({ error: 'User not logged in' });
        }

        const query = `
            DELETE FROM budget
            WHERE id = $1 AND user_id = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [id, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Budget record not found or not authorized' });
        }

        res.status(200).json({ message: 'Budget record deleted successfully' });
    } catch (error) {
        console.error('Error deleting budget record:', error);
        res.status(500).json({ error: 'Failed to delete budget record' });
    }
});

app.get('/user-budget', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not logged in' });
        }

        const budgetQuery = `
        SELECT 
            COALESCE((SELECT budget FROM users WHERE id = $1), 0) AS total_budget,
            COALESCE(SUM(amount_spent), 0) AS amount_spent
        FROM budget
        WHERE user_id = $1;
        `;

        const result = await pool.query(budgetQuery, [userId]);

        if (!result.rows || result.rows.length === 0) {
            console.error('Unexpected query result:', result);
            return res.status(500).json({ error: 'Failed to fetch user budget' });
        }

        const { total_budget: totalBudget, amount_spent: amountSpent } = result.rows[0] || {};
res.status(200).json({ totalBudget: parseFloat(totalBudget), amountSpent: parseFloat(amountSpent) });
    } catch (error) {
        console.error('Error fetching user budget:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.put('/user-budget', async (req, res) => {
    const { budget } = req.body;

    try {
        const userId = req.session.userId; // Ensure the user is logged in
        if (!userId) {
            return res.status(401).json({ error: 'User not logged in' });
        }

        if (!budget) {
            return res.status(400).json({ error: 'Budget value is required' });
        }

        const query = `
            UPDATE users
            SET budget = $1
            WHERE id = $2
            RETURNING budget;
        `;
        const result = await pool.query(query, [budget, userId]);

        res.status(200).json({
            message: 'Budget updated successfully',
            budget: result.rows[0].budget,
        });
    } catch (error) {
        console.error('Error updating user budget:', error);
        res.status(500).json({ error: 'Failed to update user budget' });
    }
});




const PORT = process.env.PORT || 3000; // Use the environment-provided port or default to 3000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
