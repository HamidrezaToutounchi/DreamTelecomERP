import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('🧹 KULLANICILAR HARİÇ TÜM TEST VERİLERİ TEMİZLENİYOR');
  console.log('====================================================');

  // İlişkisel bütünlüğü koruyarak sırayla temizlik
  // 1. İşlem Logları (Audit Logs)
  const auditLogs = await prisma.auditLog.deleteMany();
  console.log(`🗑️  Silinen İşlem Logu           : ${auditLogs.count}`);

  // 2. Satışlar ve Faturalar
  const sales = await prisma.sale.deleteMany();
  console.log(`🗑️  Silinen Satış & Fatura Kaydı : ${sales.count}`);

  // 3. Teklif Kalemleri
  const quoteItems = await prisma.quoteItem.deleteMany();
  console.log(`🗑️  Silinen Teklif Kalemi        : ${quoteItems.count}`);

  // 4. Teklifler
  const quotes = await prisma.quote.deleteMany();
  console.log(`🗑️  Silinen Teklif Kaydı         : ${quotes.count}`);

  // 5. Görüşmeler / Timeline (Interactions)
  const interactions = await prisma.interaction.deleteMany();
  console.log(`🗑️  Silinen Görüşme & Not Kaydı  : ${interactions.count}`);

  // 6. Müşteriler
  const customers = await prisma.customer.deleteMany();
  console.log(`🗑️  Silinen Müşteri Kaydı        : ${customers.count}`);

  // 7. Potansiyel Müşteriler (Leads)
  const leads = await prisma.lead.deleteMany();
  console.log(`🗑️  Silinen Lead Kaydı           : ${leads.count}`);

  // 8. Test Ürünleri
  const products = await prisma.product.deleteMany();
  console.log(`🗑️  Silinen Test Ürünü           : ${products.count}`);

  // 9. Müşteri Kategorileri
  const categories = await prisma.customerCategory.deleteMany();
  console.log(`🗑️  Silinen Kategori             : ${categories.count}`);

  // 10. Yüklenen Test Fotoğrafları (Uploads)
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let removedFiles = 0;
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(uploadsDir, file));
          removedFiles++;
        }
      }
      console.log(`🗑️  Silinen Yüklenmiş Test Resmi : ${removedFiles}`);
    }
  } catch (err) {
    console.log('ℹ️  Uploads klasörü temizlenirken atlandı.');
  }

  // Kullanıcı tablosunun korunduğunu doğrula
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true },
  });

  console.log('====================================================');
  console.log(`✅ TEMİZLİK İŞLEMİ BAŞARIYLA TAMAMLANDI!`);
  console.log(`👤 Korunan Kullanıcı Sayısı: ${remainingUsers.length}`);
  remainingUsers.forEach((u) => {
    console.log(`   - ${u.fullName} (${u.email}) [${u.role}]`);
  });
  console.log('====================================================');
  console.log('🎯 Sistem artık gerçek verilerinizi girmeye hazır!');
}

main()
  .catch((e) => {
    console.error('❌ Temizleme hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
