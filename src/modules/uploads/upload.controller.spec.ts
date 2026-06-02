import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessContextService } from '../../common/services/access-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: {
    uploadFile: jest.Mock;
    deleteFile: jest.Mock;
  };
  let accessContextService: {
    getOrganizationIdOrThrow: jest.Mock;
    ensureBranchManagerAccessToBranch: jest.Mock;
  };
  let prisma: any;

  beforeEach(async () => {
    uploadService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    accessContextService = {
      getOrganizationIdOrThrow: jest.fn(),
      ensureBranchManagerAccessToBranch: jest.fn(),
    };
    prisma = {
      branch: {
        findFirst: jest.fn(),
      },
      room: {
        findFirst: jest.fn(),
      },
      branchImage: {
        aggregate: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      roomImage: {
        aggregate: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: uploadService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
  });

  it('parses multipart fields and resets existing branch covers on upload', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    prisma.branch.findFirst.mockResolvedValue({ id: 'branch-1' });
    prisma.branchImage.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
    prisma.branchImage.create.mockResolvedValue({ id: 'img-1' });
    uploadService.uploadFile.mockResolvedValue({
      public_id: 'branches/branch-1/pool',
      secure_url: 'https://cdn.example.com/pool.webp',
    });

    const req = {
      file: jest.fn().mockResolvedValue({
        filename: 'pool.webp',
        mimetype: 'image/webp',
        fields: {
          altText: { value: '  Pool deck  ' },
          isCover: { value: 'true' },
        },
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('image')),
      }),
    };

    await controller.uploadBranchImage(
      'branch-1',
      'user-1',
      'BRANCH_MANAGER',
      req as any,
    );

    expect(accessContextService.ensureBranchManagerAccessToBranch).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'BRANCH_MANAGER',
      'branch-1',
      'branch images',
    );
    expect(prisma.branchImage.updateMany).toHaveBeenCalledWith({
      where: { branchId: 'branch-1', isCover: true },
      data: { isCover: false },
    });
    expect(prisma.branchImage.create).toHaveBeenCalledWith({
      data: {
        branchId: 'branch-1',
        cloudinaryPublicId: 'branches/branch-1/pool',
        url: 'https://cdn.example.com/pool.webp',
        altText: 'Pool deck',
        isCover: true,
        sortOrder: 3,
      },
      select: {
        id: true,
        cloudinaryPublicId: true,
        url: true,
        altText: true,
        isCover: true,
        sortOrder: true,
      },
    });
  });

  it('scopes room uploads to the room branch and ignores archived rooms/branches', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    prisma.room.findFirst.mockResolvedValue({
      id: 'room-1',
      branchId: 'branch-2',
    });
    prisma.roomImage.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
    prisma.roomImage.create.mockResolvedValue({ id: 'img-2' });
    uploadService.uploadFile.mockResolvedValue({
      public_id: 'rooms/room-1/bed',
      secure_url: 'https://cdn.example.com/bed.png',
    });

    const req = {
      file: jest.fn().mockResolvedValue({
        filename: 'bed.png',
        mimetype: 'image/png',
        fields: {},
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('image')),
      }),
    };

    await controller.uploadRoomImage(
      'room-1',
      'user-1',
      'BRANCH_MANAGER',
      req as any,
    );

    expect(prisma.room.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'room-1',
        deletedAt: null,
        branch: { organizationId: 'org-1', deletedAt: null },
      },
      select: {
        id: true,
        branchId: true,
      },
    });
    expect(accessContextService.ensureBranchManagerAccessToBranch).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'BRANCH_MANAGER',
      'branch-2',
      'room images',
    );
  });

  it('rejects unsupported image mime types', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    prisma.branch.findFirst.mockResolvedValue({ id: 'branch-1' });

    const req = {
      file: jest.fn().mockResolvedValue({
        filename: 'banner.gif',
        mimetype: 'image/gif',
        fields: {},
        toBuffer: jest.fn(),
      }),
    };

    await expect(
      controller.uploadBranchImage(
        'branch-1',
        'user-1',
        'ORG_MANAGER',
        req as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadService.uploadFile).not.toHaveBeenCalled();
  });

  it('updates branch image metadata in the branch_images table', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    prisma.branchImage.findFirst.mockResolvedValue({
      id: 'img-1',
      branchId: 'branch-1',
      cloudinaryPublicId: 'branches/branch-1/pool',
    });
    prisma.branchImage.update.mockResolvedValue({
      id: 'img-1',
      url: 'https://cdn.example.com/pool.webp',
      isCover: false,
      sortOrder: 4,
      altText: 'Updated',
    });

    await controller.updateImage('img-1', 'user-1', 'BRANCH_MANAGER', {
      altText: 'Updated',
      sortOrder: 4,
    });

    expect(accessContextService.ensureBranchManagerAccessToBranch).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'BRANCH_MANAGER',
      'branch-1',
      'branch images',
    );
    expect(prisma.branchImage.update).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: { altText: 'Updated', sortOrder: 4 },
      select: {
        id: true,
        url: true,
        isCover: true,
        sortOrder: true,
        altText: true,
      },
    });
    expect(prisma.roomImage.update).not.toHaveBeenCalled();
  });
});
