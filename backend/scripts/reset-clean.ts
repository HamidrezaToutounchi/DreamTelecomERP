import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Canlı ortam temizliği başlatılıyor...');

  console.log('1. Denetim logları temizleniyor...');
  await prisma.auditLog.deleteMany();

  console.log('2. Satış ve fatura kayıtları temizleniyor...');
  await prisma.sale.deleteMany();

  console.log('3. Teklif kalemleri ve teklifler temizleniyor...');
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();

  console.log('4. Görüşme ve aktivite geçmişi temizleniyor...');
  await prisma.interaction.deleteMany();

  console.log('5. Müşteri kayıtları temizleniyor...');
  await prisma.customer.deleteMany();

  console.log('6. Potansiyel müşteri (Lead) kayıtları temizleniyor...');
  await prisma.lead.deleteMany();

  console.log('7. Ürün kayıtları temizleniyor...');
  await prisma.product.deleteMany();

  console.log('8. Test temsilcileri temizleniyor (Yönetici hariç)...');
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: { not: Role.SALES_MANAGER },
    },
  });
  console.log(`   -> ${deletedUsers.count} adet test kullanıcısı silindi.`);

  const remainingAdmins = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true },
  });

  console.log('========================================================');
  console.log('✅ Temizlik başarıyla tamamlandı!');
  console.log('👤 Sistemde korunan yönetici hesabı:');
  remainingAdmins.forEach((a) => {
    console.log(`   - ${a.fullName} (${a.email}) [Rol: ${a.role}]`);
  });
  console.log('🏢 Şirketler (Dream Telecom & Tescom Telecom) korundu.');
  console.log('🎉 Sistem sıfır ve temiz olarak canlı kullanıma hazır!');
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Hata oluştu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
