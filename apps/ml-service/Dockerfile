FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/ml-service ./apps/ml-service
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @aibi/ml-service build
FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY --from=build /app ./
EXPOSE 3006
CMD ["pnpm","--filter","@aibi/ml-service","start"]
