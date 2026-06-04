"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Button, Form, Input, Popconfirm, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { ApiTable, MediaAsset, RefModal, toast } from "@/components/shared";
import type { ApiTableRef, RefModalRef } from "@/components/shared";
import type { ImageAlbumDetailItem, ImageCollectionItem } from "@/types";
import {
  buildCreateImageAlbumPayload,
  buildImageAlbumFormValues,
  buildImageAlbumImageOptions,
  buildUpdateImageAlbumPayload,
  decorateImageAlbumRows,
} from "./image-album-manager-core";
import type { ImageAlbumManagerFormValues, ImageAlbumManagerRow } from "./image-album-manager-core";
import { requestJson } from "./request-json";

type AdminImageAlbumsResponse = {
  data?: ImageAlbumDetailItem[];
};

type AdminImagesResponse = {
  data?: ImageCollectionItem[];
};

type ImageAlbumMutationResponse = {
  data?: ImageAlbumDetailItem;
  message?: string;
};

type ImageAlbumModalData = Partial<ImageAlbumManagerRow> & {
  mode?: "create" | "edit";
};

type ImageAlbumEditorSubmitResult = {
  data: ImageAlbumModalData;
  values: ImageAlbumManagerFormValues;
};

type ImageAlbumEditorFormRef = {
  submit: () => Promise<ImageAlbumEditorSubmitResult>;
};

/** 判断弹框参数是否包含完整图片合集行信息。 */
function isImageAlbumManagerRow(data: ImageAlbumModalData): data is ImageAlbumManagerRow {
  return Boolean(data.id && data.title && Array.isArray(data.images));
}

/** 查询后台所有图片，供合集选择图片时使用。 */
async function listAdminImages() {
  const result = await requestJson<AdminImagesResponse>("/api/admin/images", { method: "GET" }, "读取图片失败");
  return result.data ?? [];
}

/** 创建图片合集记录。 */
async function createImageAlbum(payload: ReturnType<typeof buildCreateImageAlbumPayload>) {
  return requestJson<ImageAlbumMutationResponse>(
    "/api/admin/image-albums",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "新增合集失败",
  );
}

/** 更新图片合集记录。 */
async function updateImageAlbum(id: string, payload: ReturnType<typeof buildUpdateImageAlbumPayload>) {
  return requestJson<ImageAlbumMutationResponse>(
    `/api/admin/image-albums/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "更新合集失败",
  );
}

/** 删除图片合集记录。 */
async function deleteImageAlbum(id: string) {
  return requestJson<{ data?: { success: boolean }; message?: string }>(
    `/api/admin/image-albums/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    "删除合集失败",
  );
}

type ImageAlbumEditorFormProps = {
  data: ImageAlbumModalData;
  images: ImageCollectionItem[];
};

