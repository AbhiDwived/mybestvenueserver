import express from 'express';
import { generateSitemap } from '../utils/sitemapGenerator.js';

const router = express.Router();

router.get('/sitemap.xml', async (req, res) => {
  try {
    // Set proper hostname with fallback - use FRONTEND_URL from your .env
    const hostname = process.env.FRONTEND_URL || process.env.SITE_URL || 'https://mybestvenue.com';
    console.log('Generating sitemap for hostname:', hostname);
    
    const sitemap = await generateSitemap(hostname);
    
    // Set proper headers for XML sitemap
    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(sitemap);
    
    console.log('Sitemap generated successfully');
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Add a test route to check if sitemap routes are working
router.get('/sitemap-test', (req, res) => {
  res.json({ 
    message: 'Sitemap routes are working',
    timestamp: new Date().toISOString(),
    hostname: process.env.FRONTEND_URL || process.env.SITE_URL || 'https://mybestvenue.com'
  });
});

export default router; 