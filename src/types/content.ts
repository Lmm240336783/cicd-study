export type ContentStatus = "draft" | "published";

export type MediaType = "image" | "video";

export type ImageGenerationSize = "1024x1024" | "1536x1024" | "1024x1536";

export type ImageGenerationQuality = "low" | "medium" | "high" | "auto";

export type ImageGenerationBackground = "opaque" | "transparent" | "auto";

export type ImageCollectionItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  mediaType: MediaType;
  tags: string[];
  isFeatured: boolean;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ImageAlbumListItem = {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  coverMediaType: MediaType;
  imageCount: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ImageAlbumDetailItem = ImageAlbumListItem & {
  images: ImageCollectionItem[];
};

export type BookCollectionItem = {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  pdfUrl: string;
  pdfObjectKey: string;
  pdfFileName: string;
  pdfSizeBytes: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ImageTagItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedAdminImageItem = {
  model: string;
  prompt: string;
  revisedPrompt: string;
  size: ImageGenerationSize;
  quality: ImageGenerationQuality;
  background: ImageGenerationBackground;
  imageUrl: string;
  storagePath: string;
};

export type ShowCollectionItem = {
  id: string;
  name: string;
  chineseTitle: string;
  originalTitle: string;
  year: number;
  country: string;
  genres: string[];
  carouselImages: string[];
  rating: number;
  posterUrl: string;
  summary: string;
  recommendReason: string;
  isFeatured: boolean;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type SingerCollectionItem = {
  id: string;
  name: string;
  photoUrl: string;
  isFeatured: boolean;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type MusicCollectionItem = {
  id: string;
  title: string;
  singerId: string;
  album: string;
  genre: string;
  duration: string;
  coverUrl: string;
  description: string;
  isFeatured: boolean;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateImageTagPayload = {
  name: string;
};

export type UpdateImageTagPayload = {
  name?: string;
};

export type HomePublicData = {
  featuredImages: ImageCollectionItem[];
  featuredShows: ShowCollectionItem[];
  featuredSingers: SingerCollectionItem[];
};
