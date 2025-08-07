import axios from 'axios';

// Reverse geocode coordinates to get a location name
export const reverseGeocode = async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }

  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'json',
        lat,
        lon,
        zoom: 10,
      },
      headers: {
        'User-Agent': 'MyBestVenue/1.0 (mybestvenue.com)' // Nominatim requires a User-Agent
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error during reverse geocoding:', error.message);
    res.status(500).json({ message: 'Failed to fetch location data' });
  }
};

// Get user location based on IP address
export const getLocationByIp = async (req, res) => {
  try {
    const response = await axios.get('https://freegeoip.app/json/');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching location by IP:', error.message);
    res.status(500).json({ message: 'Failed to fetch location by IP' });
  }
};
