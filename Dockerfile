# 1. Base Image: Use a specific Node.js version on Alpine Linux for a smaller image
FROM node:18-alpine

# Set timezone to prevent potential issues with date/time in logs or application logic
# Example for Almaty, Kazakhstan. Adjust to your target timezone.
# See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for TZ database names.
ENV TZ=Asia/Almaty
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 2. Set Working Directory
WORKDIR /app

# 3. Copy package files and install dependencies
# Copy only package files first to leverage Docker cache
COPY package.json package-lock.json* ./
# Install production dependencies only
RUN npm ci --only=production

# 4. Copy Application Code
# Copy server code
COPY server/ ./server/
# Copy public assets
COPY public/ ./public/

# 5. Expose Port
# Use the PORT environment variable provided by Render (or default to 3000)
EXPOSE 3000

# 6. Define Start Command
# Use the start script defined in package.json
CMD [ "npm", "start" ] 