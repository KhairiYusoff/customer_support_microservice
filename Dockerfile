FROM node:18-alpine AS base

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Install all dependencies (including dev dependencies for Prisma)
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Install only production dependencies for the runtime
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nestjs

EXPOSE 3000

ENV PORT 3000

# Run database migrations and start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]