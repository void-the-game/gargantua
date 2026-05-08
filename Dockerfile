FROM node:22-alpine 

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

RUN yarn install --production --frozen-lockfile

EXPOSE 3000

CMD ["yarn", "start"]
