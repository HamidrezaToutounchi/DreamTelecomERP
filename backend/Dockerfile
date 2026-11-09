# ==========================================
# 1. Aşama: Derleme (Builder)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma engine için OpenSSL ve libc6-compat
RUN apk add --no-cache openssl libc6-compat

# Bağımlılıkları yükle
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Kaynak kodları kopyala ve derle
COPY . .

RUN npx prisma generate
RUN npm run build

# ==========================================
# 2. Aşama: Çalışma Zamanı (Production Runner)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat dumb-init

ENV NODE_ENV=production
ENV PORT=3000

# Builder aşamasından derlenmiş dosyaları ve Prisma kütüphanelerini kopyala
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/assets ./assets

# Entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Uploads dizini oluştur
RUN mkdir -p /app/uploads

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
