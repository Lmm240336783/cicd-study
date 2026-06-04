"use client";

import { TosClient } from "@volcengine/tos-sdk";

const PDF_UPLOAD_SESSION_STORAGE_PREFIX = "book-pdf-upload-session:";

type RequestBookPdfUploadSessionResponse = {
  data?: {
    bucketName: string;
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken: string;
    };
    endpoint: string;
    expiresInSeconds: number;
    multipartChunkSize: number;
    objectKey: string;
    region: string;
  };
  message?: string;
};

type SavedUploadPart = {
  eTag: string;
  partNumber: number;
};

type SavedUploadState = {
  chunkSize: number;
  fileFingerprint: string;
  fileName: string;
  fileSize: number;
  objectKey: string;
  parts: SavedUploadPart[];
  uploadId: string;
};

export type BookPdfMultipartUploadResult = {
  fileName: string;
  fileSize: number;
  objectKey: string;
};

type UploadChunkRange = {
  end: number;
  partNumber: number;
  start: number;
};

/** 把文件信息压成一个稳定指纹，让同一个文件可以读取到上次未完成的续传状态。 */
function createFileFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/** 根据文件指纹生成 localStorage 键名，避免不同文件的续传状态互相覆盖。 */
function buildUploadStateStorageKey(fileFingerprint: string) {
  return `${PDF_UPLOAD_SESSION_STORAGE_PREFIX}${fileFingerprint}`;
}

/** 
 * 读取上次保存的续传状态。
 * 这里把 uploadId 和已完成分片放进 localStorage，
 * 是为了页面刷新后还能知道“这份文件已经传到哪一片了”。
 */
function readSavedUploadState(fileFingerprint: string): SavedUploadState | null {
  const rawValue = window.localStorage.getItem(buildUploadStateStorageKey(fileFingerprint));
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as SavedUploadState;
  } catch {
    return null;
  }
}

/** 
 * 每完成一片就把最新上传状态写回 localStorage。
 * 这样即使浏览器中途刷新，下一次也能从已完成分片继续，而不是从 0 重新传整份大文件。
 */
function saveUploadState(fileFingerprint: string, state: SavedUploadState) {
  window.localStorage.setItem(buildUploadStateStorageKey(fileFingerprint), JSON.stringify(state));
}

/** 
 * 只有在 completeMultipartUpload 成功后才清理本地续传状态。
 * 如果最后合并对象失败，我们必须保留 uploadId 和已完成分片，否则用户会失去续传上下文。
 */
function clearUploadState(fileFingerprint: string) {
  window.localStorage.removeItem(buildUploadStateStorageKey(fileFingerprint));
}

/** 按分片大小切出文件区间列表，后面每一片都会单独调用一次 uploadPart。 */
function buildChunkRanges(fileSize: number, chunkSize: number): UploadChunkRange[] {
  const ranges: UploadChunkRange[] = [];
  let partNumber = 1;

  for (let start = 0; start < fileSize; start += chunkSize) {
    ranges.push({
      start,
      end: Math.min(start + chunkSize, fileSize),
      partNumber,
    });
    partNumber += 1;
  }

  return ranges;
}

/** 统一把后端错误消息提取成可读异常，避免浏览器里只看到笼统的上传失败。 */
async function readJsonMessage(response: Response, fallbackMessage: string) {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return fallbackMessage;
  }

  try {
    const data = JSON.parse(rawText) as { message?: string };
    return typeof data.message === "string" && data.message.trim() ? data.message : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

/** 
 * 先向站内接口申请一次上传会话。
 * 浏览器真正开始上传前必须先拿到 objectKey、bucket、endpoint 和 STS，
 * 否则它既不知道文件该落到哪里，也没有权限直接向 TOS 发起分片请求。
 */
async function requestBookPdfUploadSession(file: File, objectKey?: string) {
  const response = await fetch("/api/admin/books/upload-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      objectKey,
    }),
  });

  const rawText = await response.text();
  const result = rawText.trim() ? (JSON.parse(rawText) as RequestBookPdfUploadSessionResponse) : {};
  if (!response.ok || !result.data) {
    throw new Error(await readJsonMessage(new Response(rawText, { status: response.status }), "PDF 上传会话申请失败"));
  }

  return result.data;
}

