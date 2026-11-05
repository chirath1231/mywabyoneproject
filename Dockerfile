# WabyOne ERP — single container for Dokploy
# Backend (Express API) also serves the React frontend on the same port.
# Dokploy: Application -> Build Type "Dockerfile", Dockerfile Path "Dockerfile",
#          Domain -> port 5000.

# ---------- 1. build React frontend ----------
# Node 24 / npm 11: the lockfile is only valid for npm 11 (npm 10 fails on yaml)
FROM node:24-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# API is on the same domain -> relative /api. Shell env overrides
# frontend/.env.production (which still points at Railway).
ARG REACT_APP_PAYHERE_MERCHANT_ID=
ENV REACT_APP_API_URL=/api \
    REACT_APP_PAYHERE_MERCHANT_ID=$REACT_APP_PAYHERE_MERCHANT_ID \
    DISABLE_ESLINT_PLUGIN=true \
    GENERATE_SOURCEMAP=false
RUN npm run build

# ---------- 2. build backend ----------
FROM node:24-alpine AS backend
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ---------- 3. runtime ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000 \
    TRUST_PROXY=1 \
    UPLOAD_DIR=/app/uploads
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/dist ./dist
COPY --from=backend /app/db ./db
COPY --from=backend /app/package.json ./
COPY --from=frontend /frontend/build ./public
RUN mkdir -p /app/uploads/products && chown -R node:node /app/uploads
VOLUME /app/uploads
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "dist/server.js"]
