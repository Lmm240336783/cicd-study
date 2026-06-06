import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { generateAdminImageWithOpenAi } from "@/lib/server/openai/image-generation";
import type { GenerateAdminImagePayload } from "@/types";

/** 校验后台请求是否携带有效管理员会话。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 读取并校验后台 AI 图片生成请求体。 */
async function parseGenerateAdminImagePayload(request: NextRequest): Promise<GenerateAdminImagePayload | null> {
  const data = (await request.json()) as Partial<GenerateAdminImagePayload>;
  if (typeof data.prompt !== "string" || data.prompt.trim() === "") {
    return null;
  }

  return {
    prompt: data.prompt.trim(),
    size: data.size === "1536x1024" || data.size === "1024x1536" || data.size === "1024x1024" ? data.size : undefined,
    quality: data.quality === "low" || data.quality === "medium" || data.quality === "high" || data.quality === "auto" ? data.quality : undefined,
    background: data.background === "opaque" || data.background === "transparent" || data.background === "auto" ? data.background : undefined,
  };
}

/** 生成 AI 图片并上传到后台统一存储，返回可直接复用的公开地址。 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = await parseGenerateAdminImagePayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid image generation payload" }, { status: 400 });
  }

  try {
    const data = await generateAdminImageWithOpenAi(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return createContentApiErrorResponse(error, "生成 AI 图片失败", "admin/images/generate#post");
  }
}
