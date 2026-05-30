import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { UploadService } from './upload.service';
import { UpdateImageDto } from './dto/update-image.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BranchesService } from '../branches/branches.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly branchesService: BranchesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('branches/:branchId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload branch image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        altText: { type: 'string' },
        isCover: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  async uploadBranchImage(
    @Param('branchId') branchId: string,
    @CurrentUser('id') userId: string,
    @Req() req: FastifyRequest,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId: orgId, deletedAt: null },
    });
    if (!branch) throw new BadRequestException('Branch not found');

    const file = await req.file();
    if (!file) throw new BadRequestException('File is required');

    const buffer = await file.toBuffer();
    const result = await this.uploadService.uploadFile(
      { buffer, originalname: file.filename, mimetype: file.mimetype },
      `branches/${branchId}`,
    );

    const maxOrder = await this.prisma.branchImage.aggregate({
      where: { branchId },
      _max: { sortOrder: true },
    });

    const image = await this.prisma.branchImage.create({
      data: {
        branchId,
        cloudinaryPublicId: result.public_id,
        url: result.secure_url,
        altText: (req as any).fields?.altText,
        isCover: (req as any).fields?.isCover === 'true',
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

    return image;
  }

  @Post('rooms/:roomId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload room image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        altText: { type: 'string' },
        isCover: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  async uploadRoomImage(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @Req() req: FastifyRequest,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');

    const room = await this.prisma.room.findFirst({
      where: { id: roomId, branch: { organizationId: orgId }, deletedAt: null },
    });
    if (!room) throw new BadRequestException('Room not found');

    const file = await req.file();
    if (!file) throw new BadRequestException('File is required');

    const buffer = await file.toBuffer();
    const result = await this.uploadService.uploadFile(
      { buffer, originalname: file.filename, mimetype: file.mimetype },
      `rooms/${roomId}`,
    );

    const maxOrder = await this.prisma.roomImage.aggregate({
      where: { roomId },
      _max: { sortOrder: true },
    });

    const image = await this.prisma.roomImage.create({
      data: {
        roomId,
        cloudinaryPublicId: result.public_id,
        url: result.secure_url,
        altText: (req as any).fields?.altText,
        isCover: (req as any).fields?.isCover === 'true',
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

    return image;
  }

  @Patch('images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update image metadata' })
  @ApiResponse({ status: 200, description: 'Image updated' })
  async updateImage(
    @Param('imageId') imageId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateImageDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');

    const img = await this.findImageInOrg(imageId, orgId);
    if (!img) throw new BadRequestException('Image not found');

    const isBranchImg = 'branchId' in img;

    if (dto.isCover && isBranchImg) {
      await this.prisma.branchImage.updateMany({
        where: { branchId: (img as any).branchId, isCover: true, id: { not: imageId } },
        data: { isCover: false },
      });
      return this.prisma.branchImage.update({
        where: { id: imageId },
        data: dto,
        select: { id: true, url: true, isCover: true, sortOrder: true, altText: true },
      });
    }

    if (dto.isCover && !isBranchImg) {
      await this.prisma.roomImage.updateMany({
        where: { roomId: (img as any).roomId, isCover: true, id: { not: imageId } },
        data: { isCover: false },
      });
    }

    return this.prisma.roomImage.update({
      where: { id: imageId },
      data: dto,
      select: { id: true, url: true, isCover: true, sortOrder: true, altText: true },
    });
  }

  @Delete('images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete image' })
  @ApiResponse({ status: 200, description: 'Image deleted' })
  async deleteImage(
    @Param('imageId') imageId: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');

    const img = await this.findImageInOrg(imageId, orgId);
    if (!img) throw new BadRequestException('Image not found');

    const isBranchImg = 'branchId' in img;

    if (isBranchImg) {
      await this.prisma.branchImage.delete({ where: { id: imageId } });
    } else {
      await this.prisma.roomImage.delete({ where: { id: imageId } });
    }

    await this.uploadService.deleteFile((img as any).cloudinaryPublicId);

    return { message: 'Image deleted' };
  }

  private async findImageInOrg(imageId: string, organizationId: string): Promise<any> {
    const branchImg = await this.prisma.branchImage.findFirst({
      where: { id: imageId, branch: { organizationId, deletedAt: null } },
    });
    if (branchImg) return branchImg;

    const roomImg = await this.prisma.roomImage.findFirst({
      where: { id: imageId, room: { branch: { organizationId } } },
    });
    return roomImg;
  }
}
