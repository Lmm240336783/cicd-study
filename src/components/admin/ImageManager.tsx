"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Button, Form, Input, Popconfirm, Select, Space, Switch, Tag, Upload } from "antd";
import type { TableColumnsType, UploadFile } from "antd";
import { ApiTable, RefModal, toast } from "@/components/shared";
import type { ApiTableRef, RefModalRef } from "@/components/shared";
import type { CreateImagePayload, CreateImageTagPayload, ImageCollectionItem, ImageTagItem, UpdateImagePayload } from "@/types";
import {
  buildCreateImagePayload,
  buildImageFormValues,
  buildImageTagOptions,
  buildUpdateImagePayload,
  decorateImageRows,
} from "./image-manager-core";
import type { ImageManagerFormValues, ImageManagerRow } from "./image-manager-core";
import { requestJson } from "./request-json";

type AdminImagesResponse = {
  data?: ImageCollectionItem[];
};

type ImageModalData = Partial<ImageManagerRow> & {
  mode?: "create" | "edit";
};

type ImageMutationResponse = {
  data?: ImageCollectionItem;
  message?: string;
};

type ImageUploadResponse = {
  data?: {
    path: string;
    url: string;
  };
  message?: string;
};

type AdminImageTagsResponse = {
  data?: ImageTagItem[];
};

type ImageTagMutationResponse = {
  data?: ImageTagItem;
  message?: string;
};

type ImageEditorSubmitResult = {
  data: ImageModalData;
  file?: File;
  values: ImageManagerFormValues;
};

type ImageEditorFormRef = {
  submit: () => Promise<ImageEditorSubmitResult>;
};

/** 判断弹框参数是否包含完整图片行信息。 */
function isImageManagerRow(data: ImageModalData): data is ImageManagerRow {
  return Boolean(data.id && data.title && data.imageUrl && Array.isArray(data.tags));
}

/** 根据图片表单值生成 Upload 组件的展示列表。 */
function buildUploadFileList(values: ImageManagerFormValues): UploadFile[] {
  if (!values.imageUrl) {
    return [];
  }

  return [
    {
      uid: "current-image",
      name: values.title || "当前图片",
      status: "done",
      url: values.imageUrl,
    },
  ];
}

/** 上传图片文件并返回公开访问地址。 */
async function uploadImageFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const result = await requestJson<ImageUploadResponse>(
    "/api/admin/images/upload",
    {
      method: "POST",
      body: formData,
    },
    "图片上传失败",
  );

  if (!result.data?.url) {
    throw new Error(result.message || "图片上传失败");
  }

  return result.data.url;
}

/** 查询后台图片标签字典。 */
async function listImageTags() {
  const result = await requestJson<AdminImageTagsResponse>("/api/admin/image-tags", { method: "GET" }, "读取标签失败");
  return result.data ?? [];
}

/** 创建图片标签。 */
async function createImageTag(payload: CreateImageTagPayload) {
  return requestJson<ImageTagMutationResponse>(
    "/api/admin/image-tags",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "新增标签失败",
  );
}

/** 更新图片标签名称。 */
async function updateImageTag(id: string, payload: CreateImageTagPayload) {
  return requestJson<ImageTagMutationResponse>(
    `/api/admin/image-tags/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "更新标签失败",
  );
}

/** 删除图片标签。 */
async function deleteImageTag(id: string) {
  return requestJson<{ data?: { success: boolean }; message?: string }>(
    `/api/admin/image-tags/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    "删除标签失败",
  );
}

/** 创建图片收藏记录。 */
async function createImage(payload: CreateImagePayload) {
  return requestJson<ImageMutationResponse>(
    "/api/admin/images",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "新增图片失败",
  );
}

/** 更新图片收藏记录。 */
async function updateImage(id: string, payload: UpdateImagePayload) {
  return requestJson<ImageMutationResponse>(
    `/api/admin/images/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "更新图片失败",
  );
}

/** 删除图片收藏记录。 */
async function deleteImage(id: string) {
  return requestJson<{ data?: { success: boolean }; message?: string }>(
    `/api/admin/images/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    "删除图片失败",
  );
}

