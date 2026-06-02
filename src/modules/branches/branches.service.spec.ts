import { Test, TestingModule } from '@nestjs/testing';
import { BranchesService } from './branches.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessContextService } from '../../common/services/access-context.service';

describe('BranchesService', () => {
  let service: BranchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: AccessContextService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<BranchesService>(BranchesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
