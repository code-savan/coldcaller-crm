FROM alpine:latest

ARG PB_VERSION=0.22.4

RUN apk add --no-cache unzip ca-certificates wget

RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

EXPOSE 8080

CMD ["/pocketbase", "serve", "--http=0.0.0.0:8080"]
