import { ImageAlbumDetailClient } from "@/components/site/ImageAlbumDetailClient";

type ImageAlbumDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/** 渲染前台图片合集详情客户端壳。 */
export default async function PublicImageAlbumDetailPage({ params }: ImageAlbumDetailPageProps) {
  const { id } = await params;
  return <ImageAlbumDetailClient id={id} />;
}
