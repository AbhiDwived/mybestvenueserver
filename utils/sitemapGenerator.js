import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';

export async function generateSitemap(hostname) {
  try {
    // Create a stream to write to
    const stream = new SitemapStream({ hostname });

    // Add static routes
    stream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    stream.write({ url: '/about', changefreq: 'monthly', priority: 0.8 });
    stream.write({ url: '/contact', changefreq: 'monthly', priority: 0.8 });
    stream.write({ url: '/login', changefreq: 'monthly', priority: 0.7 });
    stream.write({ url: '/register', changefreq: 'monthly', priority: 0.7 });

    // Add dynamic vendor routes
    const vendors = await Vendor.find({ isActive: true }).select('_id updatedAt');
    vendors.forEach(vendor => {
      stream.write({
        url: `/vendor/${vendor._id}`,
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: vendor.updatedAt.toISOString()
      });
    });

    // Add dynamic category routes
    const categories = await Category.find().select('_id updatedAt');
    categories.forEach(category => {
      stream.write({
        url: `/category/${category._id}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: category.updatedAt.toISOString()
      });
    });

    // End the stream
    stream.end();

    // Generate the XML
    const data = await streamToPromise(Readable.from(stream));
    return data.toString();
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
} 