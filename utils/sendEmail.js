import nodemailer from 'nodemailer';

// Create a reusable transporter object
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Add timeout settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,   // 5 seconds
    socketTimeout: 10000     // 10 seconds
  });
};

// Retry helper function
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2); // Exponential backoff
  }
};

export const sendEmail = async ({ email, subject, message }) => {
  // Input validation
  if (!email || !subject || !message) {
    throw new Error('Missing required email parameters');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  let transporter;
  try {
    transporter = createTransporter();

    // Test connection before sending
    await transporter.verify();

    // Send mail with retries
    const info = await retry(async () => {
      const result = await transporter.sendMail({
              from: `"MyBestVenue" <${process.env.EMAIL_FROM}>`,
              to: email,
              subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>')
      });

      console.log('Email sent successfully:', {
        messageId: result.messageId,
        to: email,
        subject: subject,
        timestamp: new Date().toISOString()
      });

      return result;
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', {
      error: error.message,
      stack: error.stack,
      email,
      subject,
      timestamp: new Date().toISOString()
    });

    // Classify error for better handling
    let errorMessage = 'Failed to send email';
    if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to email server';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email server connection timed out';
    } else if (error.responseCode >= 500) {
      errorMessage = 'Email server error';
    }

    throw new Error(errorMessage);
  } finally {
    if (transporter) {
      transporter.close();
    }
  }
};
