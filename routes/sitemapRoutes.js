import express from 'express';
import { generateSitemap } from '../utils/sitemapGenerator.js';

const router = express.Router();

router.get('/sitemap.xml', async (req, res) => {
  try {
    const hostname = process.env.SITE_URL || 'https://mybestvenue.com';
    const sitemap = await generateSitemap(hostname);
    
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router; 