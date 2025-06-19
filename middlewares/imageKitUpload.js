import imagekit from '../config/imagekit.js';

export const uploadToImageKit = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        // Convert buffer to base64
        const base64Image = req.file.buffer.toString('base64');

        // Upload to ImageKit
        const response = await imagekit.upload({
            file: base64Image,
            fileName: `${Date.now()}-${req.file.originalname}`,
            folder: '/blog-images' // You can customize the folder structure
        });

        // Add ImageKit URL to request object
        req.imageUrl = response.url;
        
        next();
    } catch (error) {
        console.error('ImageKit Upload Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error uploading image to ImageKit',
            error: error.message
        });
    }
}; 