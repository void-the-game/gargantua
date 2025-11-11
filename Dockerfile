FROM node:22-alpine 

WORKDIR /app

COPY package.json yarn.lock ./
COPY node_modules ./node_modules

COPY . .

RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]
