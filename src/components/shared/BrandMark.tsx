import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type BrandMarkProps = {
  className?: string;
  preload?: boolean;
  priority?: boolean;
};

/** 渲染站点通用品牌 logo 图片。 */
export function BrandMark({ className, preload, priority }: BrandMarkProps) {
  const shouldPreload = preload ?? priority ?? false;

  return (
    <Image
      src="/logo.png"
      alt="My Collection"
      width={1113}
      height={303}
      preload={shouldPreload}
      className={cn("block h-12 w-auto select-none", className)}
    />
  );
}
