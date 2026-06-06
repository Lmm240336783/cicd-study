import { ImageDetailClient } from "@/components/site/ImageDetailClient";

type ImageDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/** 渲染前台图片收藏详情页客户端壳。 */
export default async function ImageDetailPage({ params }: ImageDetailPageProps) {
  const { id } = await params;
  return <ImageDetailClient id={id} />;
}
