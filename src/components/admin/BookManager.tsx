"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Button, Form, Input, Popconfirm, Select, Space, Tag, Upload } from "antd";
import type { TableColumnsType, UploadFile } from "antd";
import { ApiTable, RefModal, toast } from "@/components/shared";
import type { ApiTableRef, RefModalRef } from "@/components/shared";
import { uploadBookPdfWithMultipart } from "@/lib/client/tos/book-pdf-multipart-upload";
import type { BookCollectionItem, CreateBookPayload, UpdateBookPayload } from "@/types";
import { buildBookFormValues, buildCreateBookPayload, buildUpdateBookPayload } from "./book-manager-core";
import type { BookManagerFormValues } from "./book-manager-core";
import { requestJson } from "./request-json";

const bookStatusOptions = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
];

type AdminBooksResponse = {
  data?: BookCollectionItem[];
};

type BookModalData = Partial<BookCollectionItem> & {
  mode?: "create" | "edit";
};

type BookMutationResponse = {
  data?: BookCollectionItem;
  message?: string;
};

type CoverUploadResponse = {
  data?: {
    path: string;
    url: string;
  };
  message?: string;
};

type BookEditorSubmitResult = {
  coverFile?: File;
  data: BookModalData;
  pdfFile?: File;
  values: BookManagerFormValues;
};

type BookEditorFormRef = {
  submit: () => Promise<BookEditorSubmitResult>;
};

/** 判断弹框参数是否包含完整图书记录。 */
function isBookCollectionItem(data: BookModalData): data is BookCollectionItem {
  return Boolean(
    data.id &&
    data.title &&
    typeof data.coverUrl === "string" &&
    typeof data.pdfUrl === "string" &&
    typeof data.pdfObjectKey === "string" &&
    typeof data.pdfFileName === "string" &&
    typeof data.pdfSizeBytes === "number",
  );
}

/** 根据图书表单值生成封面上传列表。 */
function buildCoverUploadFileList(values: BookManagerFormValues): UploadFile[] {
  if (!values.coverUrl) {
    return [];
  }

  return [
    {
      uid: "current-book-cover",
      name: values.title || "当前封面",
      status: "done",
      url: values.coverUrl,
    },
  ];
}

/** 根据图书表单值生成 PDF 上传列表。 */
function buildPdfUploadFileList(values: BookManagerFormValues): UploadFile[] {
  if (!values.pdfUrl && !values.pdfFileName) {
    return [];
  }

  return [
    {
      uid: "current-book-pdf",
      name: values.pdfFileName || (values.title ? `${values.title}.pdf` : "当前 PDF"),
      status: "done",
      url: values.pdfUrl,
    },
  ];
}

/** 上传图书封面并返回公开地址。 */
async function uploadCoverFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const result = await requestJson<CoverUploadResponse>(
    "/api/admin/images/upload",
    {
      method: "POST",
      body: formData,
    },
    "封面上传失败",
  );

  if (!result.data?.url) {
    throw new Error(result.message || "封面上传失败");
  }

  return result.data.url;
}

/** 创建图书记录。 */
async function createBook(payload: CreateBookPayload) {
  return requestJson<BookMutationResponse>(
    "/api/admin/books",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "新增图书失败",
  );
}

/** 更新图书记录。 */
async function updateBook(id: string, payload: UpdateBookPayload) {
  return requestJson<BookMutationResponse>(
    `/api/admin/books/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "更新图书失败",
  );
}

/** 删除图书记录。 */
async function deleteBook(id: string) {
  return requestJson<{ data?: { success: boolean }; message?: string }>(
    `/api/admin/books/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    "删除图书失败",
  );
}

type BookEditorFormProps = {
  data: BookModalData;
};

