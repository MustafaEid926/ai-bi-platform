FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api-gateway ./apps/api-gateway
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @aibi/api-gateway build
FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm","--filter","@aibi/api-gateway","start"]
