"use client";

import { Button, Form, Input, Select, Upload } from "antd";
import type { BookManagerFormValues } from "./book-manager-core";
import { buildBookFormValues } from "./book-manager-core";

const bookStatusOptions = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
] as const;

/** 渲染后台图书管理的首版壳层界面。 */
export function BookManager() {
  const initialValues = buildBookFormValues();

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">图书管理</h2>
            <p className="mt-1 text-sm text-slate-500">维护图书封面、简介、PDF 文件入口和发布状态。</p>
          </div>
          <p className="text-xs text-slate-500">PDF 上传接口预留为 `/api/admin/books/upload-pdf`。</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <Form<BookManagerFormValues>
          layout="vertical"
          initialValues={initialValues}
          requiredMark={false}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Form.Item name="title" label="书名">
              <Input placeholder="请输入图书标题" />
            </Form.Item>

            <Form.Item name="status" label="发布状态">
              <Select options={bookStatusOptions} />
            </Form.Item>
          </div>

          <Form.Item name="coverUrl" label="封面地址">
            <Input placeholder="请输入封面 URL" />
          </Form.Item>

          <Form.Item name="description" label="简介">
            <Input.TextArea rows={4} placeholder="请输入图书简介" />
          </Form.Item>

          <Form.Item label="上传 PDF" className="mb-5">
            <Upload.Dragger
              accept=".pdf,application/pdf"
              beforeUpload={() => false}
              maxCount={1}
              multiple={false}
              className="rounded-xl"
            >
              <div className="py-5">
                <p className="text-sm font-medium text-slate-900">点击或拖拽 PDF 到此处</p>
                <p className="mt-1 text-xs text-slate-500">保存时会调用 `/api/admin/books/upload-pdf` 上传图书文件。</p>
              </div>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item name="pdfUrl" label="PDF 地址">
            <Input placeholder="上传后自动回填 PDF 地址，或直接输入可访问链接" />
          </Form.Item>

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">当前 PDF</p>
            <a
              href={initialValues.pdfUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex text-sm text-sky-600 underline-offset-4 hover:underline"
            >
              {initialValues.pdfUrl || "保存后在这里查看当前 PDF"}
            </a>
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="primary">保存图书信息</Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
