# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Same-origin API: nginx below proxies /api -> backend container.
# Shell env overrides frontend/.env.production (which points at Railway).
ARG REACT_APP_API_URL=/api
ARG REACT_APP_PAYHERE_MERCHANT_ID=
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_PAYHERE_MERCHANT_ID=$REACT_APP_PAYHERE_MERCHANT_ID \
    DISABLE_ESLINT_PLUGIN=true \
    GENERATE_SOURCEMAP=false
RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
