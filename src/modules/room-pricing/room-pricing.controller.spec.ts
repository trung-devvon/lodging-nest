import { Test, TestingModule } from '@nestjs/testing';
import { RoomPricingController } from './room-pricing.controller';
import { RoomPricingService } from './room-pricing.service';
import { AccessContextService } from '../../common/services/access-context.service';

describe('RoomPricingController', () => {
  let controller: RoomPricingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomPricingController],
      providers: [
        {
          provide: RoomPricingService,
          useValue: {},
        },
        {
          provide: AccessContextService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<RoomPricingController>(RoomPricingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
