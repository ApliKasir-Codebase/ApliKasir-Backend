# Use official Node.js runtime sebagai base image
FROM node:20-alpine

# Install curl untuk health check dan create user untuk security
RUN apk add --no-cache curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S aplikasir -u 1001

# Set working directory di container
WORKDIR /app

# Copy package.json dan package-lock.json (jika ada)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Create directory untuk uploads jika diperlukan dan set permissions
RUN mkdir -p uploads && \
    chown -R aplikasir:nodejs /app

# Set user untuk security
USER aplikasir

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["curl", "-f", "http://localhost:3000/"]

# Start the application
CMD ["npm", "start"]
