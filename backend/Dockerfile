FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and prisma schema
COPY . .

# Build TypeScript and Generate Prisma Client
RUN npm run build
RUN npx prisma generate

# Expose API port
EXPOSE 4000

# Run migration/seeding on startup and start app
CMD sh -c "npx prisma migrate deploy && npx prisma db seed && node dist/index.js"
