import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type PointerEvent } from 'react';

type ImageSizeKey = '1k' | '2k' | '4k';
type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

type ImageSizeOption = {
  key: ImageSizeKey;
  label: string;
  model: string;
  size: string;
};

type ImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  b64_json?: string;
  image?: string;
  base64?: string;
  png?: string;
  error?: {
    message?: string;
  };
  message?: string;
};

const IMAGE_SIZE_OPTIONS: ImageSizeOption[] = [
  { key: '1k', label: '1K', model: 'gpt-image-2', size: '1024x1024' },
  { key: '2k', label: '2K', model: 'gpt-image-2', size: '2048x2048' },
  { key: '4k', label: '4K', model: 'gpt-image-2-4k', size: '3840x2160' },
];

const IMAGE_API_URL = '/api/images/generations';

const extractBase64Image = (payload: ImageGenerationResponse | string) => {
  if (typeof payload === 'string') {
    const value = payload.trim();
    return value.startsWith('{') ? '' : value;
  }

  return payload.data?.[0]?.b64_json
    ?? payload.b64_json
    ?? payload.image
    ?? payload.base64
    ?? payload.png
    ?? '';
};

const buildImageSource = (imageBase64: string) =>
  imageBase64.startsWith('data:image/') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

const resolveErrorMessage = (payload: ImageGenerationResponse | string, fallback: string) => {
  if (typeof payload === 'string') return payload || fallback;
  return payload.error?.message ?? payload.message ?? fallback;
};

export function ImageGeneratorPanel() {
  const [prompt, setPrompt] = useState('一只坐在霓虹推币机旁边的猫，写实风格，柔和光线');
  const [selectedSize, setSelectedSize] = useState<ImageSizeKey>('1k');
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('等待生成图片');
  const [imageSrc, setImageSrc] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const generationPendingRef = useRef(false);

  const selectedOption = IMAGE_SIZE_OPTIONS.find((option) => option.key === selectedSize) ?? IMAGE_SIZE_OPTIONS[0];
  const canDownload = status === 'success' && imageSrc;

  useEffect(() => {
    if (!previewOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewOpen]);

  const runGeneration = async () => {
    if (generationPendingRef.current) return;
    generationPendingRef.current = true;

    const safePrompt = prompt.trim();

    if (!safePrompt) {
      setStatus('error');
      setStatusMessage('请先填写提示词。');
      generationPendingRef.current = false;
      return;
    }

    setStatus('loading');
    setStatusMessage(`正在生成 ${selectedOption.label} 图片...`);

    try {
      const response = await fetch(IMAGE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedOption.model,
          prompt: safePrompt,
          size: selectedOption.size,
          quality: 'low',
        }),
      });
      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json')
        ? (await response.json()) as ImageGenerationResponse
        : await response.text();

      if (!response.ok) {
        throw new Error(resolveErrorMessage(payload, `生成失败，状态码 ${response.status}`));
      }

      const nextImageBase64 = extractBase64Image(payload);
      if (!nextImageBase64) {
        throw new Error('接口没有返回可渲染的 base64 PNG。');
      }

      setImageSrc(buildImageSource(nextImageBase64));
      setStatus('success');
      setStatusMessage('生成完成，可直接预览或下载。');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : '生成失败，请稍后重试。');
    } finally {
      generationPendingRef.current = false;
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runGeneration();
  };

  const handleGenerateButton = (event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    void runGeneration();
  };

  return (
    <section className="image-generator" aria-label="生成图片">
      <form className="image-generator-form" onSubmit={handleSubmit}>
        <div className="image-generator-heading">
          <span>AI 图片</span>
          <strong>生成图片</strong>
        </div>

        <label className="image-generator-field prompt">
          <span>Prompt</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="描述你想生成的图片"
          />
        </label>

        <div className="image-size-group" aria-label="图片尺寸">
          {IMAGE_SIZE_OPTIONS.map((option) => (
            <label className="image-size-option" key={option.key}>
              <input
                type="radio"
                name="image-size"
                value={option.key}
                checked={selectedSize === option.key}
                onChange={() => setSelectedSize(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <div className="image-generator-actions">
          <button
            className="image-generate-button"
            type="button"
            onClick={handleGenerateButton}
            onPointerUp={handleGenerateButton}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '生成中...' : '生成图片'}
          </button>
          <a
            className={`image-download-button ${canDownload ? '' : 'disabled'}`}
            href={canDownload ? imageSrc : undefined}
            download={`coin-pusher-${selectedSize}.png`}
            aria-disabled={!canDownload}
          >
            下载
          </a>
        </div>
      </form>

      <div className="image-preview" data-state={status}>
        {imageSrc ? (
          <button
            className="image-preview-button"
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label="放大查看生成的图片"
          >
            <img src={imageSrc} alt="生成的图片" />
          </button>
        ) : <span>{statusMessage}</span>}
      </div>
      <p className={`image-generator-status ${status === 'error' ? 'error' : ''}`}>{statusMessage}</p>
      {previewOpen ? (
        <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="生成图片预览" onClick={() => setPreviewOpen(false)}>
          <button className="image-lightbox-close" type="button" onClick={() => setPreviewOpen(false)} aria-label="关闭预览">
            ×
          </button>
          <img
            className="image-lightbox-content"
            src={imageSrc}
            alt="放大预览的生成图片"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
