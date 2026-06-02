import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findAllAdmin() {
    return this.prisma.province.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        isActive: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateProvinceDto) {
    const normalizedSlug = this.normalizeSlug(dto.slug);

    const existing = await this.prisma.province.findUnique({
      where: { slug: normalizedSlug },
    });
    if (existing) throw new ConflictException('Province slug already exists');

    return this.prisma.province.create({
      data: {
        ...dto,
        slug: normalizedSlug,
      },
      select: { id: true, name: true, slug: true, region: true, isActive: true },
    });
  }

  async update(id: string, dto: UpdateProvinceDto) {
    const province = await this.prisma.province.findUnique({ where: { id } });
    if (!province) throw new NotFoundException('Province not found');

    const normalizedSlug =
      dto.slug !== undefined ? this.normalizeSlug(dto.slug) : undefined;

    if (normalizedSlug && normalizedSlug !== province.slug) {
      const existing = await this.prisma.province.findUnique({
        where: { slug: normalizedSlug },
      });
      if (existing) throw new ConflictException('Province slug already exists');
    }

    return this.prisma.province.update({
      where: { id },
      data: {
        ...dto,
        ...(normalizedSlug ? { slug: normalizedSlug } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  private normalizeSlug(slug: string) {
    return slug.trim().toLowerCase();
  }
}
