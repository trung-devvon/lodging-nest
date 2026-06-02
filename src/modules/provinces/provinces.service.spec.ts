import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProvincesService } from './provinces.service';

describe('ProvincesService', () => {
  let service: ProvincesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      province: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvincesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ProvincesService>(ProvincesService);
  });

  it('normalizes slug before creating province', async () => {
    prisma.province.findUnique.mockResolvedValue(null);
    prisma.province.create.mockResolvedValue({ id: 'prov-1' });

    await service.create({
      name: 'Phu Quoc',
      slug: '  Phu-Quoc  ',
      region: 'SOUTH' as any,
      sortOrder: 6,
    });

    expect(prisma.province.findUnique).toHaveBeenCalledWith({
      where: { slug: 'phu-quoc' },
    });
    expect(prisma.province.create).toHaveBeenCalledWith({
      data: {
        name: 'Phu Quoc',
        slug: 'phu-quoc',
        region: 'SOUTH',
        sortOrder: 6,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        isActive: true,
      },
    });
  });

  it('rejects duplicate slug after normalization on update', async () => {
    prisma.province.findUnique
      .mockResolvedValueOnce({ id: 'prov-1', slug: 'ha-noi' })
      .mockResolvedValueOnce({ id: 'prov-2', slug: 'phu-quoc' });

    await expect(
      service.update('prov-1', { slug: '  PHU-QUOC ' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('orders active provinces by sortOrder then name', async () => {
    prisma.province.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prisma.province.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, region: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  });
});
