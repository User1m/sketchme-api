FROM node:9
ARG PORT
ENV PORT=$PORT
COPY ./scripts/init.sh /scripts/init.sh
ENTRYPOINT /scripts/init.sh