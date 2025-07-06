FROM python:3.12.2-bookworm

RUN addgroup --system --gid 1000 api  \
    && adduser --system --uid 1001 --shell /sbin/nologin --home /opt/api --ingroup api api

ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
ENV DEBIAN_FRONTEND noninteractive

WORKDIR /code

COPY requirements.txt .

# Install dependencies
RUN pip3 install --no-cache-dir -r requirements.txt \
    --index-url https://pypi.org/simple/ \
    --extra-index-url https://pypi.org/simple/

# Install solc (Solidity compiler) via official static binary
RUN apt-get update && apt-get install -y wget && \
    wget -O /usr/local/bin/solc https://github.com/ethereum/solidity/releases/download/v0.8.25/solc-static-linux && \
    chmod +x /usr/local/bin/solc && \
    apt-get remove -y wget && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get remove -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Install npm dependencies (including Hardhat)
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .


RUN chown -R 1001:1001 /code

RUN chmod -R ug+rw /code

RUN chmod +x /code/entrypoint.sh

USER 1001

CMD sh -c "/code/entrypoint.sh"
