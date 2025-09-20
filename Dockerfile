FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy only package files first (layer caching)
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install deps
RUN pnpm install --strict-peer-dependencies=false

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Run in dev mode instead of build
CMD ["pnpm", "dev"]