import { ConfigService } from '@/common/config/services/config.service';
import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';

@Injectable()
export class StorageService {
  private readonly s3: S3;

  constructor(private configService: ConfigService) {
    this.s3 = new S3();
  }

  async upload(dataBuffer: Buffer, filename: string, mimetype:string) {
    const uploadResult = await this.s3
      .upload({
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Body: dataBuffer,
        Key: `${uuid()}-${filename}`,
        ACL: 'public-read',
        ContentType: mimetype,
      })
      .promise();

    const filePath = this.extractFileNameFromS3Url(uploadResult.Location);

    return filePath;
  }


  get(filename: string) {
    if (!filename) return;

    const fileUrl = `${this.configService.get('AWS_CLOUDFRONT_DISTRIBUTION')}/${filename}`;
    return fileUrl;
  }

  async delete(filename: string) {
    if (!filename) {
      throw new Error('Filename is required for deletion');
    }

    const params = {
      Bucket: this.configService.get('AWS_BUCKET_NAME'),
      Key: filename,
    };

    try {
      await this.s3.deleteObject(params).promise();
      return { message: 'File successfully deleted from S3' };
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error('Error deleting file from S3');
    }
  }

  extractFileNameFromS3Url(url: string) {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      return filename;
    } catch (error) {
      return null;
    }
  }
}
