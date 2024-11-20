const { Duffel } = require('@duffel/api');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());
const duffel = new Duffel({
  token: 'duffel_test_1NOK7MNY9fKnKfU0PQmArDHwngnmIiAxKs4bk-trXTQ',
});



async function fetchFlightOffers() {
  const staticValues = {
      origin: 'ANU',
      destination: 'BGI',
      departure_date: '2024-12-01'
  };

  try {
      const response = await duffel.offerRequests.create({
          return_offers: true,
          slices: [
              { 
                  origin: staticValues.origin, 
                  destination: staticValues.destination, 
                  departure_date: staticValues.departure_date 
              }
              


            ],
          passengers: [{ type: 'adult' }],
          cabin_class: 'economy'
      });

      console.log('Flight offers fetched successfully:', response.data);
  } catch (error) {
      console.error('Error fetching flight offers:', error);
  }
}

// Execute fetchFlightOffers on script execution
fetchFlightOffers();

// Existing POST route for dynamic requests
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

      res.json(response.raw);
  } catch (error) {
      console.error('Error fetching flight offers:', error);
      res.status(500).json({ error: 'Failed to fetch flight offers' });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});