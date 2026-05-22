type FeaturedRow = {
  isFeatured: boolean;
  [key: string]: unknown;
};

export type AdminDashboardStats = {
  imagesCount: number;
  showsCount: number;
  featuredImagesCount: number;
  featuredShowsCount: number;
};

/** 根据图片和电视剧列表生成后台仪表盘统计。 */
export function buildDashboardStats(images: FeaturedRow[], shows: FeaturedRow[]): AdminDashboardStats {
  return {
    imagesCount: images.length,
    showsCount: shows.length,
    featuredImagesCount: images.filter((item) => item.isFeatured).length,
    featuredShowsCount: shows.filter((item) => item.isFeatured).length,
  };
}
