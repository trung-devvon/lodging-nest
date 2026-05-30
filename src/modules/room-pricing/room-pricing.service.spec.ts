import { Test, TestingModule } from '@nestjs/testing';
import { RoomPricingService } from './room-pricing.service';

describe('RoomPricingService', () => {
  let service: RoomPricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomPricingService],
    }).compile();

    service = module.get<RoomPricingService>(RoomPricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
