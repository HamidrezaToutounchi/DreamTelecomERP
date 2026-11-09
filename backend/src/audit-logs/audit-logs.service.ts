import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto, PaginatedAuditLogResponseDto } from './dto/audit-log.dto';
import { Prisma, Role } from '@prisma/client';

export interface CreateAuditLogParams {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: Role | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Yeni bir işlem log kaydı oluşturur
   */
  async log(params: CreateAuditLogParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          userName: params.userName || null,
          userEmail: params.userEmail || null,
          userRole: params.userRole || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          details: params.details || null,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err) {
      // Loglama hatası ana akışı kesmemeli
      console.error('[AuditLogsService] Log kaydı oluşturulamadı:', err);
      return null;
    }
  }

  /**
   * Tüm audit logları filtreleyerek ve sayfalayarak listeler (Yalnızca Müdürler)
   */
  async findAll(query: AuditLogQueryDto): Promise<PaginatedAuditLogResponseDto> {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.AuditLogWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.action) {
      where.action = { equals: query.action, mode: 'insensitive' };
    }

    if (query.entity) {
      where.entity = { equals: query.entity, mode: 'insensitive' };
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const d = new Date(query.dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalRowCount, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      data: data as any,
      meta: {
        totalRowCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalRowCount / pageSize) || 1,
      },
    };
  }
}
