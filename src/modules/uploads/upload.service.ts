import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

@Injectable()
export class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  async uploadFile(
    file: { buffer: Buffer; originalname?: string; mimetype?: string },
    folder = 'uploads',
  ): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as CloudinaryResponse);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
