import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateSupplierDto, UpdateSupplierDto, SupplierDto } from './dto/supplier.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(onlyActive: boolean = false): Promise<SupplierDto[]> {
    return this.prisma.supplier.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<SupplierDto> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });
    if (!supplier) {
      throw new NotFoundException('Tedarikçi bulunamadı.');
    }
    return supplier;
  }

  async create(dto: CreateSupplierDto, user: AuthenticatedUser): Promise<SupplierDto> {
    let code = dto.code?.trim().toUpperCase();
    if (!code) {
      const count = await this.prisma.supplier.count();
      code = `SUP-${String(count + 1).padStart(4, '0')}`;
      const existing = await this.prisma.supplier.findUnique({ where: { code } });
      if (existing) {
        code = `SUP-${String(Date.now()).slice(-4)}`;
      }
    } else {
      const existing = await this.prisma.supplier.findUnique({
        where: { code },
      });
      if (existing) {
        throw new BadRequestException(`"${code}" kodlu bir tedarikçi zaten mevcut.`);
      }
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        code,
        name: dto.name.trim(),
        taxNumber: dto.taxNumber?.trim() || null,
        taxOffice: dto.taxOffice?.trim() || null,
        contactPerson: dto.contactPerson?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        isActive: true,
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      entity: 'SUPPLIER',
      entityId: supplier.id,
      details: `Yeni tedarikçi tanımlandı: ${supplier.name} (${supplier.code})`,
    });

    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto, user: AuthenticatedUser): Promise<SupplierDto> {
    await this.findOne(id);

    if (dto.code) {
      const codeCheck = await this.prisma.supplier.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (codeCheck && codeCheck.id !== id) {
        throw new BadRequestException(`"${dto.code}" kodlu bir tedarikçi zaten mevcut.`);
      }
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.taxNumber !== undefined ? { taxNumber: dto.taxNumber?.trim() || null } : {}),
        ...(dto.taxOffice !== undefined ? { taxOffice: dto.taxOffice?.trim() || null } : {}),
        ...(dto.contactPerson !== undefined ? { contactPerson: dto.contactPerson?.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      entity: 'SUPPLIER',
      entityId: updated.id,
      details: `Tedarikçi bilgileri güncellendi: ${updated.name} (${updated.code})`,
    });

    return updated;
  }

  async toggleActive(id: string, user: AuthenticatedUser): Promise<SupplierDto> {
    const existing = await this.findOne(id);
    const nextStatus = !existing.isActive;

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: { isActive: nextStatus },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      entity: 'SUPPLIER',
      entityId: updated.id,
      details: `Tedarikçi durumu değiştirildi: ${updated.name} -> ${nextStatus ? 'AKTİF' : 'PASİF'}`,
    });

    return updated;
  }
}
