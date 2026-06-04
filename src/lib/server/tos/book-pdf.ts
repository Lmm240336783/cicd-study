import "server-only";

import { randomUUID } from "node:crypto";
import { TosClient } from "@volcengine/tos-sdk";
import { createTosTemporaryCredentials } from "@/lib/server/tos/sts";
import { getTosServerConfig } from "@/lib/server/tos/config";

const BOOK_PDF_OBJECT_PREFIX = "admin-book-pdfs";
const DEFAULT_BOOK_PDF_MULTIPART_CHUNK_SIZE = 8 * 1024 * 1024;

type CreateBookPdfUploadSessionInput = {
  fileName: string;
  fileSize: number;
  contentType: string;
  objectKey?: string;
};

type CreateBookPdfSignedDownloadUrlInput = {
  objectKey: string;
  fileName: string;
};

export type BookPdfUploadSession = {
  objectKey: string;
  multipartChunkSize: number;
  expiresInSeconds: number;
  region: string;
  endpoint: string;
  bucketName: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
};

/** 去掉文件名里不安全或不好读的字符，避免对象键中出现奇怪路径片段。 */
function sanitizeFileName(fileName: string) {
  return fileName.trim().replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-");
}

/** 判断本次上传是不是我们允许的 PDF 文件。 */
function isPdfUpload(fileName: string, contentType: string) {
  return contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}

/** 用服务端永久凭证创建 TOS client，专门处理签名和对象级管理。 */
function createTosServerClient() {
  const config = getTosServerConfig();
  return new TosClient({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.secretAccessKey,
    region: config.region,
    endpoint: config.endpoint,
    bucket: config.bucketName,
  });
}

/** 生成图书 PDF 的私有对象键，让后续数据库只存这个稳定键名。 */
export function createBookPdfObjectKey(fileName: string) {
  const safeFileName = sanitizeFileName(fileName) || "book.pdf";
  return `${BOOK_PDF_OBJECT_PREFIX}/${randomUUID()}-${safeFileName}`;
}

/** 
 * 给浏览器返回一次图书 PDF 上传会话。
 * 这里除了对象键，还会把分片大小和短时凭证一起返回，
 * 因为浏览器只有拿到这几项信息，才能直接对 TOS 发起分片上传。
 */
export async function createBookPdfUploadSession({
  fileName,
  fileSize,
  contentType,
  objectKey,
}: CreateBookPdfUploadSessionInput): Promise<BookPdfUploadSession> {
  if (!fileName.trim() || fileSize <= 0 || !isPdfUpload(fileName, contentType)) {
    throw new Error("Invalid PDF upload session payload");
  }

  const config = getTosServerConfig();
  const resolvedObjectKey = objectKey?.trim() || createBookPdfObjectKey(fileName);
  const credentials = await createTosTemporaryCredentials({
    durationSeconds: 3600,
    policy: JSON.stringify({
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "tos:CreateMultipartUpload",
            "tos:UploadPart",
            "tos:ListParts",
            "tos:CompleteMultipartUpload",
            "tos:AbortMultipartUpload",
          ],
          Resource: [`trn:tos:::${config.bucketName}/${resolvedObjectKey}`],
        },
      ],
    }),
  });

  return {
    objectKey: resolvedObjectKey,
    multipartChunkSize: DEFAULT_BOOK_PDF_MULTIPART_CHUNK_SIZE,
    expiresInSeconds: 3600,
    region: config.region,
    endpoint: config.endpoint,
    bucketName: config.bucketName,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  };
}

/** 把下载文件名整理成更适合塞进响应头的形式。 */
function buildInlineContentDisposition(fileName: string) {
  const safeFileName = sanitizeFileName(fileName) || "book.pdf";
  return `inline; filename*=UTF-8''${encodeURIComponent(safeFileName)}`;
}

/** 
 * 为私有 PDF 生成一个短时下载地址。
 * 页面和后台都不直接持久化这个地址，而是在每次访问时重新生成，
 * 这样链接过期后重新请求站内路由，仍然能拿到新的可访问地址。
 */
export async function createBookPdfSignedDownloadUrl({
  objectKey,
  fileName,
}: CreateBookPdfSignedDownloadUrlInput): Promise<string> {
  if (!objectKey.trim()) {
    throw new Error("Missing book pdf object key");
  }

  const client = createTosServerClient();
  const config = getTosServerConfig();

  return client.getPreSignedUrl({
    key: objectKey,
    method: "GET",
    expires: config.signedUrlExpiresSeconds,
    response: {
      contentDisposition: buildInlineContentDisposition(fileName),
      contentType: "application/pdf",
    },
  });
}
