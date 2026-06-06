import "server-only";

import { uploadAdminImageBinary } from "@/lib/server/storage/admin-images";
import type { GenerateAdminImagePayload, GeneratedAdminImageItem } from "@/types";

export const OPENAI_IMAGE_MODEL = "gpt-image-2";

type OpenAiImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message?: string;
  };
};

type OpenAiGeneratedImage = {
  b64_json: string;
  revised_prompt?: string;
};

/** 确保服务端已经配置 OpenAI API Key。 */
function assertOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  return apiKey;
}

/** 读取并校验 OpenAI 图片生成接口响应。 */
async function readImageGenerationResponse(response: Response): Promise<OpenAiGeneratedImage> {
  const payload = (await response.json()) as OpenAiImageGenerationResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message?.trim() || "OpenAI 图片生成失败");
  }

  const image = payload.data?.[0];
  if (!image?.b64_json) {
    throw new Error("OpenAI 没有返回可用图片数据");
  }

  return {
    b64_json: image.b64_json,
    revised_prompt: image.revised_prompt,
  };
}

/** 调用 OpenAI 生成图片，并把结果上传到现有 Supabase Storage。 */
export async function generateAdminImageWithOpenAi(payload: GenerateAdminImagePayload): Promise<GeneratedAdminImageItem> {
  const size = payload.size ?? "1024x1024";
  const quality = payload.quality ?? "auto";
  const background = payload.background ?? "auto";
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${assertOpenAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: payload.prompt,
      size,
      quality,
      background,
      output_format: "png",
    }),
  });

  const image = await readImageGenerationResponse(response);
  const uploaded = await uploadAdminImageBinary({
    bytes: Buffer.from(image.b64_json, "base64"),
    contentType: "image/png",
    filename: `ai-generated-${Date.now()}.png`,
  });

  return {
    model: OPENAI_IMAGE_MODEL,
    prompt: payload.prompt,
    revisedPrompt: image.revised_prompt?.trim() || payload.prompt,
    size,
    quality,
    background,
    imageUrl: uploaded.url,
    storagePath: uploaded.path,
  };
}
