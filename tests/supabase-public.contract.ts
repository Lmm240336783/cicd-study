import {
  SUPABASE_ENV_KEYS,
  createSupabasePublicClient,
  createSupabaseTableClient,
} from "@/lib/server/supabase/public";

const publicClient = createSupabasePublicClient();
const publicTableClient = createSupabaseTableClient("images");

void publicClient;
void publicTableClient.selectAll();
void publicTableClient.selectById("image-id");
void publicTableClient.insert({ title: "示例" });
void publicTableClient.updateById("image-id", { title: "更新" });
void publicTableClient.deleteById("image-id");

const urlKey: "SUPABASE_URL" = SUPABASE_ENV_KEYS.url;
const publicKey: "SUPABASE_KEY" = SUPABASE_ENV_KEYS.key;

void urlKey;
void publicKey;
