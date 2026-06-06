import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 9880;
const STORAGE_ROOT = path.join(process.cwd(), 'artifacts', 'voice-debug');
const SPEAKER_INDEX_PATH = path.join(STORAGE_ROOT, 'speakers.json');
const DEFAULT_SPEAKER_ID = 'default-xiong-er';
const DEFAULT_REFERENCE_AUDIO_PATH = path.join(process.cwd(), 'src', 'assets', '熊二.mp3');
const DEFAULT_GPT_SOVITS_BASE_URL = process.env.GPT_SOVITS_BASE_URL ?? 'http://127.0.0.1:9881';
const DEFAULT_TEXT_LANG = 'zh';
const DEFAULT_PROMPT_LANG = 'zh';
const GPT_SOVITS_TIMEOUT_MS = 120000;
const MAX_BODY_BYTES = 20 * 1024 * 1024;

await mkdir(STORAGE_ROOT, { recursive: true });
const speakerIndex = await loadSpeakerIndex();

const server = createServer(async (request, response) => {
  try {
    setCorsHeaders(response);

    if (!request.url) {
      sendJson(response, 400, { error: '请求地址无效。' });
      return;
    }

    const requestUrl = new URL(request.url, `http://${HOST}:${PORT}`);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/voice/health') {
      const defaultSpeakerRecord = await resolveSpeakerRecord(DEFAULT_SPEAKER_ID);
      const gptSovitsReachable = await probeHttpEndpoint(DEFAULT_GPT_SOVITS_BASE_URL);

      sendJson(response, 200, {
        ok: true,
        host: HOST,
        port: PORT,
        mode: 'gpt-sovits-proxy',
        defaultSpeakerId: DEFAULT_SPEAKER_ID,
        defaultSpeakerReady: Boolean(defaultSpeakerRecord),
        gptSovitsBaseUrl: DEFAULT_GPT_SOVITS_BASE_URL,
        gptSovitsReachable,
        speakerCount: Object.keys(speakerIndex).length
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/voice/register') {
      await handleRegister(request, response);
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/voice/speak') {
      await handleSpeak(request, response);
      return;
    }

    sendJson(response, 404, { error: '未找到对应接口。' });
  } catch (error) {
    sendJson(response, 500, { error: resolveErrorMessage(error) });
  }
});

server.on('error', async (error) => {
  if (error?.code !== 'EADDRINUSE') {
    console.error('[voice:dev] 服务启动失败：', resolveErrorMessage(error));
    process.exit(1);
    return;
  }

  const existingHealth = await readExistingHealth();

  if (existingHealth) {
    console.log(`[voice:dev] http://${HOST}:${PORT} 已有服务在运行，无需重复启动。`);
    console.log(`[voice:dev] health: ${JSON.stringify(existingHealth)}`);
    process.exit(0);
    return;
  }

  console.error(`[voice:dev] 端口 ${PORT} 已被其他进程占用，但不是当前语音调试服务。`);
  console.error(`[voice:dev] 请先释放端口，或手动结束占用 ${PORT} 的进程后再重试。`);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[voice:dev] listening on http://${HOST}:${PORT}`);
  console.log('[voice:dev] mode: gpt-sovits-proxy');
  console.log(`[voice:dev] default speaker: ${DEFAULT_SPEAKER_ID} -> ${DEFAULT_REFERENCE_AUDIO_PATH}`);
  console.log(`[voice:dev] GPT-SoVITS base: ${DEFAULT_GPT_SOVITS_BASE_URL}`);
});

async function handleRegister(request, response) {
  const contentType = request.headers['content-type'] ?? '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    sendJson(response, 400, { error: '参考音频上传格式无效，缺少 multipart boundary。' });
    return;
  }

  const bodyBuffer = await readRequestBuffer(request);
  const boundary = boundaryMatch[1] ?? boundaryMatch[2];
  const parts = parseMultipartForm(bodyBuffer, boundary);
  const filePart = parts.find((part) => part.name === 'referenceAudio');

  if (!filePart || filePart.data.length === 0) {
    sendJson(response, 400, { error: '没有收到 referenceAudio 文件。' });
    return;
  }

  const speakerId = randomUUID();
  const extension = resolveFileExtension(filePart.filename, filePart.contentType);
  const storedFileName = `${speakerId}${extension}`;
  const storedAbsolutePath = path.join(STORAGE_ROOT, storedFileName);

  await writeFile(storedAbsolutePath, filePart.data);
  speakerIndex[speakerId] = {
    speakerId,
    contentType: filePart.contentType || 'audio/wav',
    originalFileName: filePart.filename || storedFileName,
    storedFileName,
    createdAt: new Date().toISOString()
  };
  await persistSpeakerIndex();
  await cleanupOldFiles();

  sendJson(response, 200, {
    speakerId,
    message: '参考音频已注册。生成阶段将把这段音频作为 GPT-SoVITS 的参考音色。'
  });
}

