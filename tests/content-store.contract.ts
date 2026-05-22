import { getPublicImageById, getPublicMusicById, getPublicSingerById, listPublicMusicBySingerId } from "@/lib/server/content/store";
import type { ImageCollectionItem, MusicCollectionItem, SingerCollectionItem } from "@/types";

const image: Promise<ImageCollectionItem | null> = getPublicImageById("missing-id");
const music: Promise<MusicCollectionItem | null> = getPublicMusicById("missing-id");
const singer: Promise<SingerCollectionItem | null> = getPublicSingerById("missing-id");
const songs: Promise<MusicCollectionItem[]> = listPublicMusicBySingerId("missing-id");

void image;
void music;
void singer;
void songs;
