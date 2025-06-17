import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
  }

  validateEmailConfig() {
    console.log('Validating email configuration...');
    const { EMAIL_USER, EMAIL_PASS, EMAIL_SERVICE } = process.env;
    
    if (!EMAIL_USER || !EMAIL_PASS || !EMAIL_SERVICE) {
      console.error('Email configuration error: Missing required environment variables.');
      throw new Error('Missing email configuration. Please check environment variables.');
    }

    if (!EMAIL_USER.includes('@')) {
      console.error(`Invalid email user format: ${EMAIL_USER}`);
      throw new Error('Invalid email user format.');
    }
    console.log('Email configuration validated successfully.');
    return true;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }
    console.log('Initializing email service...');
    try {
      this.validateEmailConfig();

      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2',
        },
        maxConnections: 5,
        maxMessages: 10,
        rateLimit: 5, // Limit to 5 emails per second
      });

      console.log('Verifying email transporter connection...');
      await this.transporter.verify();
      console.log('Email transporter connection verified successfully.');
      
      this.isInitialized = true;
    } catch (error) {
      console.error(`Email service initialization failed: ${error.message}`, { stack: error.stack });
      throw new Error(`Email service initialization failed: ${error.message}`);
    }
  }

  async sendEmail(to, subject, text) {
    try {
      if (!this.isInitialized || !this.transporter) {
        console.log('Transporter not ready, initializing...');
        await this.initialize();
      }

      const mailOptions = {
        from: `WeddingWire <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html: `<strong>${text}</strong>`, // Adding basic HTML for better formatting
      };

      console.log(`Attempting to send email to: ${to} with subject: "${subject}"`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}, Response: ${info.response}`);
      return info;
    } catch (error) {
      console.error(`Failed to send email to ${to}: ${error.message}`, { stack: error.stack, mailOptions });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}

export const emailService = new EmailService(); 