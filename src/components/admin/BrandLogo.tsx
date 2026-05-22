import { BrandMark } from "@/components/shared/BrandMark";

/** 渲染后台品牌区标识。 */
export function BrandLogo() {
  return (
    <div className="flex flex-col items-start gap-1">
      <BrandMark className="h-9 w-auto" />
      {/* <div className="text-[11px] font-medium tracking-[0.24em] text-slate-400">Education Ops Console</div> */}
    </div>
  );
}
