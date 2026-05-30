import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

@Injectable()
export class ProvincesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.province.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, region: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.province.findMany({
      select: { id: true, name: true, slug: true, region: true, isActive: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(dto: CreateProvinceDto) {
    const existing = await this.prisma.province.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Province slug already exists');

    return this.prisma.province.create({
      data: dto,
      select: { id: true, name: true, slug: true, region: true, isActive: true },
    });
  }

  async update(id: string, dto: UpdateProvinceDto) {
    const province = await this.prisma.province.findUnique({ where: { id } });
    if (!province) throw new NotFoundException('Province not found');

    if (dto.slug && dto.slug !== province.slug) {
      const existing = await this.prisma.province.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException('Province slug already exists');
    }

    return this.prisma.province.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, slug: true, region: true, isActive: true, sortOrder: true },
    });
  }
}
