import axios from 'axios';

// Reverse geocode coordinates to get a location name
export const reverseGeocode = async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }

  try {
    console.log('Reverse geocoding request for:', { lat, lon });
    
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'json',
        lat,
        lon,
        zoom: 10,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'MyBestVenue/1.0 (mybestvenue.com)' // Nominatim requires a User-Agent
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('Reverse geocoding response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error during reverse geocoding:', error.message);
    
    // Try alternative geocoding service as fallback
    try {
      console.log('Trying alternative geocoding service...');
      const fallbackResponse = await axios.get(`https://api.opencagedata.com/geocode/v1/json`, {
        params: {
          q: `${lat},${lon}`,
          key: 'demo', // You might want to get a proper API key
          no_annotations: 1,
          language: 'en'
        },
        timeout: 10000
      });
      
      console.log('Fallback geocoding response:', fallbackResponse.data);
      res.json(fallbackResponse.data);
    } catch (fallbackError) {
      console.error('Fallback geocoding also failed:', fallbackError.message);
      res.status(500).json({ 
        message: 'Failed to fetch location data',
        error: 'Both primary and fallback geocoding services failed'
      });
    }
  }
};

// Get user location based on IP address
export const getLocationByIp = async (req, res) => {
  try {
    console.log('IP location request from:', req.ip);
    
    // Try multiple IP geolocation services for better reliability
    const services = [
      {
        name: 'ipapi.co',
        url: 'https://ipapi.co/json/',
        transform: (data) => ({
          city: data.city,
          region_name: data.region,
          country_name: data.country_name,
          ip: data.ip
        })
      },
      {
        name: 'ipinfo.io',
        url: 'https://ipinfo.io/json',
        transform: (data) => ({
          city: data.city,
          region_name: data.region,
          country_name: data.country,
          ip: data.ip
        })
      },
      {
        name: 'freegeoip.app',
        url: 'https://freegeoip.app/json/',
        transform: (data) => ({
          city: data.city,
          region_name: data.region_name,
          country_name: data.country_name,
          ip: data.ip
        })
      }
    ];

    for (const service of services) {
      try {
        console.log(`Trying ${service.name}...`);
        const response = await axios.get(service.url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'MyBestVenue/1.0'
          }
        });
        
        const transformedData = service.transform(response.data);
        console.log(`${service.name} response:`, transformedData);
        
        res.json(transformedData);
        return;
      } catch (serviceError) {
        console.log(`${service.name} failed:`, serviceError.message);
        continue;
      }
    }
    
    // If all services fail, return a default response
    console.log('All IP location services failed');
    res.status(500).json({ 
      message: 'Failed to fetch location by IP',
      error: 'All IP geolocation services are unavailable'
    });
    
  } catch (error) {
    console.error('Error fetching location by IP:', error.message);
    res.status(500).json({ message: 'Failed to fetch location by IP' });
  }
};
