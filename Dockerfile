FROM node:20-alpine

WORKDIR /app

# Install client dependencies and build frontend
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Install server dependencies and build backend
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

COPY server/ ./server/
RUN cd server && npm run build

# Create data directory for SQLite
RUN mkdir -p /data

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data
ENV HOST=0.0.0.0

EXPOSE 3001

CMD ["node", "dist/index.js"]
