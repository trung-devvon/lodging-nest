import { Test, TestingModule } from '@nestjs/testing';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { AccessContextService } from '../../common/services/access-context.service';

describe('BranchesController', () => {
  let controller: BranchesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchesController],
      providers: [
        {
          provide: BranchesService,
          useValue: {},
        },
        {
          provide: AccessContextService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<BranchesController>(BranchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
