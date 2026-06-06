"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Button, Form, Input, Popconfirm, Select, Space, Switch, Tag, Upload } from "antd";
import type { TableColumnsType, UploadFile } from "antd";
import { ApiTable, MediaAsset, RefModal, toast } from "@/components/shared";
import type { ApiTableRef, RefModalRef } from "@/components/shared";
import type {
  CreateImagePayload,
  CreateImageTagPayload,
  GenerateAdminImagePayload,
  GeneratedAdminImageItem,
  ImageCollectionItem,
  ImageGenerationBackground,
  ImageGenerationQuality,
  ImageGenerationSize,
  ImageTagItem,
  MediaType,
  UpdateImagePayload,
} from "@/types";
import { inferMediaTypeFromSource } from "@/lib/utils/media";
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
    mediaType: MediaType;
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

type GenerateImageResponse = {
  data?: GeneratedAdminImageItem;
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

type GenerateImageFormValues = {
  title: string;
  prompt: string;
  size: ImageGenerationSize;
  quality: ImageGenerationQuality;
  background: ImageGenerationBackground;
};

type GenerateImageFormRef = {
  submit: () => Promise<GenerateImageFormValues>;
};

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

/** 从 URL 或文件元信息里推断当前预览媒体类型。 */
function inferPreviewMediaType(file?: File, url?: string) {
  return inferMediaTypeFromSource({
    contentType: file?.type,
    filename: file?.name,
    url,
  });
}

/** 上传图片或视频文件并返回公开访问地址。 */
async function uploadImageFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const result = await requestJson<ImageUploadResponse>(
    "/api/admin/images/upload",
    {
      method: "POST",
      body: formData,
    },
    "媒体上传失败",
  );

  if (!result.data?.url) {
    throw new Error(result.message || "媒体上传失败");
  }

  return result.data.url;
}

/** 调用后台 AI 图片生成接口，显式使用 gpt-image-2 产出图片。 */
async function generateImageWithAi(payload: GenerateAdminImagePayload) {
  const result = await requestJson<GenerateImageResponse>(
    "/api/admin/images/generate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "AI 图片生成失败",
  );

  if (!result.data) {
    throw new Error(result.message || "AI 图片生成失败");
  }

  return result.data;
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
  const formValues = buildImageFormValues(data);
  const [fileList, setFileList] = useState<UploadFile[]>(() => buildUploadFileList(formValues));
  const [previewUrl, setPreviewUrl] = useState(() => formValues.imageUrl);
  const [previewMediaType, setPreviewMediaType] = useState<MediaType>(() => inferPreviewMediaType(undefined, formValues.imageUrl));
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
      setPreviewMediaType(inferPreviewMediaType(latestFile.originFileObj as File));
      return;
    }

    setPreviewUrl(formValues.imageUrl);
    setPreviewMediaType(inferPreviewMediaType(undefined, formValues.imageUrl));
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
          throw new Error("请先上传图片或视频");
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
          <p className="text-sm font-medium text-slate-900">当前媒体预览</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <MediaAsset
              src={previewUrl}
              mediaType={previewMediaType}
              alt="当前图片预览"
              className="h-56 w-full bg-slate-100 object-contain"
              controls={previewMediaType === "video"}
              muted={previewMediaType === "video"}
              playsInline={previewMediaType === "video"}
              preload={previewMediaType === "video" ? "metadata" : undefined}
            />
          </div>
        </div>
      ) : null}

      <Form.Item label="上传媒体" className="mb-5">
        <Upload.Dragger
          accept="image/*,video/mp4,video/webm,video/quicktime,video/ogg"
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
            <p className="text-sm font-medium text-slate-900">点击或拖拽图片 / 视频到此处</p>
            <p className="mt-1 text-xs text-slate-500">保存时会上传到后台配置的 Supabase Storage。</p>
          </div>
        </Upload.Dragger>
      </Form.Item>

      <Form.Item name="imageUrl" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        name="title"
        label="内容标题"
        rules={[{ required: true, message: "请输入内容标题" }]}
      >
        <Input placeholder="请输入图片或视频标题" />
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

/** 根据提示词生成一个适合后台继续编辑的默认标题。 */
function buildGeneratedImageTitle(title: string, prompt: string) {
  const trimmedTitle = title.trim();
  if (trimmedTitle) {
    return trimmedTitle;
  }

  const normalizedPrompt = prompt.replace(/\s+/g, " ").trim();
  return normalizedPrompt.slice(0, 24) || "AI 生成图片";
}

