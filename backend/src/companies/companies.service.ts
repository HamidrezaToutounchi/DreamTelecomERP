import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/companies.dto';

@Injectable()
export class CompaniesService implements OnModuleInit {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureDefaultCompanies();
    } catch (err) {
      this.logger.error('Otomatik şirket profili oluşturma hatası:', err);
    }
  }

  async ensureDefaultCompanies() {
    const tescom = await this.prisma.company.upsert({
      where: { code: 'TESCOM' },
      update: {},
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

    const dream = await this.prisma.company.upsert({
      where: { code: 'DREAM' },
      update: {},
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

    // Link quotes without company to dream
    await this.prisma.quote.updateMany({
      where: { companyId: null },
      data: { companyId: dream.id },
    });

    this.logger.log('🏢 Dream Telecom & Tescom Telecom hazır ve kontrol edildi.');
  }

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!company) {
      throw new NotFoundException('Firma bulunamadı.');
    }
    return company;
  }

  async findByCode(code: string) {
    return this.prisma.company.findUnique({
      where: { code },
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }
}