async function handleSpeak(request, response) {
  const payload = await readJsonBody(request);
  const speakerId = typeof payload.speakerId === 'string' ? payload.speakerId.trim() : '';
  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  const textLang = typeof payload.textLang === 'string' && payload.textLang.trim() ? payload.textLang.trim() : DEFAULT_TEXT_LANG;
  const promptLang =
    typeof payload.promptLang === 'string' && payload.promptLang.trim() ? payload.promptLang.trim() : DEFAULT_PROMPT_LANG;
  const promptText = typeof payload.promptText === 'string' ? payload.promptText.trim() : '';
  const gptSovitsBaseUrl =
    typeof payload.gptSovitsBaseUrl === 'string' && payload.gptSovitsBaseUrl.trim()
      ? payload.gptSovitsBaseUrl.trim().replace(/\/+$/, '')
      : DEFAULT_GPT_SOVITS_BASE_URL;
  const speedFactor =
    typeof payload.speedFactor === 'number' && Number.isFinite(payload.speedFactor) ? payload.speedFactor : 1;

  if (!speakerId) {
    sendJson(response, 400, { error: 'speakerId 不能为空。' });
    return;
  }

  if (!text) {
    sendJson(response, 400, { error: 'text 不能为空。' });
    return;
  }

  const speakerRecord = await resolveSpeakerRecord(speakerId);
  if (!speakerRecord) {
    sendJson(response, 404, { error: `找不到对应的 speakerId。默认音色请确认 ${DEFAULT_REFERENCE_AUDIO_PATH} 存在。` });
    return;
  }

  const gptSovitsResponse = await requestGptSovits({
    gptSovitsBaseUrl,
    text,
    textLang,
    promptLang,
    promptText,
    refAudioPath: speakerRecord.absoluteFilePath,
    speedFactor
  });

  if (!gptSovitsResponse.ok) {
    const backendError = await parseBackendError(gptSovitsResponse);
    sendJson(response, 502, {
      error: `GPT-SoVITS 调用失败：${backendError}`,
      gptSovitsBaseUrl
    });
    return;
  }

  const audioBuffer = Buffer.from(await gptSovitsResponse.arrayBuffer());
  const responseContentType = gptSovitsResponse.headers.get('content-type') ?? 'audio/wav';

  response.writeHead(200, {
    'Content-Type': responseContentType,
    'Content-Length': audioBuffer.byteLength,
    'X-Request-Id': randomUUID(),
    'X-Voice-Debug-Mode': 'gpt-sovits-proxy',
    'Access-Control-Expose-Headers': 'X-Request-Id, X-Voice-Debug-Mode'
  });
  response.end(audioBuffer);
}

// 默认 speaker 直接映射到项目内置音频，方便调试页零上传直接出声。
async function resolveSpeakerRecord(speakerId) {
  if (speakerId === DEFAULT_SPEAKER_ID) {
    try {
      await stat(DEFAULT_REFERENCE_AUDIO_PATH);
      return {
        speakerId: DEFAULT_SPEAKER_ID,
        contentType: 'audio/mpeg',
        originalFileName: path.basename(DEFAULT_REFERENCE_AUDIO_PATH),
        storedFileName: path.basename(DEFAULT_REFERENCE_AUDIO_PATH),
        absoluteFilePath: DEFAULT_REFERENCE_AUDIO_PATH,
        createdAt: new Date(0).toISOString()
      };
    } catch {
      return null;
    }
  }

  const speakerRecord = speakerIndex[speakerId];
  if (!speakerRecord) return null;

  return {
    ...speakerRecord,
    absoluteFilePath: path.join(STORAGE_ROOT, speakerRecord.storedFileName)
  };
}

