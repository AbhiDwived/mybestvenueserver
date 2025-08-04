import express from 'express';
import { generateSitemap } from '../utils/sitemapGenerator.js';

const router = express.Router();

// Public route for sitemap.xml
// Deep comment: Anyone (including search engines) can fetch the dynamically generated sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Deep comment: Use SITE_URL from env or fallback to default for sitemap hostname
    const hostname = process.env.SITE_URL || 'https://mybestvenue.com';

    // Deep comment: Generate sitemap XML string using utility function
    const sitemap = await generateSitemap(hostname);

    // Deep comment: Set response header to XML and send sitemap
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    // Deep comment: Log and handle errors during sitemap generation
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;