const TOKEN_KEY = "token";

/** 读取本地存储中的登录 token。 */
function get() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

/** 写入登录 token 到本地存储。 */
function set(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, value);
}

/** 从本地存储移除登录 token。 */
function remove() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
}

export const token = {
  get,
  set,
  remove,
};
