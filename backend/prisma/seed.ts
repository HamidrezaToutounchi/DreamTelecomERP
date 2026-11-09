import {
  PrismaClient,
  Role,
  ProductType,
  Currency,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Veritabanı temizleniyor (Sıfırlama işlemi)...');

  await prisma.sale.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customerCategory.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Temiz kullanıcılar ve temel veriler oluşturuluyor...');

  // 1. Kullanıcılar (1 Satış Müdürü + 1 Satış Temsilcisi)
  const managerPassword = await bcrypt.hash('Manager123!', 10);
  const repPassword = await bcrypt.hash('Rep123!', 10);

  const manager = await prisma.user.create({
    data: {
      email: 'manager@dreamtelecom.com',
      fullName: 'Kemal Özdemir (Satış Müdürü)',
      passwordHash: managerPassword,
      role: Role.SALES_MANAGER,
      isActive: true,
    },
  });

  const rep = await prisma.user.create({
    data: {
      email: 'rep@dreamtelecom.com',
      fullName: 'Can Yıldız (Satış Temsilcisi)',
      passwordHash: repPassword,
      role: Role.SALES_REP,
      isActive: true,
    },
  });

  console.log(`✅ 2 Kullanıcı oluşturuldu:\n   - Müdür: manager@dreamtelecom.com / Manager123!\n   - Temsilci: rep@dreamtelecom.com / Rep123!`);

  // 2. Müşteri Kategorileri
  await prisma.customerCategory.createMany({
    data: [
      {
        name: 'Telekom Operatörü',
        description: 'Omurga, Dark Fiber ve Taşıyıcı Operatörler',
        color: '#004A93',
      },
      {
        name: 'Kurumsal & Holding',
        description: 'Büyük ölçekli sanayi ve holding müşterileri',
        color: '#006F8D',
      },
      {
        name: 'Bilişim Bayisi & Entegratör',
        description: 'Donanım ve fiber alt satıcıları',
        color: '#78C042',
      },
      {
        name: 'Bireysel VIP',
        description: 'Bireysel özel simetrik internet kullanıcıları',
        color: '#F59E0B',
      },
    ],
  });

  console.log('✅ Müşteri Kategorileri oluşturuldu.');

  // 3. Ürün ve Hizmetler Kataloğu (Fiziksel, Yazılım, Hizmet)
  await prisma.product.createMany({
    data: [
      // Fiziksel Ürünler
      {
        name: 'DreamFiber Kurumsal Router 10G',
        brand: 'Dream Telecom',
        model: 'DF-10G-PRO',
        code: 'DF-RTR-10G',
        type: ProductType.PHYSICAL,
        unitPrice: '14500.00',
        currency: Currency.TRY,
        taxRate: 20,
        description: '10 Gbps SFP+ Uplink portlu yüksek hızlı kurumsal yönlendirici',
      },
      {
        name: 'Endüstriyel 24 Port Gigabit PoE Switch',
        brand: 'Tescom',
        model: 'TS-SW-24G',
        code: 'TS-SW-24',
        type: ProductType.PHYSICAL,
        unitPrice: '11500.00',
        currency: Currency.TRY,
        taxRate: 20,
        description: '24 Port Gigabit PoE+ destekli yönetilebilir kurumsal switch',
      },
      // Yazılım Ürünleri
      {
        name: 'Dream SD-WAN Yönetim Platformu Yıllık Lisans',
        brand: 'Dream Telecom',
        model: 'SDWAN-Y1',
        code: 'SW-SDWAN-01',
        type: ProductType.SOFTWARE,
        unitPrice: '24000.00',
        currency: Currency.TRY,
        taxRate: 20,
        description: 'Çoklu şube SD-WAN trafik optimizasyonu ve merkezi yönetim bulut lisansı',
      },
      {
        name: 'Merkezi Güvenlik Duvarı & UTM Lisansı',
        brand: 'FortiGate',
        model: 'FG-60F-BDL',
        code: 'SW-UTM-60F',
        type: ProductType.SOFTWARE,
        unitPrice: '18500.00',
        currency: Currency.TRY,
        taxRate: 20,
        description: 'Tehdit koruması, web filtreleme ve VPN lisans paketi',
      },
      // Hizmetler
      {
        name: 'Metro Ethernet & Fiber Optik Kurulum Hizmeti',
        brand: 'Dream Telecom',
        model: 'SRV-FO-01',
        code: 'SRV-INSTALL-01',
        type: ProductType.SERVICE,
        unitPrice: '7500.00',
        currency: Currency.TRY,
        taxRate: 20,
        description: 'Kablo çekimi, optik sonlandırma, test ve devreye alma hizmeti',
      },
      {
        name: '7/24 SLA Öncelikli Kurumsal Teknik Destek (Yıllık)',
        brand: 'Dream Telecom',
        model: 'SLA-724-Y1',
        code: 'SRV-SLA-724',
        type: ProductType.SERVICE,
        unitPrice: '36000.00',
        currency: Currency.TRY,
        taxRate: 20,
        description: 'Maksimum 2 saatte müdahale garantili 7/24 kurumsal SLA paketi',
      },
    ],
  });

  console.log('✅ Temel Ürün & Hizmetler kataloğu eklendi.');
  console.log('🎯 Müşteriler, Leadler, Teklifler ve Satışlar tamamen temizlendi. Sistem kullanıma hazır!');
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
