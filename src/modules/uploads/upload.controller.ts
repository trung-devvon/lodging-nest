import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessContextService } from '../../common/services/access-context.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { successResponseSchema } from '../../common/swagger/response-schema.util';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateImageDto } from './dto/update-image.dto';
import { UploadService } from './upload.service';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type ImageRecord =
  | {
      imageType: 'branch';
      id: string;
      branchId: string;
      cloudinaryPublicId: string;
    }
  | {
      imageType: 'room';
      id: string;
      roomId: string;
      branchId: string;
      cloudinaryPublicId: string;
    };

@ApiTags('Uploads')
@Controller('uploads')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly accessContextService: AccessContextService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('branches/:branchId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Upload branch image' })
  @ApiParam({ name: 'branchId', example: 'uuid-branch-001' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        altText: { type: 'string', example: 'Ho boi tang thuong' },
        isCover: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded',
    schema: successResponseSchema({
      id: 'uuid-img-001',
      cloudinaryPublicId: 'branches/uuid-branch-001/hoboi_abc123',
      url: 'https://res.cloudinary.com/demo/image/upload/branches/uuid-branch-001/hoboi_abc123.jpg',
      altText: 'Ho boi tang thuong',
      isCover: true,
      sortOrder: 1,
    }),
  })
  async uploadBranchImage(
    @Param('branchId') branchId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Req() req: FastifyRequest,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) throw new BadRequestException('Branch not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      branchId,
      'branch images',
    );

    const file = await req.file();
    if (!file) throw new BadRequestException('File is required');

    this.ensureSupportedImage(file.mimetype);

    const buffer = await file.toBuffer();
    const altText = this.getMultipartTextField(file, 'altText');
    const isCover = this.getMultipartBooleanField(file, 'isCover');
    const result = await this.uploadService.uploadFile(
      { buffer, originalname: file.filename, mimetype: file.mimetype },
      `branches/${branchId}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const maxOrder = await tx.branchImage.aggregate({
        where: { branchId },
        _max: { sortOrder: true },
      });

      if (isCover) {
        await tx.branchImage.updateMany({
          where: { branchId, isCover: true },
          data: { isCover: false },
        });
      }

      return tx.branchImage.create({
        data: {
          branchId,
          cloudinaryPublicId: result.public_id,
          url: result.secure_url,
          altText,
          isCover,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
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
  }

  @Post('rooms/:roomId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Upload room image' })
  @ApiParam({ name: 'roomId', example: 'uuid-room-001' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        altText: { type: 'string', example: 'Goc giuong ngu' },
        isCover: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded',
    schema: successResponseSchema({
      id: 'uuid-img-101',
      cloudinaryPublicId: 'rooms/uuid-room-001/room101_xyz789',
      url: 'https://res.cloudinary.com/demo/image/upload/rooms/uuid-room-001/room101_xyz789.jpg',
      altText: 'Goc giuong ngu',
      isCover: false,
      sortOrder: 2,
    }),
  })
  async uploadRoomImage(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Req() req: FastifyRequest,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);

    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
        branch: { organizationId, deletedAt: null },
      },
      select: {
        id: true,
        branchId: true,
      },
    });
    if (!room) throw new BadRequestException('Room not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      room.branchId,
      'room images',
    );

    const file = await req.file();
    if (!file) throw new BadRequestException('File is required');

    this.ensureSupportedImage(file.mimetype);

    const buffer = await file.toBuffer();
    const altText = this.getMultipartTextField(file, 'altText');
    const isCover = this.getMultipartBooleanField(file, 'isCover');
    const result = await this.uploadService.uploadFile(
      { buffer, originalname: file.filename, mimetype: file.mimetype },
      `rooms/${roomId}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const maxOrder = await tx.roomImage.aggregate({
        where: { roomId },
        _max: { sortOrder: true },
      });

      if (isCover) {
        await tx.roomImage.updateMany({
          where: { roomId, isCover: true },
          data: { isCover: false },
        });
      }

      return tx.roomImage.create({
        data: {
          roomId,
          cloudinaryPublicId: result.public_id,
          url: result.secure_url,
          altText,
          isCover,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
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
  }

  @Patch('images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update image metadata' })
  @ApiParam({ name: 'imageId', example: 'uuid-img-001' })
  @ApiBody({ type: UpdateImageDto })
  @ApiResponse({
    status: 200,
    description: 'Image updated',
    schema: successResponseSchema({
      id: 'uuid-img-001',
      url: 'https://res.cloudinary.com/demo/image/upload/branches/uuid-branch-001/hoboi_abc123.jpg',
      isCover: true,
      sortOrder: 1,
      altText: 'Ho boi tang thuong',
    }),
  })
  async updateImage(
    @Param('imageId') imageId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateImageDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    const image = await this.findImageInOrg(imageId, organizationId);
    if (!image) throw new BadRequestException('Image not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      image.branchId,
      image.imageType === 'branch' ? 'branch images' : 'room images',
    );

    if (image.imageType === 'branch') {
      return this.prisma.$transaction(async (tx) => {
        if (dto.isCover) {
          await tx.branchImage.updateMany({
            where: { branchId: image.branchId, isCover: true, id: { not: imageId } },
            data: { isCover: false },
          });
        }

        return tx.branchImage.update({
          where: { id: imageId },
          data: dto,
          select: {
            id: true,
            url: true,
            isCover: true,
            sortOrder: true,
            altText: true,
          },
        });
      });
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isCover) {
        await tx.roomImage.updateMany({
          where: { roomId: image.roomId, isCover: true, id: { not: imageId } },
          data: { isCover: false },
        });
      }

      return tx.roomImage.update({
        where: { id: imageId },
        data: dto,
        select: {
          id: true,
          url: true,
          isCover: true,
          sortOrder: true,
          altText: true,
        },
      });
    });
  }

  @Delete('images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Delete image' })
  @ApiParam({ name: 'imageId', example: 'uuid-img-001' })
  @ApiResponse({
    status: 200,
    description: 'Image deleted',
    schema: successResponseSchema({ message: 'Anh da duoc xoa' }),
  })
  async deleteImage(
    @Param('imageId') imageId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    const image = await this.findImageInOrg(imageId, organizationId);
    if (!image) throw new BadRequestException('Image not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      image.branchId,
      image.imageType === 'branch' ? 'branch images' : 'room images',
    );

    if (image.imageType === 'branch') {
      await this.prisma.branchImage.delete({ where: { id: imageId } });
    } else {
      await this.prisma.roomImage.delete({ where: { id: imageId } });
    }

    await this.uploadService.deleteFile(image.cloudinaryPublicId);

    return { message: 'Image deleted' };
  }

  private ensureSupportedImage(mimetype: string) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimetype)) {
      throw new BadRequestException(
        'Only jpg, png, and webp images are allowed',
      );
    }
  }

  private getMultipartTextField(
    file: { fields?: Record<string, unknown> },
    name: string,
  ): string | undefined {
    const field = file.fields?.[name] as { value?: unknown } | undefined;
    const value = field?.value;
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private getMultipartBooleanField(
    file: { fields?: Record<string, unknown> },
    name: string,
  ) {
    const field = file.fields?.[name] as { value?: unknown } | undefined;
    return field?.value === 'true';
  }

  private async findImageInOrg(
    imageId: string,
    organizationId: string,
  ): Promise<ImageRecord | null> {
    const branchImage = await this.prisma.branchImage.findFirst({
      where: {
        id: imageId,
        branch: { organizationId, deletedAt: null },
      },
      select: {
        id: true,
        branchId: true,
        cloudinaryPublicId: true,
      },
    });
    if (branchImage) {
      return {
        imageType: 'branch',
        id: branchImage.id,
        branchId: branchImage.branchId,
        cloudinaryPublicId: branchImage.cloudinaryPublicId,
      };
    }

    const roomImage = await this.prisma.roomImage.findFirst({
      where: {
        id: imageId,
        room: {
          deletedAt: null,
          branch: {
            organizationId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        roomId: true,
        cloudinaryPublicId: true,
        room: {
          select: {
            branchId: true,
          },
        },
      },
    });

    if (!roomImage) {
      return null;
    }

    return {
      imageType: 'room',
      id: roomImage.id,
      roomId: roomImage.roomId,
      branchId: roomImage.room.branchId,
      cloudinaryPublicId: roomImage.cloudinaryPublicId,
    };
  }
}
