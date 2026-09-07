FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/identity-service ./apps/identity-service
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @aibi/identity-service build
FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY --from=build /app ./
EXPOSE 3001
CMD ["pnpm","--filter","@aibi/identity-service","start"]
