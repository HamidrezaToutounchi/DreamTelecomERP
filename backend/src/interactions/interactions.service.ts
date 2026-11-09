import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInteractionDto,
  UpdateInteractionDto,
  InteractionQueryDto,
} from './dto/interaction.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/crm.enums';
import { Prisma } from '@prisma/client';

@Injectable()
export class InteractionsService {
  constructor(private prisma: PrismaService) {}

  private async checkTargetAccess(customerId?: string, leadId?: string, user?: AuthenticatedUser) {
    if (!customerId && !leadId) {
      throw new BadRequestException('customerId veya leadId alanlarından biri zorunludur.');
    }

    if (user?.role === Role.SALES_REP) {
      if (customerId) {
        const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
        if (customer.createdById !== user.id && customer.assignedToId !== user.id) {
          throw new ForbiddenException('Bu müşteriye görüşme ekleme yetkiniz yok.');
        }
      }
      if (leadId) {
        const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new NotFoundException('Lead bulunamadı.');
        if (lead.createdById !== user.id && lead.assignedToId !== user.id) {
          throw new ForbiddenException('Bu leade görüşme ekleme yetkiniz yok.');
        }
      }
    }
  }

  async create(dto: CreateInteractionDto, user: AuthenticatedUser) {
    await this.checkTargetAccess(dto.customerId, dto.leadId, user);

    const interaction = await this.prisma.interaction.create({
      data: {
        customerId: dto.customerId,
        leadId: dto.leadId,
        userId: user.id,
        type: dto.type,
        contactedPerson: dto.contactedPerson,
        summary: dto.summary,
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        customer: { select: { id: true, companyName: true } },
        lead: { select: { id: true, companyName: true } },
      },
    });

    // Update lastActionAt on lead if leadId is set
    if (dto.leadId) {
      await this.prisma.lead.update({
        where: { id: dto.leadId },
        data: { lastActionAt: new Date() },
      });
    }

    return interaction;
  }

  async getUpcomingFollowUps(user: AuthenticatedUser) {
    const where: Prisma.InteractionWhereInput = {
      nextFollowUpDate: { not: null },
    };

    if (user.role === Role.SALES_REP) {
      where.OR = [
        { userId: user.id },
        { customer: { assignedToId: user.id } },
        { lead: { assignedToId: user.id } },
      ];
    }

    const interactions = await this.prisma.interaction.findMany({
      where,
      orderBy: { nextFollowUpDate: 'asc' },
      take: 20,
      include: {
        customer: { select: { id: true, companyName: true, contactPerson: true, phone: true } },
        lead: { select: { id: true, companyName: true, contactName: true, phone: true } },
        user: { select: { id: true, fullName: true } },
      },
    });

    const now = new Date();
    return interactions.map((i) => ({
      ...i,
      isOverdue: i.nextFollowUpDate ? new Date(i.nextFollowUpDate) < now : false,
    }));
  }

  async findAll(query: InteractionQueryDto, user: AuthenticatedUser) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.InteractionWhereInput = {};

    if (user.role === Role.SALES_REP) {
      where.OR = [
        { userId: user.id },
        { customer: { assignedToId: user.id } },
        { lead: { assignedToId: user.id } },
      ];
    } else if (query.repId) {
      where.userId = query.repId;
    }

    if (query.customerId) where.customerId = query.customerId;
    if (query.leadId) where.leadId = query.leadId;
    if (query.interactionType) where.type = query.interactionType;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    if (query.search) {
      const search = query.search.trim();
      where.AND = [
        {
          OR: [
            { contactedPerson: { contains: search, mode: 'insensitive' } },
            { summary: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [totalRowCount, data] = await Promise.all([
      this.prisma.interaction.count({ where }),
      this.prisma.interaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          customer: { select: { id: true, companyName: true } },
          lead: { select: { id: true, companyName: true } },
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
    const interaction = await this.prisma.interaction.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        customer: true,
        lead: true,
      },
    });

    if (!interaction) {
      throw new NotFoundException('Etkileşim kaydı bulunamadı.');
    }

    if (user.role === Role.SALES_REP && interaction.userId !== user.id) {
      if (
        (!interaction.customer || interaction.customer.assignedToId !== user.id) &&
        (!interaction.lead || interaction.lead.assignedToId !== user.id)
      ) {
        throw new ForbiddenException('Bu etkileşim kaydına erişim yetkiniz yok.');
      }
    }

    return interaction;
  }

  async update(id: string, dto: UpdateInteractionDto, user: AuthenticatedUser) {
    await this.findOne(id, user);

    return this.prisma.interaction.update({
      where: { id },
      data: {
        type: dto.type,
        contactedPerson: dto.contactedPerson,
        summary: dto.summary,
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        customer: { select: { id: true, companyName: true } },
        lead: { select: { id: true, companyName: true } },
      },
    });
  }
}
