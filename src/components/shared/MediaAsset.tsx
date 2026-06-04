import type { MediaType } from "@/types";

type MediaAssetProps = {
  src: string;
  mediaType: MediaType;
  alt: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "auto" | "metadata" | "none";
};

/** 用统一接口渲染图片或视频资源。 */
export function MediaAsset({
  src,
  mediaType,
  alt,
  className,
  autoPlay,
  controls,
  loop,
  muted,
  playsInline,
  preload,
}: MediaAssetProps) {
  if (mediaType === "video") {
    return (
      <video
        aria-label={alt}
        autoPlay={autoPlay}
        className={className}
        controls={controls}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
      >
        <source src={src} />
        当前浏览器不支持视频播放。
      </video>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
