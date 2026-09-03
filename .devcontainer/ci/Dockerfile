FROM node:24.20.0-bookworm@sha256:be23f54a88d34e8824c741b19b91064094f92c1c97b194144bfc8b50d67258e2 AS node-runtime

FROM postgres:18.6-bookworm@sha256:1c59e2c3c818eaa0f0628f695b36e7c9e362d6b219b36a54a32df645cbd7e1af

COPY --from=node-runtime /usr/local /usr/local

RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && corepack enable \
  && corepack prepare pnpm@11.5.1 --activate \
  && node --version \
  && pnpm --version \
  && postgres --version

WORKDIR /workspace