/** 渲染新增和编辑共用的图片合集表单。 */
const ImageAlbumEditorForm = forwardRef<ImageAlbumEditorFormRef, ImageAlbumEditorFormProps>(function ImageAlbumEditorForm({ data, images }, ref) {
  const [form] = Form.useForm<ImageAlbumManagerFormValues>();
  const formValues = buildImageAlbumFormValues(isImageAlbumManagerRow(data) ? data : null);
  const imageOptions = useMemo(() => buildImageAlbumImageOptions(images), [images]);
  const selectedImageIds = (Form.useWatch("imageIds", form) as string[] | undefined) ?? formValues.imageIds;
  const selectedImages = useMemo(
    () => selectedImageIds.map((imageId) => images.find((image) => image.id === imageId)).filter((image): image is ImageCollectionItem => Boolean(image)),
    [selectedImageIds, images],
  );

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        const values = await form.validateFields();
        return {
          data,
          values,
        };
      },
    }),
    [data, form],
  );

  return (
    <Form<ImageAlbumManagerFormValues>
      form={form}
      layout="vertical"
      initialValues={formValues}
      className="pt-2"
      requiredMark={false}
    >
      <Form.Item
        name="title"
        label="合集标题"
        rules={[{ required: true, message: "请输入合集标题" }]}
      >
        <Input placeholder="请输入图片合集标题" />
      </Form.Item>

      <Form.Item name="description" label="描述">
        <Input.TextArea rows={3} placeholder="请输入合集描述" />
      </Form.Item>

      <Form.Item name="imageIds" label="媒体列表">
        <Select
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="按选择顺序保存图片 / 视频切换顺序"
          options={imageOptions}
        />
      </Form.Item>

      {selectedImages.length > 0 ? (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {selectedImages.slice(0, 8).map((image) => (
            <div key={image.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="relative">
                <MediaAsset
                  src={image.imageUrl}
                  mediaType={image.mediaType}
                  alt={image.title}
                  className="h-24 w-full object-cover"
                  autoPlay={image.mediaType === "video"}
                  loop={image.mediaType === "video"}
                  muted={image.mediaType === "video"}
                  playsInline={image.mediaType === "video"}
                  preload={image.mediaType === "video" ? "metadata" : undefined}
                />
                {image.mediaType === "video" ? (
                  <span className="absolute left-2 top-2 rounded-full bg-slate-950/72 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                    Video
                  </span>
                ) : null}
              </div>
              <p className="truncate px-2 py-1.5 text-xs text-slate-600">{image.title}</p>
            </div>
          ))}
        </div>
      ) : null}

      <Form.Item name="status" label="发布状态">
        <Select
          options={[
            { value: "draft", label: "草稿" },
            { value: "published", label: "已发布" },
          ]}
        />
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

/** 渲染合集发布状态标签。 */
function renderStatusTag(status: ImageAlbumManagerRow["status"]) {
  if (status === "published") {
    return <Tag color="green">已发布</Tag>;
  }

  return <Tag>草稿</Tag>;
}

/** 根据弹框模式提交创建或更新请求。 */
async function saveImageAlbumEditorResult(result: ImageAlbumEditorSubmitResult) {
  if (result.data.mode === "edit" && result.data.id) {
    await updateImageAlbum(result.data.id, buildUpdateImageAlbumPayload(result.values));
    return;
  }

  await createImageAlbum(buildCreateImageAlbumPayload(result.values));
}

/** 渲染后台图片合集管理表格和编辑弹框。 */
export function ImageAlbumManager() {
  const tableRef = useRef<ApiTableRef>(null);
  const modalRef = useRef<RefModalRef<ImageAlbumModalData>>(null);
  const editorFormRef = useRef<ImageAlbumEditorFormRef>(null);
  const [images, setImages] = useState<ImageCollectionItem[]>([]);
  const [saving, setSaving] = useState(false);

  const reloadImages = useCallback(async () => {
    try {
      setImages(await listAdminImages());
    } catch (error) {
      toast.error(error, "读取媒体失败");
    }
  }, []);

  useEffect(() => {
    void reloadImages();
  }, [reloadImages]);

  const columns = useMemo<TableColumnsType<ImageAlbumManagerRow>>(
    () => [
        {
          title: "合集",
          dataIndex: "title",
          key: "title",
          render: (_, record) => (
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-14 w-20 overflow-hidden rounded-lg bg-slate-100">
                {record.coverUrl ? (
                  <MediaAsset
                    src={record.coverUrl}
                    mediaType={record.coverMediaType}
                    alt={record.title}
                    className="h-full w-full object-cover"
                    autoPlay={record.coverMediaType === "video"}
                    loop={record.coverMediaType === "video"}
                    muted={record.coverMediaType === "video"}
                    playsInline={record.coverMediaType === "video"}
                    preload={record.coverMediaType === "video" ? "metadata" : undefined}
                  />
                ) : null}
                {record.coverUrl && record.coverMediaType === "video" ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-950/72 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                    Video
                  </span>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{record.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">{record.description || "暂无描述"}</p>
              </div>
            </div>
          ),
        },
        {
          title: "内容数",
          dataIndex: "imageCount",
          key: "imageCount",
          width: 120,
          render: (imageCount: number) => <span className="text-slate-600">{imageCount} 项</span>,
        },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (status: ImageAlbumManagerRow["status"]) => renderStatusTag(status),
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
        width: 180,
        render: (_, record) => (
          <Space size={6}>
            <Button
              type="link"
              className="px-1"
              onClick={() => {
                modalRef.current?.open("编辑合集", { ...record, mode: "edit" });
              }}
            >
              修改
            </Button>
            <Popconfirm
              title="确认删除这个合集？"
              description="删除合集不会删除原始媒体。"
              okText="确认删除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await deleteImageAlbum(record.id);
                  toast.success("合集已删除");
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
            <h2 className="text-lg font-semibold text-slate-900">合集管理</h2>
            <p className="mt-1 text-sm text-slate-500">把图片和短视频按顺序组合成官网可浏览的合集。</p>
          </div>
          <Button onClick={reloadImages}>刷新媒体</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <ApiTable<ImageAlbumManagerRow, AdminImageAlbumsResponse>
          ref={tableRef}
          api="/api/admin/image-albums"
          columns={columns}
          rowKey="id"
          title="合集列表"
          transform={(response) => {
            const rows = decorateImageAlbumRows(response.data ?? []);
            return { list: rows, total: rows.length };
          }}
          rs={() => (
            <Button
              type="primary"
              onClick={() => {
                modalRef.current?.open("新增合集", { mode: "create" });
              }}
            >
              新增合集
            </Button>
          )}
        />
      </section>

      <RefModal<ImageAlbumModalData>
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

            await saveImageAlbumEditorResult(result);
            toast.success(result.data.mode === "edit" ? "合集已更新" : "合集已新增");
            modalRef.current?.close();
            tableRef.current?.reload();
          } catch (error) {
            toast.error(error, "保存失败");
          } finally {
            setSaving(false);
          }
        }}
      >
        {(data) => <ImageAlbumEditorForm ref={editorFormRef} key={data.id ?? data.mode ?? "create"} data={data} images={images} />}
      </RefModal>
    </div>
  );
}
