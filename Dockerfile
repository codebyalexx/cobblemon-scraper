FROM node:22-alpine

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Créer un utilisateur non-root
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser
USER pptruser

# Installer Chromium et ses dépendances
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++ \
    bash

# Indiquer à Puppeteer où trouver Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci

EXPOSE 3000

COPY . .

CMD ["node", "index.js"]