import { Test, TestingModule } from '@nestjs/testing';
import { AccessContextService } from '../../common/services/access-context.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: {
    findAll: jest.Mock;
  };
  let accessContextService: {
    getOrganizationIdOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    auditService = {
      findAll: jest.fn(),
    };
    accessContextService = {
      getOrganizationIdOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: auditService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('forces org owners to query within their own organization', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    auditService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll('owner-1', 'ORG_OWNER', { action: 'BOOKING_CREATED' });

    expect(auditService.findAll).toHaveBeenCalledWith(
      {
        userId: 'owner-1',
        role: 'ORG_OWNER',
        organizationId: 'org-1',
      },
      { action: 'BOOKING_CREATED' },
    );
  });

  it('lets super admins query without resolving an organization', async () => {
    auditService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll('admin-1', 'SUPER_ADMIN', { organizationId: 'org-2' });

    expect(accessContextService.getOrganizationIdOrThrow).not.toHaveBeenCalled();
    expect(auditService.findAll).toHaveBeenCalledWith(
      {
        userId: 'admin-1',
        role: 'SUPER_ADMIN',
        organizationId: undefined,
      },
      { organizationId: 'org-2' },
    );
  });
});
