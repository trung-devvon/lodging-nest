import { Test, TestingModule } from '@nestjs/testing';
import { RoomRatesService } from './room-rates.service';

describe('RoomRatesService', () => {
  let service: RoomRatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomRatesService],
    }).compile();

    service = module.get<RoomRatesService>(RoomRatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
