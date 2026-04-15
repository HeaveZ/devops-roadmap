FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY src/ src/

RUN chown -R node:node /app
USER node

EXPOSE 3001

CMD ["node", "src/index.js"]
