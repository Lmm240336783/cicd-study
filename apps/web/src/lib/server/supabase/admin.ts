import "server-only";
import {
  SUPABASE_ENV_KEYS as SUPABASE_ENV_KEY_GROUPS,
  createSupabaseClient as createSupabaseClientBase,
  createSupabaseTableClient as createSupabaseTableClientBase,
} from "@/lib/server/supabase/core";

export const SUPABASE_ENV_KEYS = SUPABASE_ENV_KEY_GROUPS.admin;

/** 创建一个使用服务端密钥的 Supabase client，适合用户管理、后台写入、存储上传。 */
export function createSupabaseAdminClient() {
  return createSupabaseClientBase(SUPABASE_ENV_KEYS);
}

/** 给某张表快速生成后台管理场景可复用的 CRUD 包装。 */
export function createSupabaseTableClient<TTable extends string>(tableName: TTable) {
  return createSupabaseTableClientBase(createSupabaseAdminClient(), tableName);
}
