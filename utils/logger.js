import winston from 'winston';
import path from 'path';
import { maskSensitiveData } from './securityUtils.js';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  audit: 2,
  info: 3,
  http: 4,
  debug: 5,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  audit: 'magenta',
  info: 'green',
  http: 'cyan',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Create log directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');

// Custom format for masking sensitive data
const maskFormat = winston.format((info) => {
  if (info.metadata) {
    info.metadata = maskSensitiveData(info.metadata);
  }
  if (info.details) {
    info.details = maskSensitiveData(info.details);
  }
  return info;
});

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  maskFormat(),
  winston.format.printf((info) => {
    const { timestamp, level, message, metadata, details, ...rest } = info;
    const metadataStr = metadata ? JSON.stringify(metadata) : '';
    const detailsStr = details ? JSON.stringify(details) : '';
    const restStr = Object.keys(rest).length ? JSON.stringify(rest) : '';
    
    return `${timestamp} ${level}: ${message} ${metadataStr} ${detailsStr} ${restStr}`.trim();
  })
);

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    ),
  }),
  
  // Error log transport
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format,
  }),
  
  // Combined log transport
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format,
  }),
  
  // Audit log transport
  new winston.transports.File({
    filename: path.join(logDir, 'audit.log'),
    level: 'audit',
    format,
  }),
];

// Create logger
const Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
});

// Create specialized audit logger
Logger.audit = (operation, details) => {
  Logger.log({
    level: 'audit',
    message: `AUDIT: ${operation}`,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Create specialized security logger
Logger.security = (event, details) => {
  Logger.log({
    level: 'warn',
    message: `SECURITY: ${event}`,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Create specialized access logger
Logger.access = (method, url, status, responseTime, metadata = {}) => {
  Logger.log({
    level: 'http',
    message: `ACCESS: ${method} ${url}`,
    metadata: {
      status,
      responseTime,
      ...metadata,
    },
    timestamp: new Date().toISOString(),
  });
};

export default Logger; 