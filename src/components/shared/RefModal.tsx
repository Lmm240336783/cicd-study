"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "antd";
import type { ModalProps } from "antd";
import { closeRefModalState, openRefModalState } from "./ref-modal-core";
import type { RefModalData, RefModalState } from "./ref-modal-core";

export type RefModalRef<TData extends RefModalData = RefModalData> = {
  close: () => void;
  open: (title: string, data?: Partial<TData>) => void;
};

export type RefModalChildren<TData extends RefModalData> = ReactNode | ((data: TData) => ReactNode);

export type RefModalProps<TData extends RefModalData = RefModalData> = Omit<
  ModalProps,
  "children" | "open" | "title"
> & {
  children?: RefModalChildren<TData>;
  data?: TData;
};

/** 渲染可通过 ref 打开和关闭的通用 antd Modal。 */
function RefModalInner<TData extends RefModalData = RefModalData>(
  { children, data, onCancel, ...modalProps }: RefModalProps<TData>,
  ref: React.ForwardedRef<RefModalRef<TData>>,
) {
  const [state, setState] = useState<RefModalState<TData>>({
    open: false,
    title: "",
    data: (data ?? {}) as TData,
  });

  const close = useCallback(() => {
    setState((current) => closeRefModalState(current));
  }, []);

  const open = useCallback((title: string, nextData?: Partial<TData>) => {
    setState((current) => openRefModalState(current, title, nextData));
  }, []);

  const handleCancel = useCallback<NonNullable<ModalProps["onCancel"]>>(
    (event) => {
      close();
      onCancel?.(event);
    },
    [close, onCancel],
  );

  useImperativeHandle(ref, () => ({ close, open }), [close, open]);

  return (
    <Modal {...modalProps} open={state.open} title={state.title} onCancel={handleCancel}>
      {typeof children === "function" ? children(state.data) : children}
    </Modal>
  );
}

export const RefModal = forwardRef(RefModalInner) as <TData extends RefModalData = RefModalData>(
  props: RefModalProps<TData> & React.RefAttributes<RefModalRef<TData>>,
) => React.ReactElement | null;