/** 渲染新增和编辑共用的图书表单内容。 */
const BookEditorForm = forwardRef<BookEditorFormRef, BookEditorFormProps>(function BookEditorForm({ data }, ref) {
  const [form] = Form.useForm<BookManagerFormValues>();
  const formValues = buildBookFormValues(isBookCollectionItem(data) ? data : null);
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>(() => buildCoverUploadFileList(formValues));
  const [pdfFileList, setPdfFileList] = useState<UploadFile[]>(() => buildPdfUploadFileList(formValues));
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(() => formValues.coverUrl);
  const coverObjectUrlRef = useRef<string | null>(null);
  const currentCoverUrl = Form.useWatch("coverUrl", form) ?? "";
  const currentPdfUrl = Form.useWatch("pdfUrl", form) ?? "";
  const currentPdfFileName = Form.useWatch("pdfFileName", form) ?? "";
  const normalizedCoverUrl = currentCoverUrl.trim();
  const normalizedPdfUrl = currentPdfUrl.trim();
  const normalizedPdfFileName = currentPdfFileName.trim();
  const pendingPdfFileName = (pdfFileList.find((file) => file.originFileObj)?.originFileObj as File | undefined)?.name ?? "";

  /** 同步封面上传列表对应的预览图。 */
  function updateCoverPreview(nextFileList: UploadFile[]) {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current);
      coverObjectUrlRef.current = null;
    }

    const latestFile = nextFileList[0];
    if (latestFile?.originFileObj) {
      const objectUrl = URL.createObjectURL(latestFile.originFileObj);
      coverObjectUrlRef.current = objectUrl;
      setCoverPreviewUrl(objectUrl);
      return;
    }

    setCoverPreviewUrl(normalizedCoverUrl || formValues.coverUrl);
  }

  useEffect(() => {
    if (!coverObjectUrlRef.current) {
      setCoverPreviewUrl(normalizedCoverUrl);
    }
  }, [normalizedCoverUrl]);

  useEffect(() => {
    return () => {
      if (coverObjectUrlRef.current) {
        URL.revokeObjectURL(coverObjectUrlRef.current);
      }
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        const values = await form.validateFields();
        const selectedCoverFile = coverFileList.find((file) => file.originFileObj)?.originFileObj as File | undefined;
        const selectedPdfFile = pdfFileList.find((file) => file.originFileObj)?.originFileObj as File | undefined;

        if (!values.coverUrl && !selectedCoverFile) {
          throw new Error("请先上传封面");
        }

        if (!values.pdfObjectKey && !selectedPdfFile) {
          throw new Error("请先上传 PDF");
        }

        return {
          coverFile: selectedCoverFile,
          data,
          pdfFile: selectedPdfFile,
          values,
        };
      },
    }),
    [coverFileList, data, form, pdfFileList],
  );

  return (
    <Form<BookManagerFormValues>
      form={form}
      layout="vertical"
      initialValues={formValues}
      className="pt-2"
      requiredMark={false}
    >
      {coverPreviewUrl ? (
        <div className="mb-5 space-y-2">
          <p className="text-sm font-medium text-slate-900">当前封面预览</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={coverPreviewUrl}
              alt="当前封面预览"
              className="h-56 w-full bg-slate-100 object-contain"
            />
          </div>
        </div>
      ) : null}

      <Form.Item label="上传封面" className="mb-5">
        <Upload.Dragger
          accept="image/*"
          beforeUpload={() => false}
          fileList={coverFileList}
          maxCount={1}
          multiple={false}
          onChange={({ fileList: nextFileList }) => {
            const normalizedFileList = nextFileList.slice(-1);
            setCoverFileList(normalizedFileList);
            updateCoverPreview(normalizedFileList);
          }}
          className="rounded-xl"
        >
          <div className="py-5">
            <p className="text-sm font-medium text-slate-900">点击或拖拽封面到此处</p>
            <p className="mt-1 text-xs text-slate-500">保存时会调用 `/api/admin/images/upload` 上传封面。</p>
          </div>
        </Upload.Dragger>
      </Form.Item>

      <Form.Item name="coverUrl" label="封面地址">
        <Input placeholder="上传后自动回填封面地址，或直接输入可访问链接" />
      </Form.Item>

      <Form.Item
        name="title"
        label="书名"
        rules={[{ required: true, message: "请输入图书标题" }]}
      >
        <Input placeholder="请输入图书标题" />
      </Form.Item>

      <Form.Item name="description" label="简介">
        <Input.TextArea rows={4} placeholder="请输入图书简介" />
      </Form.Item>

      <Form.Item name="pdfUrl" hidden>
        <Input />
      </Form.Item>

      <Form.Item name="pdfObjectKey" hidden>
        <Input />
      </Form.Item>

      <Form.Item name="pdfFileName" hidden>
        <Input />
      </Form.Item>

      <Form.Item name="pdfSizeBytes" hidden>
        <Input />
      </Form.Item>

      <Form.Item label="上传 PDF" className="mb-5">
        <Upload.Dragger
          accept=".pdf,application/pdf"
          beforeUpload={() => false}
          fileList={pdfFileList}
          maxCount={1}
          multiple={false}
          onChange={({ fileList: nextFileList }) => {
            setPdfFileList(nextFileList.slice(-1));
          }}
          className="rounded-xl"
        >
          <div className="py-5">
            <p className="text-sm font-medium text-slate-900">点击或拖拽 PDF 到此处</p>
            <p className="mt-1 text-xs text-slate-500">保存时会先向 `/api/admin/books/upload-session` 申请上传会话，再直接分片上传到 TOS。</p>
          </div>
        </Upload.Dragger>
      </Form.Item>

      <div className="mb-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
        <p className="text-sm font-medium text-slate-900">当前 PDF</p>
        {pendingPdfFileName ? (
          <p className="mt-1 text-sm text-slate-600">{pendingPdfFileName}，保存时会直接分片上传到 TOS。</p>
        ) : null}
        {normalizedPdfUrl ? (
          <a
            href={normalizedPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex text-sm text-sky-600 underline-offset-4 hover:underline"
          >
            {normalizedPdfUrl}
          </a>
        ) : normalizedPdfFileName ? (
          <p className="mt-1 text-sm text-slate-600">{normalizedPdfFileName}</p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">保存后在这里查看当前 PDF</p>
        )}
      </div>

      <Form.Item name="status" label="发布状态">
        <Select options={bookStatusOptions} />
      </Form.Item>
    </Form>
  );
});

