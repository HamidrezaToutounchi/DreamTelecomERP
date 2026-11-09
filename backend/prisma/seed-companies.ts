import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏢 Dream Telecom ve Tescom Telecom şirket profilleri oluşturuluyor/güncelleniyor...');

  const tescom = await prisma.company.upsert({
    where: { code: 'TESCOM' },
    update: {
      name: 'Tescom Telecom',
      title: 'TESCOM TELEKOMÜNİKASYON VE İLETİŞİM HİZMETLERİ SANAYİ TİC. LTD. ŞTİ.',
      address: 'Barbaros Hayrettin Paşa Mah. Şehitler Cad. Gümüş Recidence No:8 Daire : 310 Esenyurt / İstanbul',
      phone: '0212 908 0 444',
      fax: '0 212 908 0 445',
      email: 'info@tescom.com.tr',
      website: 'www.tescom.com.tr',
      logoUrl: '/tescom-logo.png',
      primaryColor: '#0284C7',
    },
    create: {
      code: 'TESCOM',
      name: 'Tescom Telecom',
      title: 'TESCOM TELEKOMÜNİKASYON VE İLETİŞİM HİZMETLERİ SANAYİ TİC. LTD. ŞTİ.',
      address: 'Barbaros Hayrettin Paşa Mah. Şehitler Cad. Gümüş Recidence No:8 Daire : 310 Esenyurt / İstanbul',
      phone: '0212 908 0 444',
      fax: '0 212 908 0 445',
      email: 'info@tescom.com.tr',
      website: 'www.tescom.com.tr',
      logoUrl: '/tescom-logo.png',
      primaryColor: '#0284C7',
    },
  });

  const dream = await prisma.company.upsert({
    where: { code: 'DREAM' },
    update: {
      name: 'Dream Telecom',
      title: 'DREAM TELEKOMÜNİKASYON VE İLETİŞİM HİZMETLERİ SANAYİ TİC. LTD. ŞTİ.',
      address: 'Barbaros Hayrettin Başa Mah. 1993 Sokak . No : 35 Papatya 2 Residence A Blok Daire :70 Kat 4 Beylikdüzü / İSTANBUL',
      phone: '0 212 929 99 00',
      fax: null,
      email: 'info@dreamtelecom.com.tr',
      website: 'www.dreamtelecom.com.tr',
      logoUrl: '/logo.png',
      primaryColor: '#004A93',
    },
    create: {
      code: 'DREAM',
      name: 'Dream Telecom',
      title: 'DREAM TELEKOMÜNİKASYON VE İLETİŞİM HİZMETLERİ SANAYİ TİC. LTD. ŞTİ.',
      address: 'Barbaros Hayrettin Başa Mah. 1993 Sokak . No : 35 Papatya 2 Residence A Blok Daire :70 Kat 4 Beylikdüzü / İSTANBUL',
      phone: '0 212 929 99 00',
      fax: null,
      email: 'info@dreamtelecom.com.tr',
      website: 'www.dreamtelecom.com.tr',
      logoUrl: '/logo.png',
      primaryColor: '#004A93',
    },
  });

  // Mevcut companyId'si null olan teklifleri varsayılan olarak DREAM'e ata
  const updatedQuotes = await prisma.quote.updateMany({
    where: { companyId: null },
    data: { companyId: dream.id },
  });

  console.log(`✅ Şirketler başarıyla kaydedildi:`);
  console.log(`   - Tescom: ${tescom.id} (${tescom.title})`);
  console.log(`   - Dream:  ${dream.id} (${dream.title})`);
  console.log(`   - Varsayılan şirket atanan teklif sayısı: ${updatedQuotes.count}`);
}

main()
  .catch((e) => {
    console.error('Hata:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
