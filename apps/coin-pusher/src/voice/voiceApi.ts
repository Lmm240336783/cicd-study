export const DEFAULT_VOICE_API_BASE = 'http://127.0.0.1:9880';
export const DEFAULT_SPEAKER_ID = 'default-xiong-er';
export const DEFAULT_GPT_SOVITS_BASE = 'http://127.0.0.1:9881';

export type VoiceHealthResult = {
  ok: boolean;
  host: string;
  port: number;
  mode: string;
  defaultSpeakerId: string;
  defaultSpeakerReady: boolean;
  gptSovitsBaseUrl: string;
  gptSovitsReachable: boolean;
  speakerCount: number;
};

export type RegisterVoiceResult = {
  speakerId: string;
  message: string;
};

export type SynthesizeVoiceParams = {
  apiBase: string;
  speakerId: string;
  text: string;
  textLang: string;
  promptLang: string;
  promptText: string;
  gptSovitsBaseUrl: string;
  speedFactor: number;
};

export type SynthesizeVoiceResult = {
  audioUrl: string;
  contentType: string;
  requestId: string | null;
};

type JsonAudioPayload = {
  audioUrl?: string;
  audioBase64?: string;
  mimeType?: string;
  requestId?: string;
};

export function sanitizeApiBase(apiBase: string): string {
  return apiBase.trim().replace(/\/+$/, '');
}

// 调试页只面向极短播报，统一在前端截断，减少把长文本误发给本地模型服务。
export function normalizeVoiceText(text: string): string {
  return Array.from(text.trim()).slice(0, 5).join('');
}

export async function registerReferenceVoice(apiBase: string, audioFile: File): Promise<RegisterVoiceResult> {
  const endpoint = `${sanitizeApiBase(apiBase)}/voice/register`;
  const formData = new FormData();
  formData.append('referenceAudio', audioFile);

  const response = await fetchWithFriendlyError(endpoint, {
    method: 'POST',
    body: formData
  });

  const payload = await parseResponsePayload(response);
  const speakerId = typeof payload.speakerId === 'string' ? payload.speakerId : '';

  if (!response.ok || !speakerId) {
    throw new Error(resolveErrorMessage(payload, '参考音频注册失败，请检查本地语音服务。'));
  }

  return {
    speakerId,
    message:
      typeof payload.message === 'string'
        ? payload.message
        : `参考音频已注册，speakerId：${speakerId}`
  };
}

export async function fetchVoiceHealth(apiBase: string): Promise<VoiceHealthResult> {
  const response = await fetchWithFriendlyError(`${sanitizeApiBase(apiBase)}/voice/health`, {
    method: 'GET'
  });

  const payload = (await response.json()) as VoiceHealthResult;
  if (!response.ok) {
    throw new Error('语音调试服务健康检查失败。');
  }

  return payload;
}

export async function synthesizeVoice(params: SynthesizeVoiceParams): Promise<SynthesizeVoiceResult> {
  const response = await fetchWithFriendlyError(`${sanitizeApiBase(params.apiBase)}/voice/speak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      speakerId: params.speakerId,
      text: normalizeVoiceText(params.text),
      textLang: params.textLang,
      promptLang: params.promptLang,
      promptText: params.promptText,
      gptSovitsBaseUrl: sanitizeApiBase(params.gptSovitsBaseUrl),
      speedFactor: params.speedFactor
    })
  });

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(resolveErrorMessage(payload, '语音生成失败，请检查本地语音服务。'));
  }

  const contentType = response.headers.get('content-type') ?? 'audio/wav';
  const requestId = response.headers.get('x-request-id');

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as JsonAudioPayload;
    return resolveJsonAudioPayload(payload);
  }

  const audioBlob = await response.blob();
  return {
    audioUrl: URL.createObjectURL(audioBlob),
    contentType,
    requestId
  };
}

async function fetchWithFriendlyError(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('无法连接本地语音服务，请先运行 `pnpm voice:dev`。');
    }

    throw error;
  }
}

async function parseResponsePayload(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as Record<string, unknown>;
  }

  const text = await response.text();
  return { message: text };
}

function resolveErrorMessage(payload: Record<string, unknown>, fallback: string): string {
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  if (typeof payload.message === 'string' && payload.message) return payload.message;
  return fallback;
}

function resolveJsonAudioPayload(payload: JsonAudioPayload): SynthesizeVoiceResult {
  if (typeof payload.audioUrl === 'string' && payload.audioUrl) {
    return {
      audioUrl: payload.audioUrl,
      contentType: payload.mimeType ?? 'audio/wav',
      requestId: payload.requestId ?? null
    };
  }

  if (typeof payload.audioBase64 === 'string' && payload.audioBase64) {
    const mimeType = payload.mimeType ?? 'audio/wav';
    return {
      audioUrl: `data:${mimeType};base64,${payload.audioBase64}`,
      contentType: mimeType,
      requestId: payload.requestId ?? null
    };
  }

  throw new Error('语音服务返回成功，但没有带回可播放的音频数据。');
}