/** 将 ISO 时间格式化为后台列表展示文案。 */
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** 渲染图书发布状态标签。 */
function renderStatusTag(status: BookCollectionItem["status"]) {
  if (status === "published") {
    return <Tag color="green">已发布</Tag>;
  }

  return <Tag>草稿</Tag>;
}

/** 根据弹框模式提交创建或更新请求。 */
async function saveBookEditorResult(result: BookEditorSubmitResult) {
  const coverUrl = result.coverFile ? await uploadCoverFile(result.coverFile) : result.values.coverUrl;
  const uploadedPdf = result.pdfFile
    ? await uploadBookPdfWithMultipart(result.pdfFile)
    : {
        objectKey: result.values.pdfObjectKey,
        fileName: result.values.pdfFileName,
        fileSize: result.values.pdfSizeBytes,
      };
  const values = {
    ...result.values,
    coverUrl,
    pdfObjectKey: uploadedPdf.objectKey,
    pdfFileName: uploadedPdf.fileName,
    pdfSizeBytes: uploadedPdf.fileSize,
  };

  if (result.data.mode === "edit" && result.data.id) {
    await updateBook(result.data.id, buildUpdateBookPayload(values));
    return;
  }

  await createBook(buildCreateBookPayload(values));
}

/** 渲染后台图书管理表格、操作区和新增编辑弹框。 */
export function BookManager() {
  const tableRef = useRef<ApiTableRef>(null);
  const modalRef = useRef<RefModalRef<BookModalData>>(null);
  const editorFormRef = useRef<BookEditorFormRef>(null);
  const [saving, setSaving] = useState(false);

  const columns = useMemo<TableColumnsType<BookCollectionItem>>(
    () => [
      {
        title: "书名",
        dataIndex: "title",
        key: "title",
        render: (_, record) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{record.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {record.description || "暂无简介"}
            </p>
          </div>
        ),
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (status: BookCollectionItem["status"]) => renderStatusTag(status),
      },
      {
        title: "更新时间",
        dataIndex: "updatedAt",
        key: "updatedAt",
        width: 180,
        render: (updatedAt: string) => <span className="text-slate-600">{formatDateTime(updatedAt)}</span>,
      },
      {
        title: "操作",
        key: "actions",
        width: 220,
        render: (_, record) => (
          <Space size={6}>
            <Button
              type="link"
              className="px-1"
              onClick={() => {
                modalRef.current?.open("编辑图书", { ...record, mode: "edit" });
              }}
            >
              修改
            </Button>
            <a
              href={record.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="px-1 text-sm text-sky-600 transition hover:text-sky-700"
            >
              查看 PDF
            </a>
            <Popconfirm
              title="确认删除这本图书？"
              description="删除后将从后台列表移除。"
              okText="确认删除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await deleteBook(record.id);
                  toast.success("图书已删除");
                  tableRef.current?.reload();
                } catch (error) {
                  toast.error(error, "删除失败");
                }
              }}
            >
              <Button type="link" danger className="px-1">
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">图书管理</h2>
            <p className="mt-1 text-sm text-slate-500">维护图书封面、简介、PDF 文件入口和发布状态。</p>
          </div>
          <p className="text-xs text-slate-500">封面上传走 `/api/admin/images/upload`，PDF 上传改为向 `/api/admin/books/upload-session` 申请 TOS 私有分片上传会话。</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <ApiTable<BookCollectionItem, AdminBooksResponse>
          ref={tableRef}
          api="/api/admin/books"
          columns={columns}
          rowKey="id"
          title="图书列表"
          transform={(response) => {
            const rows = response.data ?? [];
            return { list: rows, total: rows.length };
          }}
          rs={() => (
            <Button
              type="primary"
              onClick={() => {
                modalRef.current?.open("新增图书", { mode: "create" });
              }}
            >
              新增图书
            </Button>
          )}
        />
      </section>

      <RefModal<BookModalData>
        ref={modalRef}
        width={720}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        onOk={async () => {
          try {
            setSaving(true);
            const result = await editorFormRef.current?.submit();
            if (!result) {
              return;
            }

            await saveBookEditorResult(result);
            toast.success(result.data.mode === "edit" ? "图书已更新" : "图书已新增");
            modalRef.current?.close();
            tableRef.current?.reload();
          } catch (error) {
            toast.error(error, "保存失败");
          } finally {
            setSaving(false);
          }
        }}
      >
        {(data) => <BookEditorForm ref={editorFormRef} key={data.id ?? data.mode ?? "create"} data={data} />}
      </RefModal>
    </div>
  );
}