/** 渲染 AI 图片生成弹框内容。 */
const GenerateImageForm = forwardRef<GenerateImageFormRef>(function GenerateImageForm(_, ref) {
  const [form] = Form.useForm<GenerateImageFormValues>();

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        const values = await form.validateFields();
        return {
          title: values.title.trim(),
          prompt: values.prompt.trim(),
          size: values.size,
          quality: values.quality,
          background: values.background,
        };
      },
    }),
    [form],
  );

  return (
    <Form<GenerateImageFormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={{
        title: "",
        prompt: "",
        size: "1024x1024",
        quality: "auto",
        background: "auto",
      }}
      className="pt-2"
    >
      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        当前接口会显式调用 <span className="font-semibold">gpt-image-2</span>，生成结果会先上传到现有 Supabase Storage，再进入图片新增流程。
      </div>

      <Form.Item name="title" label="图片标题">
        <Input placeholder="可选，不填时会根据提示词自动生成标题" />
      </Form.Item>

      <Form.Item
        name="prompt"
        label="提示词"
        rules={[{ required: true, message: "请输入图片提示词" }]}
      >
        <Input.TextArea rows={5} placeholder="例如：一张胶片感的夏日海边照片，阳光、浪花、浅蓝天空，构图干净" />
      </Form.Item>

      <div className="grid gap-4 sm:grid-cols-3">
        <Form.Item name="size" label="尺寸">
          <Select
            options={[
              { value: "1024x1024", label: "1024 × 1024" },
              { value: "1536x1024", label: "1536 × 1024" },
              { value: "1024x1536", label: "1024 × 1536" },
            ]}
          />
        </Form.Item>

        <Form.Item name="quality" label="质量">
          <Select
            options={[
              { value: "auto", label: "自动" },
              { value: "high", label: "高" },
              { value: "medium", label: "中" },
              { value: "low", label: "低" },
            ]}
          />
        </Form.Item>

        <Form.Item name="background" label="背景">
          <Select
            options={[
              { value: "auto", label: "自动" },
              { value: "opaque", label: "不透明" },
              { value: "transparent", label: "透明" },
            ]}
          />
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

/** 渲染媒体类型标签。 */
function renderMediaTypeTag(mediaType: MediaType) {
  if (mediaType === "video") {
    return <Tag color="purple">视频</Tag>;
  }

  return <Tag color="gold">图片</Tag>;
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
  const generateModalRef = useRef<RefModalRef>(null);
  const editorFormRef = useRef<ImageEditorFormRef>(null);
  const generateFormRef = useRef<GenerateImageFormRef>(null);
  const [imageTags, setImageTags] = useState<ImageTagItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

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
        title: "内容标题",
        dataIndex: "title",
        key: "title",
        render: (_, record) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{record.title}</p>
              {renderMediaTypeTag(record.mediaType)}
            </div>
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
                  modalRef.current?.open("编辑内容", { ...record, mode: "edit" });
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
            <h2 className="text-lg font-semibold text-slate-900">媒体管理</h2>
            <p className="mt-1 text-sm text-slate-500">维护个人收藏站的图片、短视频、标签和展示优先级。</p>
          </div>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                generateModalRef.current?.open("AI 生成图片");
              }}
            >
              AI 生成（gpt-image-2）
            </Button>
            <Button
              onClick={() => {
                tagModalRef.current?.open("标签管理");
              }}
            >
              标签管理
            </Button>
          </Space>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <ApiTable<ImageManagerRow, AdminImagesResponse>
          ref={tableRef}
          api="/api/admin/images"
          columns={columns}
          rowKey="id"
          title="媒体列表"
          transform={(response) => {
            const rows = decorateImageRows(response.data ?? []);
            return { list: rows, total: rows.length };
          }}
          rs={() => (
            <Button
              type="primary"
              onClick={() => {
                modalRef.current?.open("新增内容", { mode: "create" });
              }}
            >
              新增内容
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
            toast.success(result.data.mode === "edit" ? "内容已更新" : "内容已新增");
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
        ref={generateModalRef}
        width={680}
        destroyOnHidden
        okText="开始生成"
        cancelText="取消"
        confirmLoading={generating}
        onOk={async () => {
          try {
            setGenerating(true);
            const values = await generateFormRef.current?.submit();
            if (!values) {
              return;
            }

            const generated = await generateImageWithAi({
              prompt: values.prompt,
              size: values.size,
              quality: values.quality,
              background: values.background,
            });

            generateModalRef.current?.close();
            modalRef.current?.open("新增 AI 图片", {
              mode: "create",
              title: buildGeneratedImageTitle(values.title, generated.revisedPrompt),
              imageUrl: generated.imageUrl,
            });
            toast.success(`AI 图片已生成，当前模型：${generated.model}`);
          } catch (error) {
            toast.error(error, "AI 图片生成失败");
          } finally {
            setGenerating(false);
          }
        }}
      >
        {() => <GenerateImageForm ref={generateFormRef} />}
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
