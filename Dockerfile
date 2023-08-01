FROM node:latest

WORKDIR /usr/src/app

VOLUME [ "/usr/src/app" ]

RUN npm install -g nodemon
RUN apt-get update && apt-get install -y beancount

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

CMD [ "nodemon", "-L", "--trace-warnings", "main/index.js" ]
