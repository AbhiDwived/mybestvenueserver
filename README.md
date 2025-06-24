# MyBestVenue Server

## Environment Variables

The following environment variables are required for the application to function properly. Create a `.env` file in the root directory and add these variables:

### Server Configuration
```
PORT=5000
NODE_ENV=development
```

### MongoDB Configuration
```
MONGO_URI=mongodb://localhost:27017/mybestvenue
```

### JWT Configuration
```
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here
```

### Email Configuration (Gmail)
```
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
```

### SMTP Configuration
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_smtp_password
```

### ImageKit Configuration
```
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

### Frontend URLs (for CORS)
```
CLIENT_URL=http://localhost:5173
PRODUCTION_URL=https://mybestvenue.com
```

## Production Deployment Checklist

1. Environment Setup:
   - Set NODE_ENV to 'production'
   - Use strong, unique secrets for JWT_SECRET and JWT_REFRESH_SECRET
   - Configure proper SMTP settings for production email service
   - Set up proper MongoDB production connection string with authentication

2. Security Measures:
   - Helmet.js is configured for security headers
   - Rate limiting is enabled for API endpoints
   - CORS is configured to allow only specific origins
   - File upload size is limited to 10MB
   - Auth routes have stricter rate limiting

3. Performance:
   - Enable MongoDB indexes for frequently queried fields
   - Configure proper connection pooling for MongoDB
   - Set up proper logging levels
   - Configure error tracking service

4. Monitoring:
   - Set up health check endpoints
   - Configure application monitoring
   - Set up error tracking and reporting
   - Enable security audit logging

5. Backup:
   - Configure automated database backups
   - Set up log rotation
   - Implement backup verification

## Running in Production

1. Install dependencies:
   ```bash
   npm install --production
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Docker Deployment

The application includes a Dockerfile for containerized deployment:

1. Build the image:
   ```bash
   docker build -t mybestvenue-server .
   ```

2. Run the container:
   ```bash
   docker run -p 5000:5000 --env-file .env mybestvenue-server
   ``` 