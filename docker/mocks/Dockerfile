FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY mock.js ./
CMD ["node", "mock.js"]
