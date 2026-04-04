# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Backend ---
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# --- Stage 3: Runner ---
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/backend /app/backend
# Copy frontend dist to backend directory (so backend can serve it)
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

WORKDIR /app/backend
EXPOSE 3001

CMD ["npm", "start"]
