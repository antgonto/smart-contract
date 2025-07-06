FROM node:16 as build

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies with flag to handle peer dependency conflicts
RUN npm install --legacy-peer-deps

# Install all missing dependencies required by EUI
RUN npm install --legacy-peer-deps moment @elastic/eui-theme-borealis @elastic/eui-theme-common


# Copy the rest of the application
COPY . .

COPY package.json ./
COPY package-lock.json* ./
RUN npm install

EXPOSE 3000

# Enable hot reloading (HMR) for development
ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]
