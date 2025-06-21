FROM node:20

RUN mkdir -p /home/app
WORKDIR /home/app

RUN npm install -g ganache

COPY package.json /home/app
COPY package-lock.json /home/app

RUN npm install --quiet

COPY . .

CMD ["truffle", "version"]

EXPOSE 8545

ENTRYPOINT ["ganache"]
