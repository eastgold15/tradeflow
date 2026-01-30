import { HttpError } from "elysia-http-problem-json";

// storage/Storage.ts
export abstract class Storage {
  protected config: S3Config;

  constructor(
    config: S3Config = {
      accessKeyId: "",
      secretAccessKey: "",
      bucket: "",
      endpoint: "",
      region: "",
    }
  ) {
    this.config = config;
  }

  // 核心上传方法 - 统一入口
  abstract upload(
    file: File | Blob | Buffer | string,
    path?: string // 允许指定路径，或者由内部生成
  ): Promise<{
    url: string;
    key: string;
    size: number;
    mimeType: string;
  }>;

  // 删除
  abstract delete(key: string): Promise<boolean>;

  // 检查存在
  abstract exists(key: string): Promise<boolean>;

  // 获取公开访问 URL
  abstract getPublicUrl(key: string): string;

  // 获取预签名 URL (用于私有读写)
  abstract getPresignedUrl(
    key: string,
    method: "GET" | "PUT",
    expiresIn?: number
  ): Promise<string>;

  // 通用辅助方法：生成唯一文件名
  protected generateKey(originalName: string, folder = "uploads"): string {
    const ext = originalName.split(".").pop()?.toLowerCase() || "bin";
    const name = originalName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    const random = Math.random().toString(36).slice(2, 8);
    const timestamp = Date.now();
    // return `${folder}/${timestamp}_${name}_${random}.${ext}`;
    return `${folder}/${name}_${random}.${ext}`;
  }

  // 通用辅助方法：数据归一化
  protected async normalizeFile(file: File | Blob | Buffer | string) {
    let body: Buffer;
    let size: number;
    let type = "application/octet-stream";

    if (file instanceof Blob) {
      body = Buffer.from(await file.arrayBuffer());
      size = file.size;
      type = file.type || type;
    } else if (Buffer.isBuffer(file)) {
      body = file;
      size = file.length;
    } else if (typeof file === "string") {
      body = Buffer.from(file);
      size = body.length;
    } else {

      throw new HttpError.BadRequest("Unsupported file type");
    }
    return { body, size, type };
  }
}
export interface UploadResponse {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}
export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string; // OSS 必须填，例如 https://oss-cn-hangzhou.aliyuncs.com
  region: string;
  domain?: string; // 自定义 CDN 域名
  isPublic?: boolean; // 是否是公共读 bucket
  baseDir?: string; // 基础目录，默认 "uploads"
  baseUrl?: string; // 基础 URL，默认 "https://{domain}/{baseDir}"
}
