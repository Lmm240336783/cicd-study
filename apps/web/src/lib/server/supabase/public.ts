import "server-only";
import {
  SUPABASE_ENV_KEYS as SUPABASE_ENV_KEY_GROUPS,
  createSupabaseClient as createSupabaseClientBase,
  createSupabaseTableClient as createSupabaseTableClientBase,
} from "@/lib/server/supabase/core";

export const SUPABASE_ENV_KEYS = SUPABASE_ENV_KEY_GROUPS.public;

/** 创建一个使用公开 key 的 Supabase client，适合登录、公开查询等普通能力。 */
export function createSupabasePublicClient() {
  return createSupabaseClientBase(SUPABASE_ENV_KEYS);
}

/** 给某张表快速生成公开场景可复用的 CRUD 包装。 */
export function createSupabaseTableClient<TTable extends string>(tableName: TTable) {
  return createSupabaseTableClientBase(createSupabasePublicClient(), tableName);
}
