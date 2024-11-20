const Amadeus = require("amadeus");

const amadeus = new Amadeus({
  clientId: "AvxA5QTArLDOYko3B9pANHuZG03jvPGD",
  clientSecret: "ekshil9ox9NGqRbr",
});

app.post('/search-hotel-offers', async (req, res) => {
    const { hotelId } = req.body;
  
    if (!hotelId) {
      return res.status(400).json({ error: 'Hotel ID is required' });
    }
  
    try {
      const response = await amadeus.shopping.hotelOffers.get({
        hotelIds: CYMIAFSC,
        adults: 2, // Example: searching for 2 adults
      });
  
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching hotel offers:', error);
      res.status(500).json({ error: 'Failed to fetch hotel offers' });
    }
  });
     res.json(response.data);
