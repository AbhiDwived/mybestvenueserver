FROM node:20-alpine as builder

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Build stage for production
FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodeuser

# Create app directory
WORKDIR /usr/src/app

# Copy from builder stage
COPY --from=builder --chown=nodeuser:nodejs /usr/src/app/node_modules ./node_modules
COPY --chown=nodeuser:nodejs . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads/temp && \
    mkdir -p logs && \
    chown -R nodeuser:nodejs uploads logs

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start the server
CMD ["node", "server.js"]