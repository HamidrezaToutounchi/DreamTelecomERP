import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadQueryDto,
  DistributionStrategy,
  ManualSplitItemDto,
  ImportExcelResultDto,
} from './dto/lead.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role, LeadStatus } from '../common/enums/crm.enums';
import { Prisma } from '@prisma/client';
import { validatePhone, validateEmail } from '../common/utils/phone-validator.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private auditLogsService: AuditLogsService,
  ) {}

  private checkRepAccess(lead: { createdById: string; assignedToId?: string | null }, user: AuthenticatedUser) {
    if (user.role === Role.SALES_REP) {
      if (lead.assignedToId ? lead.assignedToId !== user.id : lead.createdById !== user.id) {
        throw new ForbiddenException('Bu lead kaydına erişim yetkiniz bulunmamaktadır.');
      }
    }
  }

  async create(dto: CreateLeadDto, user: AuthenticatedUser) {
    const assignedToId = user.role === Role.SALES_MANAGER ? (dto.assignedToId || user.id) : user.id;

    // 1. Mükerrer Telefon Kontrolü
    if (dto.phone && dto.phone.trim()) {
      const existingPhone = await this.prisma.lead.findFirst({
        where: { phone: dto.phone.trim() },
      });
      if (existingPhone) {
        throw new ConflictException(
          `Bu telefon numarası (${dto.phone.trim()}) ile kayıtlı aday müşteri (Lead) zaten mevcut: "${existingPhone.companyName}".`,
        );
      }
    }

    // 2. Mükerrer E-posta Kontrolü
    if (dto.email && dto.email.trim()) {
      const existingEmail = await this.prisma.lead.findFirst({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (existingEmail) {
        throw new ConflictException(
          `Bu e-posta adresi (${dto.email.trim()}) ile kayıtlı aday müşteri (Lead) zaten mevcut: "${existingEmail.companyName}".`,
        );
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        companyName: dto.companyName,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        source: dto.source || 'Web',
        status: dto.status || LeadStatus.NEW,
        notes: dto.notes,
        assignedToId,
        createdById: user.id,
        lastActionAt: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (assignedToId && assignedToId !== user.id) {
      this.eventsGateway.notifyNewLeadsAssigned(assignedToId, 1, [lead]);
    }

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      entity: 'LEAD',
      entityId: lead.id,
      details: `"${lead.companyName}" isimli yeni potansiyel müşteri (Lead) eklendi.`,
    });

    return lead;
  }

  async findAll(query: LeadQueryDto, user: AuthenticatedUser) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.LeadWhereInput = {};

    // Row-level security for SALES_REP
    if (user.role === Role.SALES_REP) {
      where.assignedToId = user.id;
    } else if (query.repId) {
      where.assignedToId = query.repId;
    }

    if (query.status) {
      where.status = query.status as LeadStatus;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    if (query.search) {
      const search = query.search.trim();
      const searchConditions: Prisma.LeadWhereInput[] = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [totalRowCount, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedTo: { select: { id: true, fullName: true, email: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        totalRowCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalRowCount / pageSize) || 1,
      },
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        customer: true,
        interactions: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead kaydı bulunamadı.');
    }

    this.checkRepAccess(lead, user);
    return lead;
  }

  async quickAction(id: string, dto: { status: LeadStatus; summary: string; type?: any; nextFollowUpDate?: string }, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead kaydı bulunamadı.');
    }
    this.checkRepAccess(lead, user);

    // 1. Durumu ve son hareket tarihini güncelle
    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status,
        lastActionAt: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // 2. Timeline'a Interaction kaydı düş
    await this.prisma.interaction.create({
      data: {
        leadId: id,
        userId: user.id,
        type: dto.type || 'PHONE_CALL',
        contactedPerson: lead.contactName || lead.companyName,
        summary: dto.summary,
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null,
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'STATUS_CHANGE',
      entity: 'LEAD',
      entityId: id,
      details: `"${lead.companyName}" durumu "${dto.status}" yapıldı. Not: ${dto.summary.slice(0, 100)}`,
    });

    return updatedLead;
  }

  async update(id: string, dto: UpdateLeadDto, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead kaydı bulunamadı.');
    }

    this.checkRepAccess(lead, user);

    const data: any = {
      ...dto,
      lastActionAt: new Date(),
    };

    // SALES_REP cannot reassign leads to others unless SALES_MANAGER
    if (user.role === Role.SALES_REP && dto.assignedToId && dto.assignedToId !== lead.assignedToId) {
      throw new ForbiddenException('Satış temsilcileri lead atamasını değiştiremez.');
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (dto.assignedToId && dto.assignedToId !== lead.assignedToId) {
      this.eventsGateway.notifyNewLeadsAssigned(dto.assignedToId, 1, [updated]);
      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role,
        action: 'REASSIGN',
        entity: 'LEAD',
        entityId: id,
        details: `"${lead.companyName}" leadinin temsilcisi "${updated.assignedTo?.fullName || dto.assignedToId}" olarak değiştirildi.`,
      });
    } else {
      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role,
        action: 'UPDATE',
        entity: 'LEAD',
        entityId: id,
        details: `"${lead.companyName}" lead bilgileri güncellendi.`,
      });
    }

    return updated;
  }

  async importExcel(
    fileBuffer: Buffer,
    strategy: DistributionStrategy,
    repIds: string[] | undefined,
    manualSplit: ManualSplitItemDto[] | undefined,
    user: AuthenticatedUser,
  ): Promise<ImportExcelResultDto> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel dosyasında çalışma sayfası bulunamadı.');
    }

    const rows: Array<{
      companyName: string;
      contactName: string;
      phone: string;
      email?: string;
      source?: string;
      notes?: string;
    }> = [];

    // Assuming header is row 1
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Header row
      const companyName = (row.getCell(1).text || row.getCell(1).value?.toString() || '').trim();
      const contactName = (row.getCell(2).text || row.getCell(2).value?.toString() || '').trim();
      const phone = (row.getCell(3).text || row.getCell(3).value?.toString() || '').trim();
      const email = (row.getCell(4).text || row.getCell(4).value?.toString() || '').trim();
      const source = (row.getCell(5).text || row.getCell(5).value?.toString() || '').trim() || 'Excel Import';
      const notes = (row.getCell(6).text || row.getCell(6).value?.toString() || '').trim();

      // Tamamen boş satırları yoksay
      if (!companyName && !contactName && !phone && !email && !notes) {
        return;
      }

      // Firma adı kontrolü
      if (!companyName) {
        throw new BadRequestException(`Satır ${rowNumber}: Firma adı kesinlikle boş bırakılamaz.`);
      }

      // Telefon numarası zorunluluğu ve gerçeklik kontrolü
      if (!phone) {
        throw new BadRequestException(`Satır ${rowNumber} (${companyName}): Telefon numarası kesinlikle boş bırakılamaz.`);
      }

      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.isValid) {
        throw new BadRequestException(`Satır ${rowNumber} (${companyName}): ${phoneCheck.message}`);
      }

      // E-posta varsa format kontrolü
      if (email) {
        const emailCheck = validateEmail(email);
        if (!emailCheck.isValid) {
          throw new BadRequestException(`Satır ${rowNumber} (${companyName}): ${emailCheck.message}`);
        }
      }

      rows.push({
        companyName,
        contactName: contactName || companyName,
        phone: phoneCheck.normalized || phone,
        email: email || undefined,
        source,
        notes,
      });
    });

    if (rows.length === 0) {
      throw new BadRequestException('Excel dosyasında geçerli lead satırı bulunamadı. Lütfen 1: Firma, 2: Yetkili, 3: Telefon formatında veri yükleyin.');
    }

    // Determine target reps
    let targetReps: string[] = [];
    if (strategy === DistributionStrategy.ROUND_ROBIN) {
      if (repIds && repIds.length > 0) {
        targetReps = repIds;
      } else {
        const reps = await this.prisma.user.findMany({
          where: { role: Role.SALES_REP, isActive: true },
          select: { id: true },
        });
        targetReps = reps.map((r) => r.id);
      }

      if (targetReps.length === 0) {
        throw new BadRequestException('Dağıtım yapılacak aktif satış temsilcisi bulunamadı.');
      }
    }

    const assignedLeadsByRep: Record<string, any[]> = {};
    const createdLeads: any[] = [];

    if (strategy === DistributionStrategy.ROUND_ROBIN) {
      for (let i = 0; i < rows.length; i++) {
        const assignedRepId = targetReps[i % targetReps.length];
        const rowData = rows[i];

        const created = await this.prisma.lead.create({
          data: {
            companyName: rowData.companyName,
            contactName: rowData.contactName,
            phone: rowData.phone,
            email: rowData.email,
            source: rowData.source || 'Excel',
            notes: rowData.notes,
            status: LeadStatus.NEW,
            assignedToId: assignedRepId,
            createdById: user.id,
            lastActionAt: new Date(),
          },
        });

        createdLeads.push(created);
        if (!assignedLeadsByRep[assignedRepId]) assignedLeadsByRep[assignedRepId] = [];
        assignedLeadsByRep[assignedRepId].push(created);
      }
    } else if (strategy === DistributionStrategy.MANUAL_SPLIT) {
      if (!manualSplit || manualSplit.length === 0) {
        throw new BadRequestException('MANUAL_SPLIT stratejisi için manualSplit konfigürasyonu zorunludur.');
      }

      let rowIndex = 0;
      for (const split of manualSplit) {
        assignedLeadsByRep[split.repId] = [];
        for (let j = 0; j < split.count && rowIndex < rows.length; j++) {
          const rowData = rows[rowIndex++];
          const created = await this.prisma.lead.create({
            data: {
              companyName: rowData.companyName,
              contactName: rowData.contactName,
              phone: rowData.phone,
              email: rowData.email,
              source: rowData.source || 'Excel',
              notes: rowData.notes,
              status: LeadStatus.NEW,
              assignedToId: split.repId,
              createdById: user.id,
              lastActionAt: new Date(),
            },
          });
          createdLeads.push(created);
          assignedLeadsByRep[split.repId].push(created);
        }
      }
    }

    // Trigger real-time notifications for each rep
    const distributionSummary: Record<string, number> = {};
    for (const [repId, leads] of Object.entries(assignedLeadsByRep)) {
      distributionSummary[repId] = leads.length;
      if (leads.length > 0) {
        this.eventsGateway.notifyNewLeadsAssigned(repId, leads.length, leads);
      }
    }

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'IMPORT',
      entity: 'LEAD',
      details: `Excel dosyası yüklendi. ${createdLeads.length} adet potansiyel müşteri (Lead) içe aktarıldı ve dağıtıldı.`,
    });

    return {
      totalImported: createdLeads.length,
      distributionSummary,
    };
  }

  /**
   * Excel ile toplu lead yükleme için hazır şablon (.xlsx) oluşturur
   */
  async generateExcelTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dream Telecom SDYS';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Lead Yükleme Şablonu', {
      views: [{ showGridLines: true }],
    });

    // Sütun tanımları
    worksheet.columns = [
      { header: 'Firma Adı *', key: 'companyName', width: 32 },
      { header: 'Yetkili Kişi', key: 'contactName', width: 24 },
      { header: 'Telefon *', key: 'phone', width: 20 },
      { header: 'E-posta', key: 'email', width: 28 },
      { header: 'Kaynak', key: 'source', width: 20 },
      { header: 'Notlar / Görüşme Detayı', key: 'notes', width: 45 },
    ];

    // Başlık satırı stili
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }, // Dream Telecom Navy Blue
      };
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });

    // Örnek taslak verileri (Kullanıcının doğru veri girmesine rehberlik eder)
    const sampleRows = [
      {
        companyName: 'Koç Sistem Bilgi ve İletişim',
        contactName: 'Banu Ertürk',
        phone: '0216 556 10 00',
        email: 'banu.erturk@kocsistem.com.tr',
        source: 'Web Sitesi',
        notes: '10 Gbps Metro Ethernet ve Cloud SD-WAN talep edildi.',
      },
      {
        companyName: 'Trendline Medya Prodüksiyon',
        contactName: 'Zeynep Çetin',
        phone: '0533 123 45 67',
        email: 'zeynep@trendlinemedya.com',
        source: 'Referans',
        notes: 'Ofis santral ve 50 dahili hat kurulumu planlanıyor.',
      },
      {
        companyName: 'Atlas Lojistik Hizmetleri A.Ş.',
        contactName: 'Murat Şahin',
        phone: '0212 444 88 99',
        email: 'murat.sahin@atlaslojistik.com',
        source: 'Fuar',
        notes: 'Merkez ve 4 bölge deposu arası fiber VPN projesi.',
      },
    ];

    sampleRows.forEach((item) => {
      const row = worksheet.addRow(item);
      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 3 ? 'center' : 'left',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