// Node 层统一把前端调试请求适配为 GPT-SoVITS 官方 /tts 参数，避免前端直接绑定模型服务细节。
async function requestGptSovits({
  gptSovitsBaseUrl,
  text,
  textLang,
  promptLang,
  promptText,
  refAudioPath,
  speedFactor
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GPT_SOVITS_TIMEOUT_MS);

  try {
    return await fetch(`${gptSovitsBaseUrl}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        text_lang: textLang,
        ref_audio_path: refAudioPath,
        prompt_text: promptText,
        prompt_lang: promptLang,
        text_split_method: 'cut5',
        batch_size: 1,
        media_type: 'wav',
        streaming_mode: false,
        speed_factor: speedFactor
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`GPT-SoVITS 请求超时，${GPT_SOVITS_TIMEOUT_MS / 1000} 秒内未返回音频。`);
    }

    throw new Error(`无法连接 GPT-SoVITS 服务 ${gptSovitsBaseUrl}。`);
  } finally {
    clearTimeout(timeoutId);
  }
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload));
}

async function readRequestBuffer(request) {
  const chunks = [];
  let totalLength = 0;

  for await (const chunk of request) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalLength += bufferChunk.length;

    if (totalLength > MAX_BODY_BYTES) {
      throw new Error('上传内容过大，请控制在 20MB 以内。');
    }

    chunks.push(bufferChunk);
  }

  return Buffer.concat(chunks);
}

async function readJsonBody(request) {
  const bodyBuffer = await readRequestBuffer(request);

  try {
    return JSON.parse(bodyBuffer.toString('utf8'));
  } catch {
    throw new Error('请求体不是合法的 JSON。');
  }
}

// 这里只解析当前调试页会发出的单文件表单，避免为了占位服务引入额外依赖。
function parseMultipartForm(bodyBuffer, boundary) {
  const boundaryToken = `--${boundary}`;
  const raw = bodyBuffer.toString('latin1');
  const rawSections = raw.split(boundaryToken).slice(1, -1);

  return rawSections.map((section) => {
    const normalizedSection = section.startsWith('\r\n') ? section.slice(2) : section;
    const headerEndIndex = normalizedSection.indexOf('\r\n\r\n');

    if (headerEndIndex === -1) {
      throw new Error('multipart 数据格式不完整。');
    }

    const headerText = normalizedSection.slice(0, headerEndIndex);
    const dataText = normalizedSection.slice(headerEndIndex + 4).replace(/\r\n$/, '');
    const dispositionMatch = headerText.match(/name="([^"]+)"/i);
    const filenameMatch = headerText.match(/filename="([^"]*)"/i);
    const contentTypeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i);

    return {
      name: dispositionMatch?.[1] ?? '',
      filename: filenameMatch?.[1] ?? '',
      contentType: contentTypeMatch?.[1]?.trim() ?? 'application/octet-stream',
      data: Buffer.from(dataText, 'latin1')
    };
  });
}

function resolveFileExtension(fileName, contentType) {
  const fromName = path.extname(fileName || '');
  if (fromName) return fromName;

  const mimeMap = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a'
  };

  return mimeMap[contentType] ?? '.bin';
}

async function loadSpeakerIndex() {
  try {
    const jsonText = await readFile(SPEAKER_INDEX_PATH, 'utf8');
    return JSON.parse(jsonText);
  } catch {
    return {};
  }
}

async function persistSpeakerIndex() {
  await writeFile(SPEAKER_INDEX_PATH, JSON.stringify(speakerIndex, null, 2), 'utf8');
}

// 调试页只保留最近少量样本，避免反复试音把 artifacts 目录堆满。
async function cleanupOldFiles() {
  const entries = Object.values(speakerIndex).sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  const staleEntries = entries.slice(20);
  if (staleEntries.length === 0) return;

  for (const staleEntry of staleEntries) {
    const stalePath = path.join(STORAGE_ROOT, staleEntry.storedFileName);

    try {
      const staleStat = await stat(stalePath);
      if (staleStat.isFile()) {
        await unlink(stalePath);
      }
    } catch {
      // 文件不存在时直接忽略，保证索引清理继续进行。
    }

    delete speakerIndex[staleEntry.speakerId];
  }

  await persistSpeakerIndex();
}

function resolveErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return '语音调试服务发生未知异常。';
}

async function readExistingHealth() {
  try {
    const response = await fetch(`http://${HOST}:${PORT}/voice/health`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function probeHttpEndpoint(baseUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(baseUrl, { method: 'GET', signal: controller.signal });
    return response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseBackendError(response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = await response.json();
    if (typeof payload?.message === 'string' && payload.message) return payload.message;
    if (typeof payload?.error === 'string' && payload.error) return payload.error;
  }

  const text = await response.text();
  return text || `HTTP ${response.status}`;
}
