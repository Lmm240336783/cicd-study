export type ContentStatus = "draft" | "published";

export type ImageCollectionItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  isFeatured: boolean;
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