/** 用本次会话下发的 STS 临时凭证创建浏览器端 TOS client。 */
function createBrowserTosClient(session: NonNullable<RequestBookPdfUploadSessionResponse["data"]>) {
  return new TosClient({
    accessKeyId: session.credentials.accessKeyId,
    accessKeySecret: session.credentials.secretAccessKey,
    stsToken: session.credentials.sessionToken,
    region: session.region,
    endpoint: session.endpoint,
    bucket: session.bucketName,
  });
}

/** 把服务端已知的分片结果和本地缓存合并，优先相信 TOS 端真实存在的分片。 */
function mergeUploadedParts(serverParts: SavedUploadPart[], localParts: SavedUploadPart[]) {
  const partsByNumber = new Map<number, SavedUploadPart>();

  for (const part of [...localParts, ...serverParts]) {
    partsByNumber.set(part.partNumber, part);
  }

  return [...partsByNumber.values()].sort((leftPart, rightPart) => leftPart.partNumber - rightPart.partNumber);
}

/** 读取当前 uploadId 在 TOS 里已经成功保存的分片清单。 */
async function readUploadedPartsFromServer(client: TosClient, objectKey: string, uploadId: string) {
  const response = await client.listParts({
    key: objectKey,
    uploadId,
  });

  return (response.data.Parts ?? []).map((part) => ({
    partNumber: part.PartNumber,
    eTag: part.ETag,
  }));
}

/** 
 * 用 TOS 分片上传图书 PDF。
 * 这里显式拆成 createMultipartUpload -> uploadPart -> completeMultipartUpload，
 * 是为了让大文件在失败、刷新、网络抖动时还能继续上传，而不是整份重来。
 */
export async function uploadBookPdfWithMultipart(file: File): Promise<BookPdfMultipartUploadResult> {
  if (file.type !== "application/pdf") {
    throw new Error("请选择 PDF 文件");
  }

  const fileFingerprint = createFileFingerprint(file);
  const savedState = readSavedUploadState(fileFingerprint);
  const session = await requestBookPdfUploadSession(file, savedState?.objectKey);
  const client = createBrowserTosClient(session);
  const objectKey = savedState?.objectKey || session.objectKey;

  let uploadId = savedState?.uploadId ?? "";
  if (!uploadId) {
    const createResponse = await client.createMultipartUpload({
      key: objectKey,
      contentType: "application/pdf",
    });
    uploadId = createResponse.data.UploadId;
  }

  const serverUploadedParts = await readUploadedPartsFromServer(client, objectKey, uploadId);
  const uploadedParts = mergeUploadedParts(serverUploadedParts, savedState?.parts ?? []);
  const uploadedPartNumbers = new Set(uploadedParts.map((part) => part.partNumber));
  const chunkRanges = buildChunkRanges(file.size, session.multipartChunkSize);

  saveUploadState(fileFingerprint, {
    fileFingerprint,
    fileName: file.name,
    fileSize: file.size,
    objectKey,
    uploadId,
    chunkSize: session.multipartChunkSize,
    parts: uploadedParts,
  });

  for (const chunkRange of chunkRanges) {
    if (uploadedPartNumbers.has(chunkRange.partNumber)) {
      continue;
    }

    const chunk = file.slice(chunkRange.start, chunkRange.end);
    const response = await client.uploadPart({
      key: objectKey,
      uploadId,
      partNumber: chunkRange.partNumber,
      body: chunk,
    });

    uploadedParts.push({
      partNumber: chunkRange.partNumber,
      eTag: response.data.ETag,
    });
    uploadedParts.sort((leftPart, rightPart) => leftPart.partNumber - rightPart.partNumber);

    saveUploadState(fileFingerprint, {
      fileFingerprint,
      fileName: file.name,
      fileSize: file.size,
      objectKey,
      uploadId,
      chunkSize: session.multipartChunkSize,
      parts: uploadedParts,
    });
  }

  /** 
   * completeMultipartUpload 成功前，这份文件都还只是“一组分片”。
   * 所以这里绝不能在调用 complete 之前提前清理状态或假定文件已经能访问。
   */
  await client.completeMultipartUpload({
    key: objectKey,
    uploadId,
    parts: uploadedParts.map((part) => ({
      partNumber: part.partNumber,
      eTag: part.eTag,
    })),
  });

  clearUploadState(fileFingerprint);

  return {
    objectKey,
    fileName: file.name,
    fileSize: file.size,
  };
}
