import { getPublicImageById } from "@/lib/server/content/store";
import type { ImageCollectionItem } from "@/types";

const image: Promise<ImageCollectionItem | null> = getPublicImageById("missing-id");

void image;