type ImageEditorFormProps = {
  data: ImageModalData;
  imageTags: ImageTagItem[];
};

/** 渲染新增和编辑共用的图片表单内容。 */
const ImageEditorForm = forwardRef<ImageEditorFormRef, ImageEditorFormProps>(function ImageEditorForm({ data, imageTags }, ref) {
  const [form] = Form.useForm<ImageManagerFormValues>();
  const formValues = buildImageFormValues(isImageManagerRow(data) ? data : null);
  const [fileList, setFileList] = useState<UploadFile[]>(() => buildUploadFileList(formValues));
  const [previewUrl, setPreviewUrl] = useState(() => formValues.imageUrl);
  const previewObjectUrlRef = useRef<string | null>(null);
  const tagOptions = useMemo(() => buildImageTagOptions(imageTags, formValues.tags), [formValues.tags, imageTags]);

  /** 同步上传列表对应的预览图，优先展示用户刚选择的本地文件。 */
  function updatePreviewUrl(nextFileList: UploadFile[]) {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    const latestFile = nextFileList[0];
    if (latestFile?.originFileObj) {
      const objectUrl = URL.createObjectURL(latestFile.originFileObj);
      previewObjectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      return;
    }

    setPreviewUrl(formValues.imageUrl);
  }

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        const values = await form.validateFields();
        const selectedFile = fileList.find((file) => file.originFileObj)?.originFileObj as File | undefined;

        if (!values.imageUrl && !selectedFile) {
          throw new Error("请先上传图片");
        }

        return {
          data,
          file: selectedFile,
          values,
        };
      },
    }),
    [data, fileList, form],
  );

  return (
    <Form<ImageManagerFormValues>
      form={form}
      layout="vertical"
      initialValues={formValues}
      className="pt-2"
      requiredMark={false}
    >
      {previewUrl ? (
        <div className="mb-5 space-y-2">
          <p className="text-sm font-medium text-slate-900">当前图片预览</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={previewUrl}
              alt="当前图片预览"
              className="h-56 w-full bg-slate-100 object-contain"
            />
          </div>
        </div>
      ) : null}

      <Form.Item label="上传图片" className="mb-5">
        <Upload.Dragger
          accept="image/*"
          beforeUpload={() => false}
          fileList={fileList}
          maxCount={1}
          multiple={false}
          onChange={({ fileList: nextFileList }) => {
            const normalizedFileList = nextFileList.slice(-1);
            setFileList(normalizedFileList);
            updatePreviewUrl(normalizedFileList);
          }}
          className="rounded-xl"
        >
          <div className="py-5">
            <p className="text-sm font-medium text-slate-900">点击或拖拽图片到此处</p>
            <p className="mt-1 text-xs text-slate-500">保存时会上传到后台配置的 Supabase Storage。</p>
          </div>
        </Upload.Dragger>
      </Form.Item>

      <Form.Item name="imageUrl" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        name="title"
        label="图片标题"
        rules={[{ required: true, message: "请输入图片标题" }]}
      >
        <Input placeholder="请输入收藏图片标题" />
      </Form.Item>

      <Form.Item name="tags" label="标签">
        <Select
          mode="tags"
          placeholder="输入标签后回车"
          tokenSeparators={[",", "，", " "]}
          options={tagOptions}
        />
      </Form.Item>

      <Form.Item name="description" label="描述">
        <Input.TextArea rows={3} placeholder="请输入图片描述" />
      </Form.Item>

      <div className="grid gap-4 sm:grid-cols-2">
        <Form.Item name="status" label="发布状态">
          <Select
            options={[
              { value: "draft", label: "草稿" },
              { value: "published", label: "已发布" },
            ]}
          />
        </Form.Item>

        <Form.Item name="isFeatured" label="首页推荐" valuePropName="checked">
          <Switch checkedChildren="推荐" unCheckedChildren="普通" />
        </Form.Item>
      </div>
    </Form>
  );
});

