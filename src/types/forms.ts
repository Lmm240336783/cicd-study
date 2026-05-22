export type LoginFormValues = {
  email: string;
  password: string;
};

export type RegisterFormValues = LoginFormValues & {
  name: string;
};

export type CreateImagePayload = {
  title: string;
  description?: string;
  imageUrl: string;
  tags?: string[];
  isFeatured?: boolean;
  status?: "draft" | "published";
};

export type UpdateImagePayload = Partial<CreateImagePayload>;

export type CreateShowPayload = {
  name: string;
  chineseTitle?: string;
  originalTitle?: string;
  year: number;
  country: string;
  genres?: string[];
  carouselImages?: string[];
  rating?: number;
  posterUrl?: string;
  summary?: string;
  recommendReason?: string;
  isFeatured?: boolean;
  status?: "draft" | "published";
};

export type ImportShowPayload = CreateShowPayload & {
  localPosterPath?: string;
  localCarouselPaths?: string[];
};

export type UpdateShowPayload = Partial<CreateShowPayload>;

export type CreateSingerPayload = {
  name: string;
  photoUrl: string;
  isFeatured?: boolean;
  status?: "draft" | "published";
};

export type UpdateSingerPayload = Partial<CreateSingerPayload>;

export type CreateMusicPayload = {
  title: string;
  singerId: string;
  album?: string;
  genre?: string;
  duration?: string;
  coverUrl?: string;
  description?: string;
  isFeatured?: boolean;
  status?: "draft" | "published";
};

export type UpdateMusicPayload = Partial<CreateMusicPayload>;
