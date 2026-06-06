import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_GPT_SOVITS_BASE,
  DEFAULT_VOICE_API_BASE,
  DEFAULT_SPEAKER_ID,
  fetchVoiceHealth,
  normalizeVoiceText,
  registerReferenceVoice,
  sanitizeApiBase,
  synthesizeVoice
} from './voiceApi';

const VOICE_API_BASE_STORAGE_KEY = 'voice-debug-api-base';

type VoiceDebugPageProps = {
  onBack: () => void;
};

export function VoiceDebugPage({ onBack }: VoiceDebugPageProps) {
  const [apiBase, setApiBase] = useState(() => readStoredApiBase());
  const [gptSovitsBaseUrl, setGptSovitsBaseUrl] = useState(DEFAULT_GPT_SOVITS_BASE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [speakerId, setSpeakerId] = useState(DEFAULT_SPEAKER_ID);
  const [text, setText] = useState('来币吧');
  const [textLang, setTextLang] = useState('zh');
  const [promptLang, setPromptLang] = useState('zh');
  const [promptText, setPromptText] = useState('');
  const [speedFactor, setSpeedFactor] = useState('1');
  const [statusMessage, setStatusMessage] = useState('默认使用 src/assets/熊二.mp3 作为音色，可直接生成 5 个字以内的短语音。');
  const [errorMessage, setErrorMessage] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [serviceSummary, setServiceSummary] = useState('尚未检查服务状态。');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);
  const [contentType, setContentType] = useState('');
  const normalizedText = useMemo(() => normalizeVoiceText(text), [text]);
  const charCount = Array.from(normalizedText).length;

  useEffect(() => {
    window.localStorage.setItem(VOICE_API_BASE_STORAGE_KEY, apiBase);
  }, [apiBase]);

  useEffect(() => {
    return () => {
      if (audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setErrorMessage('');

    if (nextFile) {
      setStatusMessage(`已选择参考音频：${nextFile.name}`);
    }
  };

  const handleRegister = async () => {
    if (!selectedFile) {
      setErrorMessage('请先选择一段参考音频。');
      return;
    }

    setIsRegistering(true);
    setErrorMessage('');
    setStatusMessage('正在上传参考音频并注册音色...');

    try {
      const result = await registerReferenceVoice(apiBase, selectedFile);
      setSpeakerId(result.speakerId);
      setStatusMessage(result.message);
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSynthesize = async () => {
    if (!speakerId.trim()) {
      setErrorMessage('请先注册参考音频，拿到 speakerId。');
      return;
    }

    if (!normalizedText) {
      setErrorMessage('请输入 1 到 5 个字的文本。');
      return;
    }

    setIsSynthesizing(true);
    setErrorMessage('');
    setStatusMessage(`正在生成“${normalizedText}”的语音...`);

    try {
      const result = await synthesizeVoice({
        apiBase,
        speakerId: speakerId.trim(),
        text: normalizedText,
        textLang,
        promptLang,
        promptText,
        gptSovitsBaseUrl,
        speedFactor: Number.parseFloat(speedFactor) || 1
      });

      setAudioUrl((previousUrl) => {
        if (previousUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previousUrl);
        }
        return result.audioUrl;
      });
      setContentType(result.contentType);
      setStatusMessage(result.requestId ? `生成成功，请试听。请求号：${result.requestId}` : '生成成功，请试听。');
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleHealthCheck = useCallback(async () => {
    setIsCheckingHealth(true);

    try {
      const health = await fetchVoiceHealth(apiBase);
      setServiceSummary(
        [
          `调试服务：${health.ok ? '已连接' : '异常'}`,
          `默认音色：${health.defaultSpeakerReady ? '就绪' : '缺少 熊二.mp3'}`,
          `GPT-SoVITS：${health.gptSovitsReachable ? `已连接 ${health.gptSovitsBaseUrl}` : `未连接 ${health.gptSovitsBaseUrl}`}`
        ].join('；')
      );
      setGptSovitsBaseUrl(health.gptSovitsBaseUrl || DEFAULT_GPT_SOVITS_BASE);
    } catch (error) {
      setServiceSummary(resolveErrorMessage(error));
    } finally {
      setIsCheckingHealth(false);
    }
  }, [apiBase]);

  useEffect(() => {
    let cancelled = false;

    void fetchVoiceHealth(apiBase)
      .then((health) => {
        if (cancelled) {
          return;
        }

        setServiceSummary(
          [
            `调试服务：${health.ok ? '已连接' : '异常'}`,
            `默认音色：${health.defaultSpeakerReady ? '就绪' : '缺少 熊二.mp3'}`,
            `GPT-SoVITS：${health.gptSovitsReachable ? `已连接 ${health.gptSovitsBaseUrl}` : `未连接 ${health.gptSovitsBaseUrl}`}`
          ].join('；')
        );
        setGptSovitsBaseUrl(health.gptSovitsBaseUrl || DEFAULT_GPT_SOVITS_BASE);
      })
      .catch((error) => {
        if (!cancelled) {
          setServiceSummary(resolveErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingHealth(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  return (
    <main className="voice-shell">
      <header className="voice-header">
        <button className="back-button" type="button" onClick={onBack}>
          返回主页
        </button>
        <div className="voice-title-block">
          <span className="mode-kicker">独立调试页</span>
          <h1>音频调试</h1>
          <p>默认使用熊二音色，可直接生成 5 个字以内的短语音；上传参考音频仅用于临时覆盖默认音色。</p>
        </div>
      </header>

      <section className="voice-grid">
        <article className="voice-card">
          <h2>1. 本地服务</h2>
          <label className="voice-field">
            <span>API 基础地址</span>
            <input
              type="text"
              value={apiBase}
              onChange={(event) => setApiBase(sanitizeApiBase(event.target.value))}
              placeholder={DEFAULT_VOICE_API_BASE}
            />
          </label>
          <label className="voice-field">
            <span>GPT-SoVITS 地址</span>
            <input
              type="text"
              value={gptSovitsBaseUrl}
              onChange={(event) => setGptSovitsBaseUrl(sanitizeApiBase(event.target.value))}
              placeholder={DEFAULT_GPT_SOVITS_BASE}
            />
          </label>
          <button className="voice-action" type="button" onClick={handleHealthCheck} disabled={isCheckingHealth}>
            {isCheckingHealth ? '检查中...' : '检查服务状态'}
          </button>
          <p className="voice-hint">{serviceSummary}</p>
          <p className="voice-hint">当前页仍调用 `POST /voice/register` 和 `POST /voice/speak`，本地调试服务会再代理到 GPT-SoVITS `/tts`。</p>
        </article>

        <article className="voice-card">
          <h2>2. 参考音频</h2>
          <p className="voice-hint">当前默认音色：`src/assets/熊二.mp3`</p>
          <label className="voice-field">
            <span>上传参考音频（可选）</span>
            <input type="file" accept="audio/*" onChange={handleFileChange} />
          </label>
          <button className="voice-action" type="button" onClick={handleRegister} disabled={isRegistering || !selectedFile}>
            {isRegistering ? '注册中...' : '覆盖默认音色'}
          </button>
          <label className="voice-field">
            <span>speakerId</span>
            <input type="text" value={speakerId} onChange={(event) => setSpeakerId(event.target.value)} placeholder={DEFAULT_SPEAKER_ID} />
          </label>
        </article>

        <article className="voice-card">
          <h2>3. 生成试听</h2>
          <label className="voice-field">
            <span>文本语言</span>
            <input type="text" value={textLang} onChange={(event) => setTextLang(event.target.value)} placeholder="zh" />
          </label>
          <label className="voice-field">
            <span>参考音频语言</span>
            <input type="text" value={promptLang} onChange={(event) => setPromptLang(event.target.value)} placeholder="zh" />
          </label>
          <label className="voice-field">
            <span>参考音频文本（可选）</span>
            <input
              type="text"
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              placeholder="已知参考音频原文时填写，可提高拟合稳定性"
            />
          </label>
          <label className="voice-field">
            <span>语速倍率</span>
            <input type="text" value={speedFactor} onChange={(event) => setSpeedFactor(event.target.value)} placeholder="1" />
          </label>
          <label className="voice-field">
            <span>短文本</span>
            <input
              type="text"
              value={text}
              maxLength={12}
              onChange={(event) => setText(event.target.value)}
              placeholder="最多 5 个字"
            />
          </label>
          <p className="voice-hint">发送时会自动裁成前 5 个字，当前将发送：`{normalizedText || '空文本'}`</p>
          <div className="voice-row">
            <strong>{charCount}/5</strong>
            <button className="voice-action primary" type="button" onClick={handleSynthesize} disabled={isSynthesizing || !speakerId.trim()}>
              {isSynthesizing ? '生成中...' : '生成语音'}
            </button>
          </div>
          <div className="voice-feedback" data-tone={errorMessage ? 'danger' : 'normal'}>
            <strong>{errorMessage ? '异常提示' : '当前状态'}</strong>
            <p>{errorMessage || statusMessage}</p>
          </div>
          {audioUrl ? (
            <div className="voice-preview">
              <span>结果音频{contentType ? `（${contentType}）` : ''}</span>
              <audio controls src={audioUrl} />
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}

function readStoredApiBase(): string {
  if (typeof window === 'undefined') return DEFAULT_VOICE_API_BASE;

  const stored = window.localStorage.getItem(VOICE_API_BASE_STORAGE_KEY);
  return stored ? sanitizeApiBase(stored) : DEFAULT_VOICE_API_BASE;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '本地语音服务调用失败，请检查服务是否已启动。';
}
