import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import Blog from '../models/Blog.js';
import Venue from '../models/Venue.js';
import Event from '../models/Event.js';

export async function generateSitemap(hostname) {
  try {
    // Create a stream to write to
    const stream = new SitemapStream({ hostname });

    // Static Routes
    const staticRoutes = [
      // Main Pages
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/about', changefreq: 'weekly', priority: 0.8 },
      { url: '/terms', changefreq: 'monthly', priority: 0.5 },
      
      // Wedding Vendors
      { url: '/wedding-vendor', changefreq: 'weekly', priority: 0.9 },
      { url: '/Cakes', changefreq: 'weekly', priority: 0.7 },
      { url: '/caterers', changefreq: 'weekly', priority: 0.7 },
      { url: '/choreographers', changefreq: 'weekly', priority: 0.7 },
      { url: '/photographers', changefreq: 'weekly', priority: 0.7 },
      { url: '/videography', changefreq: 'weekly', priority: 0.7 },
      { url: '/makeUp', changefreq: 'weekly', priority: 0.7 },
      { url: '/planners', changefreq: 'weekly', priority: 0.7 },

      // Wedding Venues
      { url: '/Wedding_Venues', changefreq: 'weekly', priority: 0.9 },
      { url: '/Wedding_Venues_city', changefreq: 'weekly', priority: 0.8 },

      // Corporate
      { url: '/corporate', changefreq: 'monthly', priority: 0.6 },
      { url: '/conference', changefreq: 'monthly', priority: 0.6 },
      { url: '/contactUs', changefreq: 'monthly', priority: 0.6 },

      // Blogs and Ideas
      { url: '/IdeaBlog', changefreq: 'weekly', priority: 0.7 },

      // Additional Pages
      { url: '/HowItWorks', changefreq: 'monthly', priority: 0.6 },
      { url: '/ProjectList', changefreq: 'monthly', priority: 0.6 },
      { url: '/SuccessfullEvents', changefreq: 'monthly', priority: 0.6 },

      // Authentication
      { url: '/user/login', changefreq: 'monthly', priority: 0.4 },
      { url: '/user/signup', changefreq: 'monthly', priority: 0.4 },
      { url: '/forgot-password', changefreq: 'monthly', priority: 0.4 }
    ];

    // Add static routes
    staticRoutes.forEach(route => stream.write(route));

    // Dynamic Vendor Routes
    const vendors = await Vendor.find({ isActive: true }).select('_id slug updatedAt');
    vendors.forEach(vendor => {
      stream.write({
        url: `/vendor/${vendor.slug || vendor._id}`,
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: vendor.updatedAt.toISOString()
      });
    });

    // Dynamic Category Routes
    const categories = await Category.find().select('_id slug updatedAt');
    categories.forEach(category => {
      stream.write({
        url: `/category/${category.slug || category._id}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: category.updatedAt.toISOString()
      });
    });

    // Dynamic Blog Routes
    const blogs = await Blog.find({ isPublished: true }).select('_id slug updatedAt');
    blogs.forEach(blog => {
      stream.write({
        url: `/blog/${blog.slug || blog._id}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: blog.updatedAt.toISOString()
      });
    });

    // Dynamic Venue Routes
    const venues = await Venue.find({ isActive: true }).select('_id slug updatedAt');
    venues.forEach(venue => {
      stream.write({
        url: `/venues/${venue.slug || venue._id}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: venue.updatedAt.toISOString()
      });
    });

    // Dynamic Event Routes
    const events = await Event.find({ isPublic: true }).select('_id slug updatedAt');
    events.forEach(event => {
      stream.write({
        url: `/events/${event.slug || event._id}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: event.updatedAt.toISOString()
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