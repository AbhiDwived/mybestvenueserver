// SERVER MONITORING & ALERTS

import nodemailer from 'nodemailer';

// 1. System health monitoring
class HealthMonitor {
  constructor() {
    this.alerts = [];
    this.thresholds = {
      memory: 500, // MB
      cpu: 80,     // %
      responseTime: 5000, // ms
      errorRate: 10 // errors per minute
    };
  }

  checkMemory() {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > this.thresholds.memory) {
      this.sendAlert('HIGH_MEMORY', `Memory usage: ${heapUsedMB}MB`);
      return false;
    }
    return true;
  }

  checkDatabase() {
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      this.sendAlert('DB_DISCONNECTED', 'Database connection lost');
      return false;
    }
    return true;
  }

  async sendAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date(),
      server: process.env.NODE_ENV
    };

    console.error('ALERT:', alert);
    
    // Send email alert (configure SMTP)
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: 'admin@mybestvenue.com', // Admin email
        subject: `🚨 Server Alert: ${type}`,
        text: `Alert: ${message}\nTime: ${alert.timestamp}\nServer: ${alert.server}`
      });
    } catch (error) {
      console.error('Failed to send alert email:', error);
    }
  }

  startMonitoring() {
    setInterval(() => {
      this.checkMemory();
      this.checkDatabase();
    }, 60000); // Check every minute
  }
}

// 2. Request monitoring middleware
const requestMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (duration > 5000) { // Log slow requests
      logger.warn('Slow request:', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        status: res.statusCode
      });
    }
  });
  
  next();
};

// 3. Error tracking
let errorCount = 0;
let errorResetInterval;

const trackError = (error, req) => {
  errorCount++;
  
  // Reset error count every minute
  if (!errorResetInterval) {
    errorResetInterval = setInterval(() => {
      errorCount = 0;
    }, 60000);
  }
  
  // Alert if too many errors
  if (errorCount > 10) {
    const monitor = new HealthMonitor();
    monitor.sendAlert('HIGH_ERROR_RATE', `${errorCount} errors in last minute`);
  }
};

export { HealthMonitor, requestMonitor, trackError };