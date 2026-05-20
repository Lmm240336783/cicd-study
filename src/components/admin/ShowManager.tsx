"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Button, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Tag, Upload } from "antd";
import type { TableColumnsType, UploadFile } from "antd";
import { ApiTable, RefModal, toast } from "@/components/shared";
import type { ApiTableRef, RefModalRef } from "@/components/shared";
import type { CreateShowPayload, ImportShowPayload, ShowCollectionItem, UpdateShowPayload } from "@/types";
import {
  buildImportedShowPayload,
  buildCreateShowPayload,
  buildShowPosterUrl,
  buildShowFormValues,
  buildUpdateShowPayload,
} from "./show-manager-core";
import type { ShowManagerFormValues } from "./show-manager-core";
import { requestJson } from "./request-json";

type AdminShowsResponse = {
  data?: ShowCollectionItem[];
};

type ShowModalData = Partial<ShowCollectionItem> & {
  mode?: "create" | "edit";
};

type ShowMutationResponse = {
  data?: ShowCollectionItem;
  message?: string;
};

type ImageUploadResponse = {
  data?: {
    path: string;
    url: string;
  };
  message?: string;
};

type ShowEditorSubmitResult = {
  data: ShowModalData;
  posterFile?: File;
  carouselFileList: UploadFile[];
  values: ShowManagerFormValues;
};

type ShowEditorFormRef = {
  submit: () => Promise<ShowEditorSubmitResult>;
};

/** 判断弹框参数是否包含完整电视剧行信息。 */
function isShowCollectionItem(data: ShowModalData): data is ShowCollectionItem {
  return Boolean(data.id && data.name && typeof data.year === "number" && data.country);
}

/** 根据电视剧表单值生成 Upload 组件的海报展示列表。 */
function buildPosterUploadFileList(values: ShowManagerFormValues): UploadFile[] {
  if (!values.posterUrl) {
    return [];
  }

  return [
    {
      uid: "current-poster",
      name: values.name || "当前海报",
      status: "done",
      url: values.posterUrl,
    },
  ];
}

/** 根据轮播图地址生成 Upload 组件展示列表。 */
function buildCarouselUploadFileList(values: ShowManagerFormValues): UploadFile[] {
  return values.carouselImages.map((imageUrl, index) => ({
    uid: `current-carousel-${index + 1}`,
    name: `${values.name || "当前剧集"}轮播图 ${index + 1}`,
    status: "done",
    url: imageUrl,
  }));
}

