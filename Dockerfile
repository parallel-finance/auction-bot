FROM node:14.17-alpine
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install && npm install -g ts-node

COPY . .

CMD [ "ts-node", "src/index.ts" ]
