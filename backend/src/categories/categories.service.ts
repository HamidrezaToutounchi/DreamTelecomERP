import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerCategoryDto) {
    const existing = await this.prisma.customerCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Bu isimde bir kategori zaten mevcut.');
    }

    return this.prisma.customerCategory.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.customerCategory.findMany({
      include: {
        _count: {
          select: { customers: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.customerCategory.findUnique({
      where: { id },
      include: { _count: { select: { customers: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Kategori bulunamadı.');
    }

    return this.prisma.customerCategory.delete({
      where: { id },
    });
  }
}
