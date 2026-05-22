import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseEnvKeys = {
  url: string;
  key: string;
};

type SupabaseRecord = Record<string, unknown>;

export const SUPABASE_ENV_KEYS = {
  public: {
    url: "SUPABASE_URL",
    key: "SUPABASE_KEY",
  },
  admin: {
    url: "SUPABASE_URL",
    key: "SUPABASE_SECRET_KEY",
  },
} as const;

/** 读取一组 Supabase 连接配置，拿到当前 client 该使用的 URL 和 Key。 */
export function getSupabaseEnv(envKeys: SupabaseEnvKeys) {
  const supabaseUrl = process.env[envKeys.url];
  const supabaseKey = process.env[envKeys.key];

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`缺少 Supabase 环境变量：${envKeys.url} 或 ${envKeys.key}`);
  }

  return {
    supabaseUrl,
    supabaseKey,
  };
}

/** 创建一个可直接调用 `auth`、`from`、`storage` 等能力的 Supabase client。 */
export function createSupabaseClient(envKeys: SupabaseEnvKeys) {
  const { supabaseUrl, supabaseKey } = getSupabaseEnv(envKeys);

  // `createClient(url, key, options)` 是 Supabase JS SDK 的入口。
  // 这里关闭了 session 持久化和自动刷新，因为当前代码运行在服务端，
  // 我们只想把它当成一次性的 API client 来用，不让 SDK 自己管理浏览器登录状态。
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** 基于某张表创建一组常用 CRUD 方法，省掉重复写 `from(tableName)`。 */
export function createSupabaseTableClient<TTable extends string>(
  supabase: SupabaseClient,
  tableName: TTable,
) {
  return {
    /** 读取整张表的全部记录，等价于 SQL 里的 `select * from table`。 */
    selectAll() {
      return supabase.from(tableName).select("*");
    },
    /** 按 `id` 精确查询一条记录；查不到时返回 `null`，不会直接抛错。 */
    selectById(id: string) {
      return supabase.from(tableName).select("*").eq("id", id).maybeSingle();
    },
    /** 新增一条记录，并把数据库最终写入的那条完整记录再读回来。 */
    insert(payload: SupabaseRecord) {
      return supabase.from(tableName).insert(payload).select("*").single();
    },
    /** 按 `id` 更新一条记录，并返回更新后的完整结果。 */
    updateById(id: string, payload: SupabaseRecord) {
      return supabase.from(tableName).update(payload).eq("id", id).select("*").single();
    },
    /** 按 `id` 删除一条记录；这里只返回删除操作本身的结果，不强制再读整行。 */
    deleteById(id: string) {
      return supabase.from(tableName).delete().eq("id", id);
    },
  };
}
