import { Injectable } from '@angular/core';
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
} from '@angular/fire/firestore';
import { environment } from '../../../environment';
import * as ExifReader from 'exifreader';
import { heicTo } from 'heic-to';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private s3Client: S3Client;
  private convertedImages: Map<string, Promise<File>> = new Map();

  private supportedImageFormats = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'image/bmp',
    'image/heic',
    'image/heif',
  ];

  private supportedVideoFormats = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/x-matroska',
    'video/3gpp',
    'video/3gpp2',
  ];

  constructor(private firestore: Firestore) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: environment.r2.endpoint,
      credentials: {
        accessKeyId: environment.r2.accessKeyId,
        secretAccessKey: environment.r2.secretAccessKey,
      },
    });
  }

  private getCookie(name: string): string {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) == 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return '';
  }

  async getTotalObjectCount(): Promise<number> {
    let totalCount = 0;
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: environment.r2.bucketName,
        Prefix: 'media/',
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });

      const response = await this.s3Client.send(command);
      totalCount += response.KeyCount || 0;
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return totalCount;
  }

  async uploadMultipleFiles(files: File[]): Promise<string[]> {
    const results: string[] = [];
    for (const file of files) {
      const result = await this.uploadFile(file);
      results.push(result);
    }
    return results;
  }

  async extractMetadata(file: File) {
    try {
      const tags = await ExifReader.load(file);
      let imageDate =
        tags['DateTimeOriginal']?.description ||
        tags['DateTime']?.description ||
        tags['CreateDate']?.description ||
        tags['ModifyDate']?.description;

      if (!imageDate) {
        imageDate = (tags['GPS'] as any)?.['GPSDateStamp']?.description;
      }

      return imageDate || null;
    } catch (error) {
      console.error('Error reading EXIF data:', error);
      return null;
    }
  }

  async extractVideoMetadata(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(new Date(video.duration * 1000).toISOString());
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
      video.src = URL.createObjectURL(file);
    });
  }

  private async convertHeicToJpeg(file: File): Promise<File> {
    if (!this.convertedImages.has(file.name)) {
      const conversionPromise = this.performConversion(file);
      this.convertedImages.set(file.name, conversionPromise);
    }
    return this.convertedImages.get(file.name)!;
  }

  private async performConversion(file: File): Promise<File> {
    try {
      const jpegBlob = await heicTo({
        type: 'image/jpeg',
        blob: file,
        quality: 1,
      });
      return new File(
        [jpegBlob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        {
          type: 'image/jpeg',
        }
      );
    } catch (error) {
      console.error('Error converting HEIC/HEIF to JPEG:', error);
      throw error;
    }
  }

  private checkFileSize(file: File, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      console.error(`File size exceeds the limit of ${maxSizeMB}MB`);
      return false;
    }
    return true;
  }

  private isImageFile(file: File): boolean {
    return (
      this.supportedImageFormats.includes(file.type) ||
      /\.(jpg|jpeg|png|gif|webp|tiff|bmp|heic|heif)$/i.test(file.name)
    );
  }

  private isVideoFile(file: File): boolean {
    return (
      this.supportedVideoFormats.includes(file.type) ||
      /\.(mp4|webm|ogg|mov|avi|wmv|mkv|3gp|3g2)$/i.test(file.name)
    );
  }

  private async uploadParts(
    arrayBuffer: ArrayBuffer,
    uploadId: string,
    key: string
  ): Promise<{ ETag: string; PartNumber: number }[]> {
    const chunkSize = 10 * 1024 * 1024;
    const concurrencyLimit = 4;
    const parts: { ETag: string; PartNumber: number }[] = [];
    const totalParts = Math.ceil(arrayBuffer.byteLength / chunkSize);

    for (let i = 0; i < totalParts; i += concurrencyLimit) {
      const uploadPromises = [];
      for (let j = 0; j < concurrencyLimit && i + j < totalParts; j++) {
        const partNumber = i + j + 1;
        const start = (i + j) * chunkSize;
        const end = Math.min(start + chunkSize, arrayBuffer.byteLength);
        const chunk = new Uint8Array(arrayBuffer.slice(start, end));

        uploadPromises.push(
          this.s3Client.send(
            new UploadPartCommand({
              Bucket: environment.r2.bucketName,
              Key: key,
              UploadId: uploadId,
              PartNumber: partNumber,
              Body: chunk,
            })
          )
        );
      }

      const results = await Promise.all(uploadPromises);
      parts.push(
        ...results.map((result, index) => ({
          ETag: result.ETag!,
          PartNumber: i + index + 1,
        }))
      );
    }

    return parts;
  }

  async uploadFile(file: File): Promise<string> {
    if (!this.checkFileSize(file, 100)) {
      throw new Error('File size exceeds the limit');
    }

    let uploadFile = file;
    let date: string | null = null;

    if (this.isImageFile(file)) {
      date = await this.extractMetadata(uploadFile);
      if (
        file.type === 'image/heic' ||
        file.name.toLowerCase().endsWith('.heic') ||
        file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heif')
      ) {
        uploadFile = await this.convertHeicToJpeg(file);
      }
    } else if (this.isVideoFile(file)) {
      date = await this.extractVideoMetadata(file);
    } else {
      throw new Error('Unsupported file type');
    }

    const key = `media/${Date.now()}_${uploadFile.name}`;

    try {
      const arrayBuffer = await uploadFile.arrayBuffer();
      const multipartUpload = await this.s3Client.send(
        new CreateMultipartUploadCommand({
          Bucket: environment.r2.bucketName,
          Key: key,
          ContentType: uploadFile.type,
        })
      );

      const uploadId = multipartUpload.UploadId!;
      const parts = await this.uploadParts(arrayBuffer, uploadId, key);

      await this.s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: environment.r2.bucketName,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        })
      );

      const mediaUrl = `${environment.r2.endpoint}/${environment.r2.bucketName}/${key}`;
      await this.storeMetadata(uploadFile, mediaUrl, date);
      return mediaUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  private async storeMetadata(
    file: File,
    mediaUrl: string,
    date: string | null
  ): Promise<void> {
    const isVideo = this.isVideoFile(file);
    await addDoc(collection(this.firestore, 'media'), {
      url: mediaUrl,
      filename: file.name,
      contentType: file.type,
      uploadedAt: new Date(),
      shotBy: this.getCookie('visitorName'),
      date,
      isVideo,
    });
  }

  async listR2Objects(): Promise<any[]> {
    const command = new ListObjectsV2Command({
      Bucket: environment.r2.bucketName,
      Prefix: 'media/',
    });
    const { Contents } = await this.s3Client.send(command);

    return Contents || [];
  }

  async getMediaMetadataPaginated(
    lastDoc: any,
    pageSize: number
  ): Promise<any[]> {
    let mediaQuery;
    if (lastDoc) {
      mediaQuery = query(
        collection(this.firestore, 'media'),
        orderBy('uploadedAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    } else {
      mediaQuery = query(
        collection(this.firestore, 'media'),
        orderBy('uploadedAt', 'desc'),
        limit(pageSize)
      );
    }
    const snapshot = await getDocs(mediaQuery);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getMediaWithMetadataPaginated(
    lastDoc: any,
    pageSize: number
  ): Promise<any[]> {
    const firestoreMetadata = await this.getMediaMetadataPaginated(
      lastDoc,
      pageSize
    );
    const objectsWithUrls = await Promise.all(
      firestoreMetadata.map(async (meta) => ({
        ...meta,
        url: await this.getPublicUrl(meta.url.split('/').pop()),
      }))
    );
    return objectsWithUrls;
  }

  async getPublicUrl(key: string): Promise<string> {
    // add the media prefix to get the image url correctly
    key = 'media/' + key;
    const command = new GetObjectCommand({
      Bucket: environment.r2.bucketName,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}
