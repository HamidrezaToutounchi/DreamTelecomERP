import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseDto } from './dto/warehouse.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class WarehousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(onlyActive: boolean = false): Promise<WarehouseDto[]> {
    return this.prisma.warehouse.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<WarehouseDto> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
    });
    if (!warehouse) {
      throw new NotFoundException('Depo bulunamadı.');
    }
    return warehouse;
  }

  async create(dto: CreateWarehouseDto, user: AuthenticatedUser): Promise<WarehouseDto> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.warehouse.findUnique({
      where: { code },
    });
    if (existing) {
      throw new BadRequestException(`"${code}" kodlu bir depo zaten mevcut.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.warehouse.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const warehouse = await tx.warehouse.create({
        data: {
          code,
          name: dto.name.trim(),
          address: dto.address?.trim() || null,
          contactPerson: dto.contactPerson?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          isDefault: dto.isDefault ?? false,
          isActive: true,
        },
      });

      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role,
        action: 'CREATE',
        entity: 'WAREHOUSE',
        entityId: warehouse.id,
        details: `Yeni depo tanımlandı: ${warehouse.name} (${warehouse.code})`,
      });

      return warehouse;
    });
  }

  async update(id: string, dto: UpdateWarehouseDto, user: AuthenticatedUser): Promise<WarehouseDto> {
    const existing = await this.findOne(id);

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const codeCheck = await this.prisma.warehouse.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (codeCheck && codeCheck.id !== id) {
        throw new BadRequestException(`"${dto.code}" kodlu bir depo zaten mevcut.`);
      }
    }

    if (existing.isDefault && dto.isActive === false) {
      throw new BadRequestException('Varsayılan depo pasife alınamaz.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.warehouse.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const updated = await tx.warehouse.update({
        where: { id },
        data: {
          ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
          ...(dto.contactPerson !== undefined ? { contactPerson: dto.contactPerson?.trim() || null } : {}),
          ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone?.trim() || null } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role,
        action: 'UPDATE',
        entity: 'WAREHOUSE',
        entityId: updated.id,
        details: `Depo bilgileri güncellendi: ${updated.name} (${updated.code})`,
      });

      return updated;
    });
  }

  async toggleActive(id: string, user: AuthenticatedUser): Promise<WarehouseDto> {
    const existing = await this.findOne(id);
    if (existing.isDefault && existing.isActive) {
      throw new BadRequestException('Varsayılan ana depo pasife alınamaz.');
    }

    const nextStatus = !existing.isActive;
    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: { isActive: nextStatus },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      entity: 'WAREHOUSE',
      entityId: updated.id,
      details: `Depo durumu değiştirildi: ${updated.name} -> ${nextStatus ? 'AKTİF' : 'PASİF'}`,
    });

    return updated;
  }
}
