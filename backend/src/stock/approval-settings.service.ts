import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateApprovalSettingDto,
  UpdateApprovalSettingDto,
} from './dto/approval-setting.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ApprovalSettingsService {
  private readonly logger = new Logger(ApprovalSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Tüm Onay Adımlarını Sıralı Olarak Getir
   */
  async findAll() {
    const settings = await this.prisma.approvalSetting.findMany({
      orderBy: { step: 'asc' },
    });

    return Promise.all(
      settings.map(async (s) => {
        let role = null;
        let user = null;

        if (s.roleId) {
          role = await this.prisma.appRole.findUnique({
            where: { id: s.roleId },
            select: { id: true, name: true, description: true },
          });
        }

        if (s.userId) {
          user = await this.prisma.user.findUnique({
            where: { id: s.userId },
            select: { id: true, fullName: true, email: true },
          });
        }

        return {
          id: s.id,
          step: s.step,
          name: s.name,
          roleId: s.roleId || undefined,
          userId: s.userId || undefined,
          isActive: s.isActive,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          role: role || undefined,
          user: user || undefined,
        };
      })
    );
  }

  /**
   * Yeni Onay Adımı Ekle
   */
  async create(dto: CreateApprovalSettingDto, user: AuthenticatedUser) {
    const existing = await this.prisma.approvalSetting.findUnique({
      where: { step: dto.step },
    });

    if (existing) {
      throw new BadRequestException(
        `Adım ${dto.step} zaten mevcut ("${existing.name}"). Lütfen farklı bir adım sırası girin.`
      );
    }

    if (dto.roleId) {
      const role = await this.prisma.appRole.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new NotFoundException('Belirtilen rol bulunamadı.');
      }
    }

    const created = await this.prisma.approvalSetting.create({
      data: {
        step: dto.step,
        name: dto.name.trim(),
        roleId: dto.roleId || null,
        userId: dto.userId || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      entity: 'APPROVAL_SETTING',
      entityId: created.id,
      details: `Yeni onay adımı tanımlandı: Adım ${created.step} - ${created.name}`,
    });

    return created;
  }

  /**
   * Onay Adımı Güncelle
   */
  async update(id: string, dto: UpdateApprovalSettingDto, user: AuthenticatedUser) {
    const setting = await this.prisma.approvalSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException('Onay adımı bulunamadı.');
    }

    if (dto.step !== undefined && dto.step !== setting.step) {
      const stepExists = await this.prisma.approvalSetting.findUnique({
        where: { step: dto.step },
      });
      if (stepExists && stepExists.id !== id) {
        throw new BadRequestException(`Adım ${dto.step} zaten başka bir onay adımı tarafından kullanılıyor.`);
      }
    }

    const updated = await this.prisma.approvalSetting.update({
      where: { id },
      data: {
        ...(dto.step !== undefined && { step: dto.step }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.roleId !== undefined && { roleId: dto.roleId || null }),
        ...(dto.userId !== undefined && { userId: dto.userId || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      entity: 'APPROVAL_SETTING',
      entityId: id,
      details: `Onay adımı güncellendi: Adım ${updated.step} - ${updated.name} (Aktif: ${updated.isActive})`,
    });

    return updated;
  }

  /**
   * Onay Adımını Sil
   */
  async remove(id: string, user: AuthenticatedUser) {
    const setting = await this.prisma.approvalSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException('Onay adımı bulunamadı.');
    }

    await this.prisma.approvalSetting.delete({
      where: { id },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'DELETE',
      entity: 'APPROVAL_SETTING',
      entityId: id,
      details: `Onay adımı silindi: Adım ${setting.step} - ${setting.name}`,
    });

    return { success: true, message: 'Onay adımı silindi.' };
  }
}
