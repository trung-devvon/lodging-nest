import { Test, TestingModule } from '@nestjs/testing';
import { RoomPricingController } from './room-pricing.controller';

describe('RoomPricingController', () => {
  let controller: RoomPricingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomPricingController],
    }).compile();

    controller = module.get<RoomPricingController>(RoomPricingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
