import { Test, TestingModule } from '@nestjs/testing';
import { RoomRatesService } from './room-rates.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RoomRatesService', () => {
  let service: RoomRatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomRatesService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<RoomRatesService>(RoomRatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