/** 上传图片文件并返回公开访问地址。 */
async function uploadShowImageFile(file: File) {
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

/** 将轮播图文件列表解析成最终要保存的图片地址数组。 */
async function resolveCarouselImageUrls(fileList: UploadFile[]) {
  const urls = await Promise.all(
    fileList.map(async (file) => {
      const selectedFile = file.originFileObj as File | undefined;
      if (selectedFile) {
        return uploadShowImageFile(selectedFile);
      }

      return file.url ?? "";
    }),
  );

  return urls.map((url) => url.trim()).filter(Boolean);
}

/** 创建电视剧推荐记录。 */
async function createShow(payload: CreateShowPayload) {
  return requestJson<ShowMutationResponse>(
    "/api/admin/shows",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "新增电视剧失败",
  );
}

/** 通过导入接口快速创建电视剧记录。 */
async function importShow(payload: ImportShowPayload) {
  return requestJson<ShowMutationResponse>(
    "/api/admin/shows/import",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "导入电视剧失败",
  );
}

/** 更新电视剧推荐记录。 */
async function updateShow(id: string, payload: UpdateShowPayload) {
  return requestJson<ShowMutationResponse>(
    `/api/admin/shows/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "更新电视剧失败",
  );
}

/** 删除电视剧推荐记录。 */
async function deleteShow(id: string) {
  return requestJson<{ data?: { success: boolean }; message?: string }>(
    `/api/admin/shows/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    "删除电视剧失败",
  );
}

type ShowEditorFormProps = {
  data: ShowModalData;
};

/** 渲染新增和编辑共用的电视剧表单内容。 */
const ShowEditorForm = forwardRef<ShowEditorFormRef, ShowEditorFormProps>(function ShowEditorForm({ data }, ref) {
  const [form] = Form.useForm<ShowManagerFormValues>();
  const formValues = buildShowFormValues(isShowCollectionItem(data) ? data : null);
  const [posterFileList, setPosterFileList] = useState<UploadFile[]>(() => buildPosterUploadFileList(formValues));
  const [carouselFileList, setCarouselFileList] = useState<UploadFile[]>(() => buildCarouselUploadFileList(formValues));

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        const values = await form.validateFields();
        const selectedPosterFile = posterFileList.find((file) => file.originFileObj)?.originFileObj as File | undefined;
        return {
          data,
          posterFile: selectedPosterFile,
          carouselFileList,
          values,
        };
      },
    }),
    [carouselFileList, data, form, posterFileList],
  );

  return (
      <Form<ShowManagerFormValues>
      form={form}
      layout="vertical"
      initialValues={formValues}
      className="pt-2"
      requiredMark={false}
    >
      <Form.Item name="name" label="剧名" rules={[{ required: true, message: "请输入剧名" }]}>
        <Input placeholder="请输入电视剧名称" />
      </Form.Item>

      <div className="grid gap-4 sm:grid-cols-2">
        <Form.Item name="chineseTitle" label="中文标题" rules={[{ required: true, message: "请输入中文标题" }]}>
          <Input placeholder="请输入中文标题" />
        </Form.Item>

        <Form.Item name="originalTitle" label="原标题" rules={[{ required: true, message: "请输入原标题" }]}>
          <Input placeholder="请输入原标题" />
        </Form.Item>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Form.Item name="country" label="地区" rules={[{ required: true, message: "请输入地区" }]}>
          <Input placeholder="例如 US / UK / DE" />
        </Form.Item>

        <Form.Item name="year" label="年份" rules={[{ required: true, message: "请输入年份" }]}>
          <InputNumber min={1900} max={2100} precision={0} className="w-full" />
        </Form.Item>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Form.Item name="rating" label="评分">
          <InputNumber min={0} max={10} step={0.1} precision={1} className="w-full" />
        </Form.Item>

        <Form.Item name="genres" label="类型">
          <Select mode="tags" placeholder="输入类型后回车" tokenSeparators={[",", "，", " "]} />
        </Form.Item>
      </div>

      <Form.Item label="上传海报" className="mb-5">
        <Upload.Dragger
          accept="image/*"
          beforeUpload={() => false}
          fileList={posterFileList}
          maxCount={1}
          multiple={false}
          onChange={({ fileList: nextFileList }) => {
            setPosterFileList(nextFileList.slice(-1));
          }}
          className="rounded-xl"
        >
          <div className="py-5">
            <p className="text-sm font-medium text-slate-900">点击或拖拽海报到此处</p>
            <p className="mt-1 text-xs text-slate-500">保存时会上传到后台配置的 Supabase Storage。</p>
          </div>
        </Upload.Dragger>
      </Form.Item>

      <Form.Item name="posterUrl" label="海报地址">
        <Input placeholder="可直接输入海报 URL，或上传图片后自动保存 URL" />
      </Form.Item>

      <Form.Item label="轮播图" className="mb-5">
        <Upload
          accept="image/*"
          beforeUpload={() => false}
          fileList={carouselFileList}
          listType="picture-card"
          maxCount={8}
          multiple
          onChange={({ fileList: nextFileList }) => {
            setCarouselFileList(nextFileList);
          }}
        >
          {carouselFileList.length >= 8 ? null : <span className="text-sm">上传轮播图</span>}
        </Upload>
      </Form.Item>

      <Form.Item name="summary" label="简介">
        <Input.TextArea rows={3} placeholder="请输入剧情简介" />
      </Form.Item>

      <Form.Item name="recommendReason" label="推荐理由">
        <Input.TextArea rows={3} placeholder="请输入推荐理由" />
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

/** 将 ISO 时间格式化为后台列表展示文案。 */
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** 渲染电视剧发布状态标签。 */
function renderStatusTag(status: ShowCollectionItem["status"]) {
  if (status === "published") {
    return <Tag color="green">已发布</Tag>;
  }

  return <Tag>草稿</Tag>;
}

/** 渲染电视剧推荐状态标签。 */
function renderFeaturedTag(isFeatured: boolean) {
  if (isFeatured) {
    return <Tag color="blue">推荐</Tag>;
  }

  return <Tag>普通</Tag>;
}

/** 根据弹框模式提交创建或更新请求。 */
async function saveShowEditorResult(result: ShowEditorSubmitResult) {
  const posterUrl = buildShowPosterUrl(
    result.posterFile ? await uploadShowImageFile(result.posterFile) : undefined,
    result.values.posterUrl,
  );
  const carouselImages = await resolveCarouselImageUrls(result.carouselFileList);
  const values = {
    ...result.values,
    carouselImages,
    posterUrl,
  };

  if (result.data.mode === "edit" && result.data.id) {
    await updateShow(result.data.id, buildUpdateShowPayload(values));
    return;
  }

  await createShow(buildCreateShowPayload(values));
}

/** 渲染后台电视剧管理表格、操作区和新增编辑弹框。 */
export function ShowManager() {
  const tableRef = useRef<ApiTableRef>(null);
  const modalRef = useRef<RefModalRef<ShowModalData>>(null);
  const editorFormRef = useRef<ShowEditorFormRef>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  /** 读取导入 JSON 文件并触发后台创建流程。 */
  async function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      setImporting(true);
      const importedPayload = buildImportedShowPayload(JSON.parse(await file.text()));
      await importShow(importedPayload);
      toast.success("电视剧已导入");
      tableRef.current?.reload();
    } catch (error) {
      toast.error(error, "导入失败");
    } finally {
      setImporting(false);
    }
  }

  const columns = useMemo<TableColumnsType<ShowCollectionItem>>(
    () => [
      {
        title: "剧名",
        dataIndex: "name",
        key: "name",
        render: (_, record) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{record.name}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {record.genres.length ? (
                record.genres.map((genre) => (
                  <Tag key={genre} color="purple" className="m-0">
                    {genre}
                  </Tag>
                ))
              ) : (
                <span className="text-xs text-slate-400">暂无类型</span>
              )}
            </div>
          </div>
        ),
      },
      {
        title: "地区/年份",
        key: "countryYear",
        width: 150,
        render: (_, record) => (
          <span className="text-slate-700">
            {record.country} / {record.year}
          </span>
        ),
      },
      {
        title: "评分",
        dataIndex: "rating",
        key: "rating",
        width: 90,
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (status: ShowCollectionItem["status"]) => renderStatusTag(status),
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
                modalRef.current?.open("编辑电视剧", { ...record, mode: "edit" });
              }}
            >
              修改
            </Button>
            <Popconfirm
              title="确认删除这部电视剧？"
              description="删除后将从后台列表移除。"
              okText="确认删除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await deleteShow(record.id);
                  toast.success("电视剧已删除");
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
            <h2 className="text-lg font-semibold text-slate-900">电视剧管理</h2>
            <p className="mt-1 text-sm text-slate-500">维护个人收藏站的电视剧推荐、评分、类型和发布状态。</p>
          </div>
          <p className="text-xs text-slate-500">导入 JSON 时可携带 `localPosterPath`、`localCarouselPaths` 本地图片路径字段。</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            void handleImportChange(event);
          }}
        />
        <ApiTable<ShowCollectionItem, AdminShowsResponse>
          ref={tableRef}
          api="/api/admin/shows"
          columns={columns}
          rowKey="id"
          title="电视剧列表"
          transform={(response) => {
            const rows = response.data ?? [];
            return { list: rows, total: rows.length };
          }}
          rs={() => (
            <Space>
              <Button
                onClick={() => {
                  importInputRef.current?.click();
                }}
                loading={importing}
              >
                导入 JSON
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  modalRef.current?.open("新增电视剧", { mode: "create" });
                }}
              >
                新增电视剧
              </Button>
            </Space>
          )}
        />
      </section>

      <RefModal<ShowModalData>
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

            await saveShowEditorResult(result);
            toast.success(result.data.mode === "edit" ? "电视剧已更新" : "电视剧已新增");
            modalRef.current?.close();
            tableRef.current?.reload();
          } catch (error) {
            toast.error(error, "保存失败");
          } finally {
            setSaving(false);
          }
        }}
      >
        {(data) => <ShowEditorForm ref={editorFormRef} key={data.id ?? data.mode ?? "create"} data={data} />}
      </RefModal>
    </div>
  );
}
