import "server-only";

import { sts } from "@volcengine/openapi";
import { getTosServerConfig } from "@/lib/server/tos/config";

export type TosTemporaryCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  currentTime: string;
  expiredTime: string;
};

type CreateTosTemporaryCredentialsInput = {
  durationSeconds?: number;
  policy?: string;
};

/** 创建一个只负责本次请求的 STS client，避免把密钥写进全局单例。 */
function createStsClient() {
  const config = getTosServerConfig();
  const client = new sts.StsService({ serviceName: "sts", region: config.region });
  client.setAccessKeyId(config.accessKeyId);
  client.setSecretKey(config.secretAccessKey);
  return client;
}

/** 
 * 给浏览器签发一次短时上传凭证。
 * 这里不直接把永久 AK/SK 发到前端，而是改发会过期的临时凭证，
 * 这样即使浏览器端代码被看到，暴露的权限窗口也会被压到较短时间内。
 */
export async function createTosTemporaryCredentials({
  durationSeconds = 3600,
  policy,
}: CreateTosTemporaryCredentialsInput = {}): Promise<TosTemporaryCredentials> {
  const config = getTosServerConfig();
  const client = createStsClient();
  const response = await client.AssumeRole({
    RoleTrn: config.stsRoleTrn,
    RoleSessionName: config.stsRoleSessionName,
    DurationSeconds: durationSeconds,
    Policy: policy,
  });
  const credentials = response.Result?.Credentials;

  if (!credentials) {
    throw new Error("Failed to create TOS temporary credentials");
  }

  return {
    accessKeyId: credentials.AccessKeyId,
    secretAccessKey: credentials.SecretAccessKey,
    sessionToken: credentials.SessionToken,
    currentTime: credentials.CurrentTime,
    expiredTime: credentials.ExpiredTime,
  };
}
