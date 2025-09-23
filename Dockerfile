FROM node:22-alpine

# Installer Chromium et ses dépendances
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Indiquer à Puppeteer où trouver Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm install

EXPOSE 3000

COPY . .

CMD ["node", "index.js"]