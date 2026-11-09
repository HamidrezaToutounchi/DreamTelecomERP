import { PrismaClient, Role } from '@prisma/client';
import * as bcryptModule from 'bcryptjs';

const bcrypt: any = (bcryptModule as any).default || bcryptModule;
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Veritabanındaki tüm veriler temizleniyor...');

  // İlişkisel bütünlüğü koruyarak tüm verileri sıfırla
  await prisma.auditLog.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customerCategory.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Yalnızca 1 adet Sistem Yöneticisi (Admin) oluşturuluyor...');

  // Yalnızca 1 Admin Kullanıcısı
  const adminPassword = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@dreamtelecom.com',
      fullName: 'Sistem Yöneticisi (Admin)',
      passwordHash: adminPassword,
      role: Role.SALES_MANAGER,
      isActive: true,
    },
  });

  console.log('====================================================');
  console.log(`✅ Tek Admin kullanıcısı başarıyla oluşturuldu:`);
  console.log(`   - E-posta : ${admin.email}`);
  console.log(`   - Şifre   : Admin123!`);
  console.log(`   - Rol     : Sistem Yöneticisi (SALES_MANAGER)`);
  console.log('====================================================');
  console.log('🎯 Sistemde başka hiçbir veri/kullanıcı bırakılmadı.');
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
