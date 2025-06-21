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


COPY . .

RUN chown -R 1001:1001 /code

RUN chmod -R ug+rw /code

RUN chmod +x /code/entrypoint.sh

USER 1001
