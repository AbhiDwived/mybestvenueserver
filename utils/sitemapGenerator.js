import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';

export async function generateSitemap(hostname) {
  try {
    // Create a stream to write to
    const stream = new SitemapStream({ hostname });

    // Add static routes that match your frontend
    stream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    stream.write({ url: '/about', changefreq: 'monthly', priority: 0.8 });
    stream.write({ url: '/contactUs', changefreq: 'monthly', priority: 0.8 });
    stream.write({ url: '/user/login', changefreq: 'monthly', priority: 0.7 });
    stream.write({ url: '/user/signup', changefreq: 'monthly', priority: 0.7 });
    stream.write({ url: '/vendor/login', changefreq: 'monthly', priority: 0.7 });
    stream.write({ url: '/vendor-register', changefreq: 'monthly', priority: 0.7 });
    stream.write({ url: '/featurevendors', changefreq: 'daily', priority: 0.9 });
    stream.write({ url: '/IdeaBlog', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/corporate', changefreq: 'monthly', priority: 0.7 });
    stream.write({ url: '/wedding-vendor', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/Wedding_Venues', changefreq: 'weekly', priority: 0.8 });

    // Add vendor category routes
    stream.write({ url: '/Cakes', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/caterers', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/choreographers', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/decorators', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/dj', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/entertainment', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/florist', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/gifts', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/invitation', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/music', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/partyPlaces', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/photobooth', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/photographers', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/planners', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/videography', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/tentHouse', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/transportation', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/promotion', changefreq: 'weekly', priority: 0.8 });
    stream.write({ url: '/makeUp', changefreq: 'weekly', priority: 0.8 });

    // Add dynamic vendor routes - Fixed field reference from isActive to isApproved
    const vendors = await Vendor.find({ isApproved: true }).select('_id updatedAt businessName');
    console.log(`Found ${vendors.length} approved vendors for sitemap`);
    vendors.forEach(vendor => {
      stream.write({
        url: `/preview-profile/${vendor._id}`,
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: vendor.updatedAt.toISOString()
      });
    });

    // Add dynamic category routes if Category model exists
    try {
      const categories = await Category.find().select('_id updatedAt name');
      console.log(`Found ${categories.length} categories for sitemap`);
      categories.forEach(category => {
        stream.write({
          url: `/category/${category._id}`,
          changefreq: 'weekly',
          priority: 0.8,
          lastmod: category.updatedAt.toISOString()
        });
      });
    } catch (error) {
      console.log('Category model not available, skipping category routes');
    }

    // Add location-based routes
    const locations = [
      'delhi', 'noida', 'gurgaon', 'faridabad', 'ghaziabad', 
      'mumbai', 'bangalore', 'chennai', 'hyderabad', 'kolkata',
      'pune', 'ahmedabad', 'jaipur', 'lucknow', 'patna'
    ];

    const vendorTypes = [
      'photographers', 'caterers', 'decorators', 'planners', 
      'makeup', 'transportation', 'venues', 'music'
    ];

    // Generate location + category combinations
    locations.forEach(location => {
      vendorTypes.forEach(type => {
        stream.write({
          url: `/vendors/${location}/${type}`,
          changefreq: 'weekly',
          priority: 0.7
        });
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