import { PrismaClient, Role, AppModule } from '@prisma/client';
import * as bcryptModule from 'bcryptjs';

const bcrypt: any = (bcryptModule as any).default || bcryptModule;
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 İdempotent Sistem Başlangıç Verileri Yükleniyor...');

  // 1. Sistem Rollerini Tanımla (Upsert - Mevcut Veriyi Silmez)
  console.log('==> Sistem rolleri tanımlanıyor / güncelleniyor...');

  const stockModules: AppModule[] = [
    AppModule.STOCK_VIEW,
    AppModule.STOCK_ENTRY,
    AppModule.STOCK_EXIT,
    AppModule.STOCK_ADJUSTMENT,
    AppModule.WAREHOUSES,
    AppModule.SUPPLIERS,
    AppModule.FAULTS,
    AppModule.STOCK_REPORTS,
  ];

  const crmModules: AppModule[] = [
    AppModule.LEADS,
    AppModule.CUSTOMERS,
    AppModule.QUOTES,
    AppModule.SALES,
    AppModule.PRODUCTS,
    AppModule.REPORTS,
  ];

  const adminModules: AppModule[] = [
    AppModule.USERS,
    AppModule.ROLES,
    AppModule.COMPANIES,
    AppModule.CATEGORIES,
    AppModule.AUDIT_LOGS,
  ];

  const accountingModules: AppModule[] = [
    AppModule.STOCK_VIEW,
    AppModule.STOCK_REPORTS,
    AppModule.SALES,
    AppModule.REPORTS,
    AppModule.CUSTOMERS,
  ];

  const allModules = Object.values(AppModule);

  // 1.1 "Yönetici" Rolü
  const adminRole = await prisma.appRole.upsert({
    where: { name: 'Yönetici' },
    update: { isSystem: true, description: 'Tüm sistem ve iş süreçlerini tam yetkiyle yönetir' },
    create: {
      name: 'Yönetici',
      description: 'Tüm sistem ve iş süreçlerini tam yetkiyle yönetir',
      isSystem: true,
    },
  });

  for (const mod of allModules) {
    const isStock = stockModules.includes(mod);
    const isApprovalSettings = mod === AppModule.APPROVAL_SETTINGS;
    await prisma.rolePermission.upsert({
      where: { roleId_module: { roleId: adminRole.id, module: mod } },
      update: {
        canView: !isApprovalSettings,
        canCreate: !isApprovalSettings,
        canEdit: !isApprovalSettings,
        canDelete: !isStock && !isApprovalSettings,
        canCancel: isStock,
      },
      create: {
        roleId: adminRole.id,
        module: mod,
        canView: !isApprovalSettings,
        canCreate: !isApprovalSettings,
        canEdit: !isApprovalSettings,
        canDelete: !isStock && !isApprovalSettings,
        canCancel: isStock,
      },
    });
  }

  // 1.2 "Satış Temsilcisi" Rolü
  const repRole = await prisma.appRole.upsert({
    where: { name: 'Satış Temsilcisi' },
    update: { isSystem: true, description: 'Müşteri, teklif ve satış süreçlerini yürütür' },
    create: {
      name: 'Satış Temsilcisi',
      description: 'Müşteri, teklif ve satış süreçlerini yürütür',
      isSystem: true,
    },
  });

  for (const mod of allModules) {
    const isCrm = crmModules.includes(mod);
    await prisma.rolePermission.upsert({
      where: { roleId_module: { roleId: repRole.id, module: mod } },
      update: {
        canView: isCrm,
        canCreate: isCrm,
        canEdit: isCrm,
        canDelete: false,
        canCancel: false,
      },
      create: {
        roleId: repRole.id,
        module: mod,
        canView: isCrm,
        canCreate: isCrm,
        canEdit: isCrm,
        canDelete: false,
        canCancel: false,
      },
    });
  }

  // 1.3 "Depo Sorumlusu" Rolü
  const stockRole = await prisma.appRole.upsert({
    where: { name: 'Depo Sorumlusu' },
    update: { isSystem: true, description: 'Stok girişi, çıkışı, sevkiyat ve arıza işlemlerini yürütür' },
    create: {
      name: 'Depo Sorumlusu',
      description: 'Stok girişi, çıkışı, sevkiyat ve arıza işlemlerini yürütür',
      isSystem: true,
    },
  });

  for (const mod of allModules) {
    const isStock = stockModules.includes(mod);
    const isProduct = mod === AppModule.PRODUCTS;
    const isCustomer = mod === AppModule.CUSTOMERS;
    await prisma.rolePermission.upsert({
      where: { roleId_module: { roleId: stockRole.id, module: mod } },
      update: {
        canView: isStock || isProduct || isCustomer,
        canCreate: isStock || isProduct,
        canEdit: isStock || isProduct,
        canDelete: false,
        canCancel: isStock,
      },
      create: {
        roleId: stockRole.id,
        module: mod,
        canView: isStock || isProduct || isCustomer,
        canCreate: isStock || isProduct,
        canEdit: isStock || isProduct,
        canDelete: false,
        canCancel: isStock,
      },
    });
  }

  // 1.4 "Muhasebe" Rolü
  const accountingRole = await prisma.appRole.upsert({
    where: { name: 'Muhasebe' },
    update: { isSystem: true, description: 'Fatura, stok raporları ve finansal hareketleri görüntüler' },
    create: {
      name: 'Muhasebe',
      description: 'Fatura, stok raporları ve finansal hareketleri görüntüler',
      isSystem: true,
    },
  });

  for (const mod of allModules) {
    const isAllowed = accountingModules.includes(mod);
    await prisma.rolePermission.upsert({
      where: { roleId_module: { roleId: accountingRole.id, module: mod } },
      update: {
        canView: isAllowed,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canCancel: false,
      },
      create: {
        roleId: accountingRole.id,
        module: mod,
        canView: isAllowed,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canCancel: false,
      },
    });
  }

  // 1.5 "Teknik Servis" Rolü
  const serviceRole = await prisma.appRole.upsert({
    where: { name: 'Teknik Servis' },
    update: { isSystem: true, description: 'Arıza kabulü, tamir, bakım ve servis süreçlerini yönetir' },
    create: {
      name: 'Teknik Servis',
      description: 'Arıza kabulü, tamir, bakım ve servis süreçlerini yönetir',
      isSystem: true,
    },
  });

  for (const mod of allModules) {
    const isFault = mod === AppModule.FAULTS;
    const isViewable = mod === AppModule.STOCK_VIEW || mod === AppModule.PRODUCTS || mod === AppModule.CUSTOMERS || mod === AppModule.STOCK_REPORTS;
    await prisma.rolePermission.upsert({
      where: { roleId_module: { roleId: serviceRole.id, module: mod } },
      update: {
        canView: isFault || isViewable,
        canCreate: isFault,
        canEdit: isFault,
        canDelete: false,
        canCancel: false,
      },
      create: {
        roleId: serviceRole.id,
        module: mod,
        canView: isFault || isViewable,
        canCreate: isFault,
        canEdit: isFault,
        canDelete: false,
        canCancel: false,
      },
    });
  }

  // 1.6 "Satış Müdürü" Rolü
  const salesManagerRole = await prisma.appRole.upsert({
    where: { name: 'Satış Müdürü' },
    update: { isSystem: true, description: 'Satış ekibini, tüm müşteri portföyünü, teklif ve siparişleri yönetir' },
    create: {
      name: 'Satış Müdürü',
      description: 'Satış ekibini, tüm müşteri portföyünü, teklif ve siparişleri yönetir',
      isSystem: true,
    },
  });

  for (const mod of allModules) {
    const isCrm = crmModules.includes(mod) || mod === AppModule.CATEGORIES || mod === AppModule.COMPANIES;
    await prisma.rolePermission.upsert({
      where: { roleId_module: { roleId: salesManagerRole.id, module: mod } },
      update: {
        canView: isCrm,
        canCreate: isCrm,
        canEdit: isCrm,
        canDelete: isCrm && mod !== AppModule.CUSTOMERS,
        canCancel: false,
      },
      create: {
        roleId: salesManagerRole.id,
        module: mod,
        canView: isCrm,
        canCreate: isCrm,
        canEdit: isCrm,
        canDelete: isCrm && mod !== AppModule.CUSTOMERS,
        canCancel: false,
      },
    });
  }

  // 2. Super Admin ve Varsayılan Admin Kullanıcısı (Upsert)
  console.log('==> Admin kullanıcısı kontrol ediliyor / güncelleniyor...');
  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || 'admin@dreamtelecom.com')
    .split(',')
    .map((e) => e.trim().toLowerCase());

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const primaryAdminEmail = superAdminEmails[0] || 'admin@dreamtelecom.com';

  const adminUser = await prisma.user.upsert({
    where: { email: primaryAdminEmail },
    update: {
      isSuperAdmin: true,
      appRoleId: adminRole.id,
      role: Role.SALES_MANAGER,
      isActive: true,
    },
    create: {
      email: primaryAdminEmail,
      fullName: 'Sistem Yöneticisi (Super Admin)',
      passwordHash: adminPassword,
      role: Role.SALES_MANAGER,
      isSuperAdmin: true,
      appRoleId: adminRole.id,
      isActive: true,
    },
  });

  // Eğer birden fazla super admin emaili tanımlanmışsa onları da super admin yap
  for (const email of superAdminEmails) {
    await prisma.user.updateMany({
      where: { email },
      data: { isSuperAdmin: true },
    });
  }

  // 3. Varsayılan Şirket Profilleri (DREAM ve TESCOM)
  console.log('==> Resmi şirket profilleri kontrol ediliyor...');
  await prisma.company.upsert({
    where: { code: 'DREAM' },
    update: {},
    create: {
      code: 'DREAM',
      name: 'Dream Telecom',
      title: 'Dream Telecom İletişim Hizmetleri San. ve Tic. Ltd. Şti.',
      address: 'Maslak Mah. Büyükdere Cad. No:123 Sarıyer / İstanbul',
      phone: '+90 (212) 555 01 00',
      email: 'info@dreamtelecom.com.tr',
      taxOffice: 'Maslak',
      taxNumber: '1234567890',
      primaryColor: '#004A93',
    },
  });

  await prisma.company.upsert({
    where: { code: 'TESCOM' },
    update: {},
    create: {
      code: 'TESCOM',
      name: 'Tescom Telecom',
      title: 'Tescom Telekomünikasyon San. ve Tic. A.Ş.',
      address: 'Şerifali Mah. Çetin Cad. No:45 Ümraniye / İstanbul',
      phone: '+90 (216) 444 02 00',
      email: 'info@tescomtelecom.com.tr',
      taxOffice: 'Ümraniye',
      taxNumber: '9876543210',
      primaryColor: '#006F8D',
    },
  });

  // 4. Varsayılan Müşteri Kategorileri
  console.log('==> Müşteri kategorileri kontrol ediliyor...');
  const categories = [
    { name: 'Telekom Operatörü', description: 'Lisanslı telekom operatörleri ve ISS firmaları', color: '#004A93' },
    { name: 'Kurumsal Müşteri', description: 'Holdingler, büyük ve orta ölçekli kurumsal şirketler', color: '#006F8D' },
    { name: 'Kamu Kurumu', description: 'Belediyeler, bakanlıklar ve kamu iktisadi teşebbüsleri', color: '#78C042' },
    { name: 'KOBİ', description: 'Küçük ve orta büyüklükteki işletmeler', color: '#F59E0B' },
  ];

  for (const cat of categories) {
    await prisma.customerCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // 5. Varsayılan Ana Depo (Idempotent)
  console.log('==> Varsayılan depo kontrol ediliyor...');
  await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: { isDefault: true, isActive: true },
    create: {
      code: 'WH-MAIN',
      name: 'Ana Depo',
      address: 'Merkez Depo & Lojistik Merkezi',
      contactPerson: 'Depo Sorumlusu',
      contactPhone: '+90 216 444 01 00',
      isActive: true,
      isDefault: true,
    },
  });

  console.log('====================================================');
  console.log('✅ İdempotent Başlangıç Verileri Başarıyla Güncellendi:');
  console.log(`   - Super Admin : ${adminUser.email}`);
  console.log(`   - Sistem Rolleri: Yönetici, Satış Temsilcisi, Depo Sorumlusu, Muhasebe`);
  console.log('   - Mevcut veritabanı kayıtları aynen korunmuştur.');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