type ImageTagManagerPanelProps = {
  loading: boolean;
  tags: ImageTagItem[];
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
};

/** 渲染图片标签字典的新增、重命名和删除操作区。 */
function ImageTagManagerPanel({ loading, tags, onCreate, onDelete, onRename }: ImageTagManagerPanelProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");

  async function handleCreate() {
    await onCreate(newName);
    setNewName("");
  }

  async function handleRename(id: string) {
    await onRename(id, editingName);
    setEditingId("");
    setEditingName("");
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onPressEnter={handleCreate}
          placeholder="输入新标签名称"
        />
        <Button type="primary" loading={loading} onClick={handleCreate}>
          新增
        </Button>
      </div>

      <div className="space-y-2">
        {tags.length ? (
          tags.map((tag) => {
            const isEditing = editingId === tag.id;

            return (
              <div key={tag.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                {isEditing ? (
                  <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} onPressEnter={() => handleRename(tag.id)} />
                ) : (
                  <Tag color="blue" className="m-0">
                    {tag.name}
                  </Tag>
                )}

                <Space size={6}>
                  {isEditing ? (
                    <>
                      <Button type="link" className="px-1" loading={loading} onClick={() => handleRename(tag.id)}>
                        保存
                      </Button>
                      <Button
                        type="link"
                        className="px-1"
                        onClick={() => {
                          setEditingId("");
                          setEditingName("");
                        }}
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="link"
                      className="px-1"
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditingName(tag.name);
                      }}
                    >
                      重命名
                    </Button>
                  )}
                  <Popconfirm
                    title="确认删除这个标签？"
                    description="删除标签字典不会自动移除已保存图片上的同名标签。"
                    okText="确认删除"
                    cancelText="取消"
                    onConfirm={() => onDelete(tag.id)}
                  >
                    <Button type="link" danger className="px-1" loading={loading}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            暂无标签，请先新增一个标签。
          </div>
        )}
      </div>
    </div>
  );
}

/** 将 ISO 时间格式化为后台列表展示文案。 */
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** 渲染图片发布状态标签。 */
function renderStatusTag(status: ImageManagerRow["status"]) {
  if (status === "published") {
    return <Tag color="green">已发布</Tag>;
  }

  return <Tag>草稿</Tag>;
}

/** 渲染图片推荐状态标签。 */
function renderFeaturedTag(isFeatured: boolean) {
  if (isFeatured) {
    return <Tag color="blue">推荐</Tag>;
  }

  return <Tag>普通</Tag>;
}

/** 根据弹框模式提交创建或更新请求。 */
async function saveImageEditorResult(result: ImageEditorSubmitResult) {
  const imageUrl = result.file ? await uploadImageFile(result.file) : result.values.imageUrl;
  const values = {
    ...result.values,
    imageUrl,
  };

  if (result.data.mode === "edit" && result.data.id) {
    await updateImage(result.data.id, buildUpdateImagePayload(values));
    return;
  }

  await createImage(buildCreateImagePayload(values));
}

/** 渲染后台图片管理表格、操作区和新增编辑弹框。 */
export function ImageManager() {
  const tableRef = useRef<ApiTableRef>(null);
  const modalRef = useRef<RefModalRef<ImageModalData>>(null);
  const tagModalRef = useRef<RefModalRef>(null);
  const editorFormRef = useRef<ImageEditorFormRef>(null);
  const [imageTags, setImageTags] = useState<ImageTagItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);

  const reloadImageTags = useCallback(async () => {
    try {
      setTagLoading(true);
      setImageTags(await listImageTags());
    } catch (error) {
      toast.error(error, "读取标签失败");
    } finally {
      setTagLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialImageTags() {
      try {
        const tags = await listImageTags();
        if (active) {
          setImageTags(tags);
        }
      } catch (error) {
        toast.error(error, "读取标签失败");
      }
    }

    void loadInitialImageTags();

    return () => {
      active = false;
    };
  }, []);

  const columns = useMemo<TableColumnsType<ImageManagerRow>>(
    () => [
      {
        title: "图片标题",
        dataIndex: "title",
        key: "title",
        render: (_, record) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{record.title}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {record.tags.length ? (
                record.tags.map((tag) => (
                  <Tag key={tag} color="blue" className="m-0">
                    {tag}
                  </Tag>
                ))
              ) : (
                <span className="text-xs text-slate-400">暂无标签</span>
              )}
            </div>
          </div>
        ),
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (status: ImageManagerRow["status"]) => renderStatusTag(status),
      },
      {
        title: "推荐",
        dataIndex: "isFeatured",
        key: "isFeatured",
        width: 120,
        render: (isFeatured: boolean) => renderFeaturedTag(isFeatured),
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
                modalRef.current?.open("编辑收藏", { ...record, mode: "edit" });
              }}
            >
              修改
            </Button>
            <Popconfirm
              title="确认删除这张图片？"
              description="删除后将从后台列表移除。"
              okText="确认删除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await deleteImage(record.id);
                  toast.success("图片已删除");
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
            <h2 className="text-lg font-semibold text-slate-900">图片管理</h2>
            <p className="mt-1 text-sm text-slate-500">维护个人收藏站的图片内容、标签和展示优先级。</p>
          </div>
          <Button
            onClick={() => {
              tagModalRef.current?.open("标签管理");
            }}
          >
            标签管理
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <ApiTable<ImageManagerRow, AdminImagesResponse>
          ref={tableRef}
          api="/api/admin/images"
          columns={columns}
          rowKey="id"
          title="图片列表"
          transform={(response) => {
            const rows = decorateImageRows(response.data ?? []);
            return { list: rows, total: rows.length };
          }}
          rs={() => (
            <Button
              type="primary"
              onClick={() => {
                modalRef.current?.open("新增收藏", { mode: "create" });
              }}
            >
              新增收藏
            </Button>
          )}
        />
      </section>

      <RefModal<ImageModalData>
        ref={modalRef}
        width={640}
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

            await saveImageEditorResult(result);
            toast.success(result.data.mode === "edit" ? "图片已更新" : "图片已新增");
            modalRef.current?.close();
            tableRef.current?.reload();
          } catch (error) {
            toast.error(error, "保存失败");
          } finally {
            setSaving(false);
          }
        }}
      >
        {(data) => <ImageEditorForm ref={editorFormRef} key={data.id ?? data.mode ?? "create"} data={data} imageTags={imageTags} />}
      </RefModal>

      <RefModal
        ref={tagModalRef}
        width={560}
        destroyOnHidden
        footer={null}
      >
        <ImageTagManagerPanel
          loading={tagLoading}
          tags={imageTags}
          onCreate={async (name) => {
            try {
              setTagLoading(true);
              await createImageTag({ name });
              toast.success("标签已新增");
              await reloadImageTags();
            } catch (error) {
              toast.error(error, "新增标签失败");
            } finally {
              setTagLoading(false);
            }
          }}
          onRename={async (id, name) => {
            try {
              setTagLoading(true);
              await updateImageTag(id, { name });
              toast.success("标签已更新");
              await reloadImageTags();
            } catch (error) {
              toast.error(error, "更新标签失败");
            } finally {
              setTagLoading(false);
            }
          }}
          onDelete={async (id) => {
            try {
              setTagLoading(true);
              await deleteImageTag(id);
              toast.success("标签已删除");
              await reloadImageTags();
            } catch (error) {
              toast.error(error, "删除标签失败");
            } finally {
              setTagLoading(false);
            }
          }}
        />
      </RefModal>
    </div>
  );
}
