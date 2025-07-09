# Use the official Node.js 20 slim image for a smaller footprint
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build TypeScript code (for production)
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application (overridden by docker-compose for dev)
CMD ["npm", "start"]