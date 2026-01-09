# Etapa 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Etapa 2 — Produção
FROM node:20-alpine AS production
WORKDIR /app

# Instala dependências do Puppeteer/Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    fontconfig \
    bash \
    && rm -rf /var/cache/apk/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY --from=builder /app/dist ./dist

RUN npx prisma generate

# Variável para Puppeteer usar o Chromium do Alpine
ENV CHROME_PATH=/usr/bin/chromium-browser

EXPOSE 4000
CMD ["node", "dist/main.js"]
