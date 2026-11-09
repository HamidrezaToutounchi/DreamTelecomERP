#!/bin/sh
set -e

echo "============================================="
echo "   Dream Telecom SDYS Backend Başlatılıyor   "
echo "============================================="

# Prisma veritabanı şema senkronizasyonu
echo "==> Veritabanı şeması güncelleniyor (Prisma db push)..."
npx prisma db push --skip-generate

# Opsiyonel: İlk kurulumda veya istendiğinde seed çalıştırma
if [ "$RUN_SEED" = "true" ]; then
  echo "==> Başlangıç verileri yükleniyor (Prisma seed)..."
  npx ts-node prisma/seed.ts || true
fi

echo "==> NestJS API uygulaması başlatılıyor..."
exec "$@"
