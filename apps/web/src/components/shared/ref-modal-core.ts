export type RefModalData = Record<string, unknown>;

export type RefModalState<TData extends RefModalData = RefModalData> = {
  open: boolean;
  title: string;
  data: TData;
};

/** 根据标题和本次参数生成打开状态，并始终从默认数据重新构造本次弹框数据。 */
export function openRefModalState<TData extends RefModalData>(
  current: RefModalState<TData>,
  title: string,
  data?: Partial<TData>,
  baseData?: TData,
): RefModalState<TData> {
  return {
    open: true,
    title,
    data: { ...(baseData ?? current.data), ...(data ?? {}) } as TData,
  };
}

/** 生成关闭状态，保留弹框标题和数据上下文。 */
export function closeRefModalState<TData extends RefModalData>(current: RefModalState<TData>): RefModalState<TData> {
  return {
    ...current,
    open: false,
  };
}
