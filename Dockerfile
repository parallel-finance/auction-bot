FROM node:14.17.0 as builder
LABEL description="This is the build stage for refund bot. Here we create the dist."

WORKDIR /auction-bot

COPY . /auction-bot

RUN yarn && yarn build

# ===== SECOND STAGE ======

FROM node:14.17.0
LABEL description="This is the 2nd stage: a very small image where we copy the refund bot."

COPY --from=builder /auction-bot/dist /usr/local/lib/dist
COPY --from=builder /auction-bot/node_modules /usr/local/lib/node_modules

RUN sed -i '1i\#!/usr/bin/env node' /usr/local/lib/dist/index.js \
    && chmod +x /usr/local/lib/dist/index.js \
    && ln -s /usr/local/lib/dist/index.js /usr/local/bin/auction-bot

ENTRYPOINT ["/usr/local/bin/auction-bot"]

