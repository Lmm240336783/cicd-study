import type { SVGProps } from "react";

/** 渲染统一样式的描边图标容器。 */
function BaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

/** 渲染校区总览分组图标。 */
export function IconOverview(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9.5 12 4l8 5.5" />
      <path d="M5.5 10v8.5h13V10" />
      <path d="M9.5 18.5v-4.5h5v4.5" />
    </BaseIcon>
  );
}

/** 渲染招生线索分组图标。 */
export function IconLeads(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3.5 19c.6-2.8 3-4.5 5.5-4.5s4.9 1.7 5.5 4.5" />
      <path d="M14 19c.4-1.8 2-3 3.8-3 1.2 0 2.2.4 3 1.2" />
    </BaseIcon>
  );
}

/** 渲染报表中心分组图标。 */
export function IconReport(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8.5 14.5h2.5v3h-2.5z" />
      <path d="M12 11.5h2.5v6H12z" />
      <path d="M15.5 8.5H18v9h-2.5z" />
    </BaseIcon>
  );
}

/** 渲染快捷操作图标。 */
export function IconQuick(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5v17" />
      <path d="M3.5 12h17" />
      <path d="M6.5 6.5h0" />
    </BaseIcon>
  );
}

/** 渲染提醒类图标。 */
export function IconBell(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M6.5 10.5a5.5 5.5 0 1 1 11 0v4l2 2H4.5l2-2z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </BaseIcon>
  );
}

/** 渲染报表趋势图标。 */
export function IconTrend(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M4.5 18.5V6" />
      <path d="M4.5 18.5h15" />
      <path d="m8 14 3-3 2.5 2.5 4-4" />
    </BaseIcon>
  );
}
