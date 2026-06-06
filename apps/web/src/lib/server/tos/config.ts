import "server-only";

export type TosServerConfig = {
  region: string;
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  stsRoleTrn: string;
  stsRoleSessionName: string;
  signedUrlExpiresSeconds: number;
};

/** 读取必须存在的环境变量；缺失时直接抛错，避免后面签名阶段才半路失败。 */
function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

/** 读取正整数配置；无值时回退默认值，非法时直接抛错。 */
function readPositiveIntegerEnv(name: string, fallbackValue: number) {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid ${name}`);
  }

  return parsedValue;
}

/** 统一输出图书 PDF 相关的 TOS 服务端配置。 */
export function getTosServerConfig(): TosServerConfig {
  const region = readRequiredEnv("TOS_REGION");

  return {
    region,
    bucketName: readRequiredEnv("TOS_BUCKET_NAME"),
    endpoint: process.env.TOS_ENDPOINT?.trim() || `tos-${region}.volces.com`,
    accessKeyId: readRequiredEnv("TOS_ACCESS_KEY_ID"),
    secretAccessKey: readRequiredEnv("TOS_SECRET_ACCESS_KEY"),
    stsRoleTrn: process.env.TOS_STS_ROLE_TRN?.trim() || readRequiredEnv("TOS_STS_ROLE_ARN"),
    stsRoleSessionName: process.env.TOS_STS_ROLE_SESSION_NAME?.trim() || "book-pdf-upload",
    signedUrlExpiresSeconds: readPositiveIntegerEnv("TOS_SIGNED_URL_EXPIRES_SECONDS", 900),
  };
}
