import { Injectable } from "@nestjs/common";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, resolve } from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadEnv } from "../common/env.js";

@Injectable()
export class DocumentStorageService {
  private readonly env = loadEnv();
  private readonly s3 = this.env.EDUCORE_STORAGE_BACKEND === "s3"
    ? new S3Client({
        region: this.env.EDUCORE_S3_REGION,
        endpoint: this.env.EDUCORE_S3_ENDPOINT,
        forcePathStyle: Boolean(this.env.EDUCORE_S3_ENDPOINT),
        credentials: this.env.EDUCORE_S3_ACCESS_KEY_ID && this.env.EDUCORE_S3_SECRET_ACCESS_KEY
          ? { accessKeyId: this.env.EDUCORE_S3_ACCESS_KEY_ID, secretAccessKey: this.env.EDUCORE_S3_SECRET_ACCESS_KEY }
          : undefined,
      })
    : undefined;
  private readonly root = resolve(
    process.env["EDUCORE_STORAGE_DIR"] ?? join(process.cwd(), "storage", "private"),
  );

  async put(key: string, data: Buffer) {
    this.assertConfigured();
    if (this.s3) {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.requiredBucket(),
        Key: key,
        Body: data,
        ServerSideEncryption: "AES256",
      }));
      return key;
    }
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data, { flag: "wx" });
    return path;
  }

  async read(key: string) {
    this.assertConfigured();
    if (this.s3) {
      const response = await this.s3.send(new GetObjectCommand({ Bucket: this.requiredBucket(), Key: key }));
      if (!response.Body) throw new Error("Document storage returned an empty object body");
      return Buffer.from(await response.Body.transformToByteArray());
    }
    return readFile(this.pathFor(key));
  }

  async remove(key: string) {
    this.assertConfigured();
    if (this.s3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.requiredBucket(), Key: key }));
      return;
    }
    await rm(this.pathFor(key), { force: true });
  }

  async signedDownloadUrl(key: string) {
    this.assertConfigured();
    if (!this.s3) return undefined;
    return getSignedUrl(this.s3, new GetObjectCommand({
      Bucket: this.requiredBucket(),
      Key: key,
      ResponseContentDisposition: "attachment",
    }), { expiresIn: 300 });
  }

  private pathFor(key: string) {
    if (!key || isAbsolute(key)) throw new Error("Invalid private storage key");
    const path = resolve(this.root, normalize(key));
    if (
      path !== this.root &&
      !path.startsWith(`${this.root}\\`) &&
      !path.startsWith(`${this.root}/`)
    ) {
      throw new Error("Invalid private storage key");
    }
    return path;
  }

  private assertConfigured() {
    if (this.env.EDUCORE_STORAGE_BACKEND === "s3" && !this.s3) throw new Error("S3 storage is not configured");
    if (this.env.NODE_ENV === "production" && this.env.EDUCORE_STORAGE_BACKEND !== "s3") throw new Error("Local document storage is disabled in production");
  }

  private requiredBucket() {
    if (!this.env.EDUCORE_S3_BUCKET) throw new Error("S3 bucket is not configured");
    return this.env.EDUCORE_S3_BUCKET;
  }
}
