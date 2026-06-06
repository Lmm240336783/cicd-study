import type { BookCollectionItem, ContentStatus, CreateBookPayload, UpdateBookPayload } from "@/types";

export type BookManagerFormValues = {
  title: string;
  coverUrl: string;
  description: string;
  pdfUrl: string;
  pdfObjectKey: string;
  pdfFileName: string;
  pdfSizeBytes: number;
  status: ContentStatus;
};

/** 为新增或编辑弹框生成图书表单默认值。 */
export function buildBookFormValues(book?: BookCollectionItem | null): BookManagerFormValues {
  if (!book) {
    return {
      title: "",
      coverUrl: "",
      description: "",
      pdfUrl: "",
      pdfObjectKey: "",
      pdfFileName: "",
      pdfSizeBytes: 0,
      status: "draft",
    };
  }

  return {
    title: book.title,
    coverUrl: book.coverUrl,
    description: book.description,
    pdfUrl: book.pdfUrl,
    pdfObjectKey: book.pdfObjectKey,
    pdfFileName: book.pdfFileName,
    pdfSizeBytes: book.pdfSizeBytes,
    status: book.status,
  };
}

/** 将图书表单值转换为创建接口请求体。 */
export function buildCreateBookPayload(values: BookManagerFormValues): CreateBookPayload {
  return {
    title: values.title.trim(),
    coverUrl: values.coverUrl.trim(),
    description: values.description.trim(),
    pdfObjectKey: values.pdfObjectKey.trim(),
    pdfFileName: values.pdfFileName.trim(),
    pdfSizeBytes: Number(values.pdfSizeBytes) || 0,
    status: values.status,
  };
}

/** 将图书表单值转换为更新接口请求体。 */
export function buildUpdateBookPayload(values: BookManagerFormValues): UpdateBookPayload {
  return buildCreateBookPayload(values);
}
