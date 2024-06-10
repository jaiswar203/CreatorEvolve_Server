FROM node:20-alpine3.19

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY .env.production .env

RUN npm run build

ENV PORT=8080

EXPOSE 8080

CMD [ "npm", "run" ,"start:prod" ]