import ImageKit from 'imagekit';
import dotenv from 'dotenv';

dotenv.config();

// Ensure all required environment variables are present
if (!process.env.IMAGEKIT_PUBLIC_KEY || 
    !process.env.IMAGEKIT_PRIVATE_KEY || 
    !process.env.IMAGEKIT_URL_ENDPOINT) {
  console.error('ImageKit configuration missing. Check your environment variables.');
  process.exit(1);
}

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

export default imagekit;
