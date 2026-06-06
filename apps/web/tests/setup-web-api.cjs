class TestFormData {
  constructor() {
    this.values = new Map();
  }

  set(key, value) {
    this.values.set(key, value);
  }

  get(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
}

class TestResponse {
  constructor(body = null, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
  }

  async json() {
    if (this.body === null || this.body === undefined) {
      return null;
    }

    if (typeof this.body === "string") {
      return JSON.parse(this.body);
    }

    return this.body;
  }

  static json(body, init = {}) {
    return new TestResponse(body, init);
  }
}

globalThis.FormData ??= TestFormData;
globalThis.Response ??= TestResponse;
globalThis.fetch ??= async () => {
  throw new Error("Test fetch was called without a stub");
};
