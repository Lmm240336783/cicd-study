import {
  SUPABASE_ENV_KEYS,
  createSupabaseAdminClient,
  createSupabaseTableClient,
} from "@/lib/server/supabase/admin";

const adminClient = createSupabaseAdminClient();
const tableClient = createSupabaseTableClient("images");

void adminClient;
void tableClient.selectAll();
void tableClient.selectById("image-id");
void tableClient.insert({ title: "示例" });
void tableClient.updateById("image-id", { title: "更新" });
void tableClient.deleteById("image-id");

const urlKey: "SUPABASE_URL" = SUPABASE_ENV_KEYS.url;
const serviceKey: "SUPABASE_SECRET_KEY" = SUPABASE_ENV_KEYS.key;

void urlKey;
void serviceKey;
