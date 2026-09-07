"use strict";
const require$$3$1 = require("electron");
const require$$1$1 = require("fs");
const require$$1 = require("path");
const require$$0$1 = require("os");
const require$$3 = require("crypto");
const path$6 = require("node:path");
const node_url = require("node:url");
const fs$c = require("node:fs");
const require$$0$2 = require("util");
const require$$1$2 = require("stream");
const require$$1$3 = require("zlib");
const require$$0$3 = require("assert");
const require$$3$2 = require("buffer");
const node_crypto = require("node:crypto");
const require$$1$4 = require("child_process");
const require$$0$4 = require("tty");
const require$$4 = require("net");
const require$$5 = require("https");
const require$$6 = require("http");
const module$1 = require("module");
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var main = { exports: {} };
const fs$b = require$$1$1;
const path$5 = require$$1;
const os$9 = require$$0$1;
const crypto$1 = require$$3;
const TIPS = [
  "◈ encrypted .env [www.dotenvx.com]",
  "◈ secrets for agents [www.dotenvx.com]",
  "⌁ auth for agents [www.vestauth.com]",
  "⌘ custom filepath { path: '/custom/path/.env' }",
  "⌘ enable debugging { debug: true }",
  "⌘ override existing { override: true }",
  "⌘ suppress logs { quiet: true }",
  "⌘ multiple files { path: ['.env.local', '.env'] }"
];
function _getRandomTip() {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}
function parseBoolean(value) {
  if (typeof value === "string") {
    return !["false", "0", "no", "off", ""].includes(value.toLowerCase());
  }
  return Boolean(value);
}
function supportsAnsi() {
  return process.stdout.isTTY;
}
function dim(text) {
  return supportsAnsi() ? `\x1B[2m${text}\x1B[0m` : text;
}
const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
function parse$1(src2) {
  const obj = {};
  let lines = src2.toString();
  lines = lines.replace(/\r\n?/mg, "\n");
  let match;
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1];
    let value = match[2] || "";
    value = value.trim();
    const maybeQuote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, "\n");
      value = value.replace(/\\r/g, "\r");
    }
    obj[key] = value;
  }
  return obj;
}
function _parseVault(options2) {
  options2 = options2 || {};
  const vaultPath = _vaultPath(options2);
  options2.path = vaultPath;
  const result = DotenvModule.configDotenv(options2);
  if (!result.parsed) {
    const err2 = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
    err2.code = "MISSING_DATA";
    throw err2;
  }
  const keys = _dotenvKey(options2).split(",");
  const length = keys.length;
  let decrypted;
  for (let i = 0; i < length; i++) {
    try {
      const key = keys[i].trim();
      const attrs = _instructions(result, key);
      decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
      break;
    } catch (error) {
      if (i + 1 >= length) {
        throw error;
      }
    }
  }
  return DotenvModule.parse(decrypted);
}
function _warn(message) {
  console.error(`⚠ ${message}`);
}
function _debug(message) {
  console.log(`┆ ${message}`);
}
function _log(message) {
  console.log(`◇ ${message}`);
}
function _dotenvKey(options2) {
  if (options2 && options2.DOTENV_KEY && options2.DOTENV_KEY.length > 0) {
    return options2.DOTENV_KEY;
  }
  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
    return process.env.DOTENV_KEY;
  }
  return "";
}
function _instructions(result, dotenvKey) {
  let uri;
  try {
    uri = new URL(dotenvKey);
  } catch (error) {
    if (error.code === "ERR_INVALID_URL") {
      const err2 = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
      err2.code = "INVALID_DOTENV_KEY";
      throw err2;
    }
    throw error;
  }
  const key = uri.password;
  if (!key) {
    const err2 = new Error("INVALID_DOTENV_KEY: Missing key part");
    err2.code = "INVALID_DOTENV_KEY";
    throw err2;
  }
  const environment = uri.searchParams.get("environment");
  if (!environment) {
    const err2 = new Error("INVALID_DOTENV_KEY: Missing environment part");
    err2.code = "INVALID_DOTENV_KEY";
    throw err2;
  }
  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
  const ciphertext = result.parsed[environmentKey];
  if (!ciphertext) {
    const err2 = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
    err2.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
    throw err2;
  }
  return { ciphertext, key };
}
function _vaultPath(options2) {
  let possibleVaultPath = null;
  if (options2 && options2.path && options2.path.length > 0) {
    if (Array.isArray(options2.path)) {
      for (const filepath of options2.path) {
        if (fs$b.existsSync(filepath)) {
          possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
        }
      }
    } else {
      possibleVaultPath = options2.path.endsWith(".vault") ? options2.path : `${options2.path}.vault`;
    }
  } else {
    possibleVaultPath = path$5.resolve(process.cwd(), ".env.vault");
  }
  if (fs$b.existsSync(possibleVaultPath)) {
    return possibleVaultPath;
  }
  return null;
}
function _resolveHome(envPath) {
  return envPath[0] === "~" ? path$5.join(os$9.homedir(), envPath.slice(1)) : envPath;
}
function _configVault(options2) {
  const debug2 = parseBoolean(process.env.DOTENV_CONFIG_DEBUG || options2 && options2.debug);
  const quiet = parseBoolean(process.env.DOTENV_CONFIG_QUIET || options2 && options2.quiet);
  if (debug2 || !quiet) {
    _log("loading env from encrypted .env.vault");
  }
  const parsed = DotenvModule._parseVault(options2);
  let processEnv = process.env;
  if (options2 && options2.processEnv != null) {
    processEnv = options2.processEnv;
  }
  DotenvModule.populate(processEnv, parsed, options2);
  return { parsed };
}
function configDotenv(options2) {
  const dotenvPath = path$5.resolve(process.cwd(), ".env");
  let encoding = "utf8";
  let processEnv = process.env;
  if (options2 && options2.processEnv != null) {
    processEnv = options2.processEnv;
  }
  let debug2 = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || options2 && options2.debug);
  let quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || options2 && options2.quiet);
  if (options2 && options2.encoding) {
    encoding = options2.encoding;
  } else {
    if (debug2) {
      _debug("no encoding is specified (UTF-8 is used by default)");
    }
  }
  let optionPaths = [dotenvPath];
  if (options2 && options2.path) {
    if (!Array.isArray(options2.path)) {
      optionPaths = [_resolveHome(options2.path)];
    } else {
      optionPaths = [];
      for (const filepath of options2.path) {
        optionPaths.push(_resolveHome(filepath));
      }
    }
  }
  let lastError;
  const parsedAll = {};
  for (const path2 of optionPaths) {
    try {
      const parsed = DotenvModule.parse(fs$b.readFileSync(path2, { encoding }));
      DotenvModule.populate(parsedAll, parsed, options2);
    } catch (e) {
      if (debug2) {
        _debug(`failed to load ${path2} ${e.message}`);
      }
      lastError = e;
    }
  }
  const populated = DotenvModule.populate(processEnv, parsedAll, options2);
  debug2 = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || debug2);
  quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || quiet);
  if (debug2 || !quiet) {
    const keysCount = Object.keys(populated).length;
    const shortPaths = [];
    for (const filePath of optionPaths) {
      try {
        const relative = path$5.relative(process.cwd(), filePath);
        shortPaths.push(relative);
      } catch (e) {
        if (debug2) {
          _debug(`failed to load ${filePath} ${e.message}`);
        }
        lastError = e;
      }
    }
    _log(`injected env (${keysCount}) from ${shortPaths.join(",")} ${dim(`// tip: ${_getRandomTip()}`)}`);
  }
  if (lastError) {
    return { parsed: parsedAll, error: lastError };
  } else {
    return { parsed: parsedAll };
  }
}
function config(options2) {
  if (_dotenvKey(options2).length === 0) {
    return DotenvModule.configDotenv(options2);
  }
  const vaultPath = _vaultPath(options2);
  if (!vaultPath) {
    _warn(`you set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}`);
    return DotenvModule.configDotenv(options2);
  }
  return DotenvModule._configVault(options2);
}
function decrypt(encrypted, keyStr) {
  const key = Buffer.from(keyStr.slice(-64), "hex");
  let ciphertext = Buffer.from(encrypted, "base64");
  const nonce = ciphertext.subarray(0, 12);
  const authTag = ciphertext.subarray(-16);
  ciphertext = ciphertext.subarray(12, -16);
  try {
    const aesgcm = crypto$1.createDecipheriv("aes-256-gcm", key, nonce);
    aesgcm.setAuthTag(authTag);
    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
  } catch (error) {
    const isRange = error instanceof RangeError;
    const invalidKeyLength = error.message === "Invalid key length";
    const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
    if (isRange || invalidKeyLength) {
      const err2 = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
      err2.code = "INVALID_DOTENV_KEY";
      throw err2;
    } else if (decryptionFailed) {
      const err2 = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
      err2.code = "DECRYPTION_FAILED";
      throw err2;
    } else {
      throw error;
    }
  }
}
function populate(processEnv, parsed, options2 = {}) {
  const debug2 = Boolean(options2 && options2.debug);
  const override = Boolean(options2 && options2.override);
  const populated = {};
  if (typeof parsed !== "object") {
    const err2 = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
    err2.code = "OBJECT_REQUIRED";
    throw err2;
  }
  for (const key of Object.keys(parsed)) {
    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
      if (override === true) {
        processEnv[key] = parsed[key];
        populated[key] = parsed[key];
      }
      if (debug2) {
        if (override === true) {
          _debug(`"${key}" is already defined and WAS overwritten`);
        } else {
          _debug(`"${key}" is already defined and was NOT overwritten`);
        }
      }
    } else {
      processEnv[key] = parsed[key];
      populated[key] = parsed[key];
    }
  }
  return populated;
}
const DotenvModule = {
  configDotenv,
  _configVault,
  _parseVault,
  config,
  decrypt,
  parse: parse$1,
  populate
};
main.exports.configDotenv = DotenvModule.configDotenv;
main.exports._configVault = DotenvModule._configVault;
main.exports._parseVault = DotenvModule._parseVault;
main.exports.config = DotenvModule.config;
main.exports.decrypt = DotenvModule.decrypt;
main.exports.parse = DotenvModule.parse;
main.exports.populate = DotenvModule.populate;
main.exports = DotenvModule;
var mainExports = main.exports;
const options = {};
if (process.env.DOTENV_CONFIG_ENCODING != null) {
  options.encoding = process.env.DOTENV_CONFIG_ENCODING;
}
if (process.env.DOTENV_CONFIG_PATH != null) {
  options.path = process.env.DOTENV_CONFIG_PATH;
}
if (process.env.DOTENV_CONFIG_QUIET != null) {
  options.quiet = process.env.DOTENV_CONFIG_QUIET;
}
if (process.env.DOTENV_CONFIG_DEBUG != null) {
  options.debug = process.env.DOTENV_CONFIG_DEBUG;
}
if (process.env.DOTENV_CONFIG_OVERRIDE != null) {
  options.override = process.env.DOTENV_CONFIG_OVERRIDE;
}
if (process.env.DOTENV_CONFIG_DOTENV_KEY != null) {
  options.DOTENV_KEY = process.env.DOTENV_CONFIG_DOTENV_KEY;
}
var envOptions = options;
const re = /^dotenv_config_(encoding|path|quiet|debug|override|DOTENV_KEY)=(.+)$/;
var cliOptions = function optionMatcher(args) {
  const options2 = args.reduce(function(acc, cur) {
    const matches = cur.match(re);
    if (matches) {
      acc[matches[1]] = matches[2];
    }
    return acc;
  }, {});
  if (!("quiet" in options2)) {
    options2.quiet = "true";
  }
  return options2;
};
(function() {
  mainExports.config(
    Object.assign(
      {},
      envOptions,
      cliOptions(process.argv)
    )
  );
})();
const DEEPSEEK_MODELS = [
  { label: "Flash", value: "deepseek-v4-flash" },
  { label: "Pro", value: "deepseek-v4-pro" }
];
const DEFAULT_AI_STATUS = {
  enabled: true,
  provider: "deepseek",
  baseUrl: "https://api.deepseek.com",
  model: DEEPSEEK_MODELS[0].value,
  timeoutMs: 12e4
};
const aiFailure = (code, message, retryable = false, status) => ({ ok: false, error: { code, message, retryable, ...status === void 0 ? {} : { status } } });
const isRecord$1 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const defaultConfiguration = () => ({
  enabled: DEFAULT_AI_STATUS.enabled,
  provider: DEFAULT_AI_STATUS.provider,
  baseUrl: DEFAULT_AI_STATUS.baseUrl,
  model: DEFAULT_AI_STATUS.model,
  timeoutMs: DEFAULT_AI_STATUS.timeoutMs
});
const normalizeBaseUrl = (value) => {
  if (typeof value !== "string" || value.length > 2048) throw new Error("请填写有效的服务地址。");
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("服务地址必须是完整的 HTTP(S) URL。");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) throw new Error("远程服务请使用 HTTPS；HTTP 仅支持本机地址。");
  if (url.username || url.password || url.search || url.hash) throw new Error("服务地址不能包含账号、查询参数或片段。");
  url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
  return url.toString().replace(/\/+$/, "");
};
const validateConfiguration = (input) => {
  if (!isRecord$1(input) || typeof input.enabled !== "boolean" || input.provider !== "deepseek" && input.provider !== "compatible") throw new Error("AI 配置格式无效。");
  if (typeof input.model !== "string" || !input.model.trim() || input.model.length > 200) throw new Error("请填写模型名称（最多 200 字符）。");
  if (typeof input.timeoutMs !== "number" || !Number.isInteger(input.timeoutMs) || input.timeoutMs < 5e3 || input.timeoutMs > 3e5) {
    throw new Error("请求超时须为 5 到 300 秒。");
  }
  if (input.apiKey !== void 0 && (typeof input.apiKey !== "string" || input.apiKey.length > 8192 || /[\r\n]/.test(input.apiKey))) {
    throw new Error("API Key 格式无效。");
  }
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (input.provider === "deepseek" && baseUrl !== "https://api.deepseek.com" && baseUrl !== "https://api.deepseek.com/v1") {
    throw new Error("DeepSeek 预设使用官方地址；其他地址请选择兼容服务。");
  }
  return {
    enabled: input.enabled,
    provider: input.provider,
    baseUrl,
    model: input.model.trim(),
    timeoutMs: input.timeoutMs,
    ...typeof input.apiKey === "string" ? { apiKey: input.apiKey.trim() } : {}
  };
};
const parseStoredConfiguration = (raw) => {
  const value = JSON.parse(raw);
  if (!isRecord$1(value)) throw new Error("配置文件格式无效");
  const checked = validateConfiguration({ ...value, apiKey: void 0 });
  const { apiKey: _apiKey, ...publicFields } = checked;
  if (value.encryptedKey !== void 0 && (typeof value.encryptedKey !== "string" || value.encryptedKey.length > 32e3)) throw new Error("密钥格式无效");
  return { ...publicFields, ...value.encryptedKey ? { encryptedKey: value.encryptedKey } : {} };
};
const buildChatBody = (input, config2) => {
  if (!isRecord$1(input) || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 100) {
    throw new Error("对话需包含 1 到 100 条消息。");
  }
  let total = 0;
  const messages = input.messages.map((message) => {
    if (!isRecord$1(message) || typeof message.role !== "string" || !["system", "user", "assistant"].includes(String(message.role)) || typeof message.content !== "string" || !message.content.trim()) throw new Error("消息角色或内容无效。");
    total += message.content.length;
    return { role: message.role, content: message.content };
  });
  if (input.systemPrompt !== void 0) {
    if (typeof input.systemPrompt !== "string") throw new Error("系统提示词必须是文本。");
    total += input.systemPrompt.length;
    if (input.systemPrompt.trim()) messages.unshift({ role: "system", content: input.systemPrompt });
  }
  if (total > 1e5) throw new Error("对话内容超过 100000 字符，请缩短内容或新建对话。");
  if (messages.length > 100) throw new Error("包含系统提示词后最多允许 100 条消息。");
  const model = input.model ?? config2.model;
  if (typeof model !== "string" || !model.trim() || model.length > 200) throw new Error("模型名称无效。");
  const body = { model: model.trim(), messages, stream: false };
  if (input.temperature !== void 0) {
    if (typeof input.temperature !== "number" || !Number.isFinite(input.temperature) || input.temperature < 0 || input.temperature > 2) throw new Error("temperature 须在 0 到 2 之间。");
    body.temperature = input.temperature;
  }
  if (input.maxTokens !== void 0) {
    if (typeof input.maxTokens !== "number" || !Number.isInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > 65536) throw new Error("maxTokens 须为 1 到 65536 的整数。");
    body.max_tokens = input.maxTokens;
  }
  if (input.responseFormat !== void 0) {
    if (input.responseFormat !== "text" && input.responseFormat !== "json_object") throw new Error("输出格式无效。");
    body.response_format = { type: input.responseFormat };
  }
  if (input.thinking !== void 0 && typeof input.thinking !== "boolean") throw new Error("thinking 必须是布尔值。");
  if (config2.provider === "deepseek") body.thinking = { type: input.thinking === true ? "enabled" : "disabled" };
  return body;
};
const httpError = (status) => {
  if (status === 401 || status === 403) return aiFailure("AUTH", "鉴权失败，请检查 API Key 和模型访问权限。", false, status);
  if (status === 429) return aiFailure("RATE_LIMIT", "请求受限，请稍后重试并检查服务额度。", true, status);
  if (status === 402) return aiFailure("PROVIDER", "服务余额不足，请检查服务商账户。", false, status);
  if (status === 400 || status === 404 || status === 422) return aiFailure("PROVIDER", "服务拒绝请求，请检查地址、模型名称和模型支持的参数。", false, status);
  return aiFailure("PROVIDER", `AI 服务返回 HTTP ${status}，请检查配置或稍后重试。`, status >= 500, status);
};
const createAiService = (dependencies) => {
  let config2 = defaultConfiguration();
  let secret = "";
  let loaded = false;
  let storageError;
  let connection = "untested";
  let lastError;
  let checkedAt;
  let revision = 0;
  let latestAttempt = 0;
  const pending = /* @__PURE__ */ new Map();
  const ensureLoaded = () => {
    if (loaded) return;
    loaded = true;
    try {
      config2 = dependencies.read();
      if (config2.encryptedKey) secret = dependencies.decrypt(config2.encryptedKey);
    } catch {
      storageError = { code: "STORAGE", message: "AI 配置或加密密钥无法读取，请重新保存配置和密钥。", retryable: false };
    }
  };
  const getStatus = () => {
    ensureLoaded();
    return {
      enabled: config2.enabled,
      configured: Boolean(secret && config2.baseUrl && config2.model && !storageError),
      hasApiKey: Boolean(config2.encryptedKey),
      provider: config2.provider,
      baseUrl: config2.baseUrl,
      model: config2.model,
      timeoutMs: config2.timeoutMs,
      connection,
      ...checkedAt ? { checkedAt } : {},
      ...storageError || lastError ? { lastError: storageError ?? lastError } : {}
    };
  };
  const publish = () => {
    var _a2;
    try {
      (_a2 = dependencies.onStatus) == null ? void 0 : _a2.call(dependencies, getStatus());
    } catch {
    }
  };
  const requestKey = (owner, id) => JSON.stringify([owner, id]);
  const configure = (input) => {
    ensureLoaded();
    let update;
    try {
      update = validateConfiguration(input);
    } catch (error) {
      return aiFailure("INVALID_REQUEST", error.message);
    }
    try {
      const { apiKey, ...fields } = update;
      const sameService = fields.provider === config2.provider && fields.baseUrl === config2.baseUrl;
      const nextSecret = apiKey !== void 0 ? apiKey : sameService ? secret : "";
      const encryptedKey = nextSecret ? apiKey === void 0 && sameService ? config2.encryptedKey : dependencies.encrypt(nextSecret) : void 0;
      const next = { ...fields, ...encryptedKey ? { encryptedKey } : {} };
      dependencies.write(next);
      config2 = next;
      secret = nextSecret;
      storageError = void 0;
      lastError = void 0;
      checkedAt = void 0;
      connection = "untested";
      revision += 1;
      for (const item of pending.values()) item.controller.abort();
      publish();
      return { ok: true, value: getStatus() };
    } catch {
      return aiFailure("STORAGE", "保存失败：请检查系统密钥存储和配置目录权限；原配置保持不变。");
    }
  };
  const chat = async (owner, input) => {
    var _a2, _b2;
    const status = getStatus();
    if (!status.enabled) return aiFailure("DISABLED", "AI 服务已关闭，请在设置中启用。");
    if (storageError) return { ok: false, error: storageError };
    if (!status.configured) return aiFailure("NOT_CONFIGURED", "请先在设置中保存 AI 服务地址、模型和 API Key。");
    let body;
    try {
      body = buildChatBody(input, config2);
    } catch (error) {
      return aiFailure("INVALID_REQUEST", error.message);
    }
    const request = input;
    const id = request.requestId ?? crypto.randomUUID();
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return aiFailure("INVALID_REQUEST", "请求 ID 格式无效。");
    const key = requestKey(owner, id);
    if (pending.has(key) || pending.size >= 12 || [...pending.values()].filter((item) => item.owner === owner).length >= 4) {
      return aiFailure("BUSY", "已有同名请求或并发请求过多，请等待或取消后重试。", true);
    }
    const controller = new AbortController();
    pending.set(key, { owner, controller });
    const requestRevision = revision;
    const attempt = ++latestAttempt;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, config2.timeoutMs);
    const remember = (result) => {
      if (requestRevision === revision && attempt === latestAttempt && (result.ok === true || result.error.code !== "CANCELLED")) {
        checkedAt = (/* @__PURE__ */ new Date()).toISOString();
        connection = result.ok === true ? "ok" : "error";
        lastError = result.ok === true ? void 0 : result.error;
        publish();
      }
      return result;
    };
    try {
      const response = await dependencies.fetch(`${config2.baseUrl}/chat/completions`, {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        await ((_a2 = response.body) == null ? void 0 : _a2.cancel());
        return remember(httpError(response.status));
      }
      const reader = (_b2 = response.body) == null ? void 0 : _b2.getReader();
      if (!reader) return remember(aiFailure("INVALID_RESPONSE", "AI 服务返回了空响应。"));
      const decoder = new TextDecoder();
      let raw = "";
      let bytes = 0;
      while (!controller.signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 4 * 1024 * 1024) {
          await reader.cancel();
          return remember(aiFailure("INVALID_RESPONSE", "AI 响应超过 4 MB，请缩短输出。"));
        }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
      if (controller.signal.aborted) return remember(aiFailure(timedOut ? "TIMEOUT" : "CANCELLED", timedOut ? "AI 请求超时，请稍后重试。" : "请求已停止。", timedOut));
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return remember(aiFailure("INVALID_RESPONSE", "服务响应不是有效 JSON，请检查接口地址。"));
      }
      const choice = isRecord$1(data) && Array.isArray(data.choices) ? data.choices[0] : void 0;
      if (!isRecord$1(choice) || !isRecord$1(choice.message) || typeof choice.message.content !== "string" || !choice.message.content.trim()) {
        return remember(aiFailure("INVALID_RESPONSE", "服务未返回有效文本，请检查模型或增加输出上限。"));
      }
      const usage = isRecord$1(data) && isRecord$1(data.usage) ? data.usage : void 0;
      const validUsage = usage && ["prompt_tokens", "completion_tokens", "total_tokens"].every((field) => typeof usage[field] === "number" && Number.isFinite(usage[field]) && usage[field] >= 0);
      return remember({ ok: true, value: {
        requestId: id,
        content: choice.message.content,
        model: isRecord$1(data) && typeof data.model === "string" ? data.model : String(body.model),
        finishReason: typeof choice.finish_reason === "string" ? choice.finish_reason : "unknown",
        ...validUsage ? { usage: { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens } } : {}
      } });
    } catch {
      return remember(controller.signal.aborted ? aiFailure(timedOut ? "TIMEOUT" : "CANCELLED", timedOut ? "AI 请求超时，请稍后重试。" : "请求已停止。", timedOut) : aiFailure("NETWORK", "无法连接 AI 服务，请检查网络和服务地址。", true));
    } finally {
      clearTimeout(timer);
      pending.delete(key);
    }
  };
  return {
    getStatus,
    configure,
    chat,
    test: (owner, requestId) => chat(owner, {
      requestId,
      messages: [{ role: "user", content: "Reply with OK." }],
      maxTokens: 32,
      thinking: false
    }),
    cancel(owner, id) {
      const request = pending.get(requestKey(owner, id));
      if (!request) return false;
      request.controller.abort();
      return true;
    },
    cancelWindow(prefix) {
      for (const request of pending.values()) if (request.owner.startsWith(prefix)) request.controller.abort();
    }
  };
};
const registerAiIpc = (isAppUrl) => {
  const configurationFile = path$6.join(require$$3$1.app.getPath("userData"), "ai-config.json");
  const canEncrypt = () => require$$3$1.safeStorage.isEncryptionAvailable() && (process.platform !== "linux" || require$$3$1.safeStorage.getSelectedStorageBackend() !== "basic_text");
  const service = createAiService({
    read: () => fs$c.existsSync(configurationFile) ? parseStoredConfiguration(fs$c.readFileSync(configurationFile, "utf8")) : defaultConfiguration(),
    write(config2) {
      fs$c.mkdirSync(path$6.dirname(configurationFile), { recursive: true });
      const temporary = `${configurationFile}.${process.pid}.tmp`;
      try {
        fs$c.writeFileSync(temporary, `${JSON.stringify(config2, null, 2)}
`, { mode: 384 });
        fs$c.renameSync(temporary, configurationFile);
      } finally {
        fs$c.rmSync(temporary, { force: true });
      }
    },
    encrypt(key) {
      if (!canEncrypt()) throw new Error("系统安全存储不可用");
      return require$$3$1.safeStorage.encryptString(key).toString("base64");
    },
    decrypt(ciphertext) {
      if (!canEncrypt()) throw new Error("系统安全存储不可用");
      return require$$3$1.safeStorage.decryptString(Buffer.from(ciphertext, "base64"));
    },
    fetch: (input, init) => require$$3$1.net.fetch(input instanceof URL ? input.toString() : input, init),
    onStatus(status) {
      for (const window2 of require$$3$1.BrowserWindow.getAllWindows()) {
        try {
          if (!window2.isDestroyed() && isAppUrl(window2.webContents.getURL())) window2.webContents.send("ai:status-changed", status);
        } catch {
        }
      }
    }
  });
  const trusted = (event) => Boolean(require$$3$1.BrowserWindow.fromWebContents(event.sender)) && event.senderFrame === event.sender.mainFrame && isAppUrl(event.senderFrame.url);
  const ownerFor = (event, owner) => {
    if (!trusted(event) || typeof owner !== "string" || !/^(builtin-chat|settings|plugin:[a-z0-9][a-z0-9-]*)$/.test(owner)) return void 0;
    return `${event.sender.id}:${owner}`;
  };
  require$$3$1.ipcMain.handle("ai:status", (event) => trusted(event) ? { ok: true, value: service.getStatus() } : aiFailure("FORBIDDEN", "当前页面无权访问 AI 服务。"));
  require$$3$1.ipcMain.handle("ai:configure", (event, input) => {
    if (!trusted(event) || new URL(event.senderFrame.url).hash.startsWith("#/floating/")) return aiFailure("FORBIDDEN", "请在主窗口设置中配置 AI。");
    return service.configure(input);
  });
  require$$3$1.ipcMain.handle("ai:chat", (event, owner, input) => {
    const key = ownerFor(event, owner);
    return key ? service.chat(key, input) : aiFailure("FORBIDDEN", "当前页面无权调用 AI。");
  });
  require$$3$1.ipcMain.handle("ai:test", (event, owner, requestId) => {
    const key = ownerFor(event, owner);
    return key ? service.test(key, requestId) : aiFailure("FORBIDDEN", "当前页面无权测试 AI。");
  });
  require$$3$1.ipcMain.handle("ai:cancel", (event, owner, requestId) => {
    const key = ownerFor(event, owner);
    return key && typeof requestId === "string" ? service.cancel(key, requestId) : false;
  });
  require$$3$1.app.on("web-contents-created", (_event, contents) => {
    const prefix = `${contents.id}:`;
    contents.once("destroyed", () => service.cancelWindow(prefix));
    contents.on("did-start-navigation", (_event2, _url, isInPlace, isMainFrame) => {
      if (isMainFrame && !isInPlace) service.cancelWindow(prefix);
    });
  });
};
var server = {};
var canPromise$1 = function() {
  return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
};
var qrcode = {};
var utils$1 = {};
let toSJISFunction;
const CODEWORDS_COUNT = [
  0,
  // Not used
  26,
  44,
  70,
  100,
  134,
  172,
  196,
  242,
  292,
  346,
  404,
  466,
  532,
  581,
  655,
  733,
  815,
  901,
  991,
  1085,
  1156,
  1258,
  1364,
  1474,
  1588,
  1706,
  1828,
  1921,
  2051,
  2185,
  2323,
  2465,
  2611,
  2761,
  2876,
  3034,
  3196,
  3362,
  3532,
  3706
];
utils$1.getSymbolSize = function getSymbolSize(version2) {
  if (!version2) throw new Error('"version" cannot be null or undefined');
  if (version2 < 1 || version2 > 40) throw new Error('"version" should be in range from 1 to 40');
  return version2 * 4 + 17;
};
utils$1.getSymbolTotalCodewords = function getSymbolTotalCodewords(version2) {
  return CODEWORDS_COUNT[version2];
};
utils$1.getBCHDigit = function(data) {
  let digit = 0;
  while (data !== 0) {
    digit++;
    data >>>= 1;
  }
  return digit;
};
utils$1.setToSJISFunction = function setToSJISFunction(f) {
  if (typeof f !== "function") {
    throw new Error('"toSJISFunc" is not a valid function.');
  }
  toSJISFunction = f;
};
utils$1.isKanjiModeEnabled = function() {
  return typeof toSJISFunction !== "undefined";
};
utils$1.toSJIS = function toSJIS(kanji2) {
  return toSJISFunction(kanji2);
};
var errorCorrectionLevel = {};
(function(exports) {
  exports.L = { bit: 1 };
  exports.M = { bit: 0 };
  exports.Q = { bit: 3 };
  exports.H = { bit: 2 };
  function fromString(string) {
    if (typeof string !== "string") {
      throw new Error("Param is not a string");
    }
    const lcStr = string.toLowerCase();
    switch (lcStr) {
      case "l":
      case "low":
        return exports.L;
      case "m":
      case "medium":
        return exports.M;
      case "q":
      case "quartile":
        return exports.Q;
      case "h":
      case "high":
        return exports.H;
      default:
        throw new Error("Unknown EC Level: " + string);
    }
  }
  exports.isValid = function isValid2(level) {
    return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
  };
  exports.from = function from(value, defaultValue) {
    if (exports.isValid(value)) {
      return value;
    }
    try {
      return fromString(value);
    } catch (e) {
      return defaultValue;
    }
  };
})(errorCorrectionLevel);
function BitBuffer$1() {
  this.buffer = [];
  this.length = 0;
}
BitBuffer$1.prototype = {
  get: function(index) {
    const bufIndex = Math.floor(index / 8);
    return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
  },
  put: function(num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit((num >>> length - i - 1 & 1) === 1);
    }
  },
  getLengthInBits: function() {
    return this.length;
  },
  putBit: function(bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 128 >>> this.length % 8;
    }
    this.length++;
  }
};
var bitBuffer = BitBuffer$1;
function BitMatrix$1(size) {
  if (!size || size < 1) {
    throw new Error("BitMatrix size must be defined and greater than 0");
  }
  this.size = size;
  this.data = new Uint8Array(size * size);
  this.reservedBit = new Uint8Array(size * size);
}
BitMatrix$1.prototype.set = function(row, col, value, reserved) {
  const index = row * this.size + col;
  this.data[index] = value;
  if (reserved) this.reservedBit[index] = true;
};
BitMatrix$1.prototype.get = function(row, col) {
  return this.data[row * this.size + col];
};
BitMatrix$1.prototype.xor = function(row, col, value) {
  this.data[row * this.size + col] ^= value;
};
BitMatrix$1.prototype.isReserved = function(row, col) {
  return this.reservedBit[row * this.size + col];
};
var bitMatrix = BitMatrix$1;
var alignmentPattern = {};
(function(exports) {
  const getSymbolSize3 = utils$1.getSymbolSize;
  exports.getRowColCoords = function getRowColCoords(version2) {
    if (version2 === 1) return [];
    const posCount = Math.floor(version2 / 7) + 2;
    const size = getSymbolSize3(version2);
    const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
    const positions = [size - 7];
    for (let i = 1; i < posCount - 1; i++) {
      positions[i] = positions[i - 1] - intervals;
    }
    positions.push(6);
    return positions.reverse();
  };
  exports.getPositions = function getPositions2(version2) {
    const coords = [];
    const pos = exports.getRowColCoords(version2);
    const posLength = pos.length;
    for (let i = 0; i < posLength; i++) {
      for (let j = 0; j < posLength; j++) {
        if (i === 0 && j === 0 || // top-left
        i === 0 && j === posLength - 1 || // bottom-left
        i === posLength - 1 && j === 0) {
          continue;
        }
        coords.push([pos[i], pos[j]]);
      }
    }
    return coords;
  };
})(alignmentPattern);
var finderPattern = {};
const getSymbolSize2 = utils$1.getSymbolSize;
const FINDER_PATTERN_SIZE = 7;
finderPattern.getPositions = function getPositions(version2) {
  const size = getSymbolSize2(version2);
  return [
    // top-left
    [0, 0],
    // top-right
    [size - FINDER_PATTERN_SIZE, 0],
    // bottom-left
    [0, size - FINDER_PATTERN_SIZE]
  ];
};
var maskPattern = {};
(function(exports) {
  exports.Patterns = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7
  };
  const PenaltyScores = {
    N1: 3,
    N2: 3,
    N3: 40,
    N4: 10
  };
  exports.isValid = function isValid2(mask) {
    return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
  };
  exports.from = function from(value) {
    return exports.isValid(value) ? parseInt(value, 10) : void 0;
  };
  exports.getPenaltyN1 = function getPenaltyN1(data) {
    const size = data.size;
    let points = 0;
    let sameCountCol = 0;
    let sameCountRow = 0;
    let lastCol = null;
    let lastRow = null;
    for (let row = 0; row < size; row++) {
      sameCountCol = sameCountRow = 0;
      lastCol = lastRow = null;
      for (let col = 0; col < size; col++) {
        let module = data.get(row, col);
        if (module === lastCol) {
          sameCountCol++;
        } else {
          if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
          lastCol = module;
          sameCountCol = 1;
        }
        module = data.get(col, row);
        if (module === lastRow) {
          sameCountRow++;
        } else {
          if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
          lastRow = module;
          sameCountRow = 1;
        }
      }
      if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
      if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
    }
    return points;
  };
  exports.getPenaltyN2 = function getPenaltyN2(data) {
    const size = data.size;
    let points = 0;
    for (let row = 0; row < size - 1; row++) {
      for (let col = 0; col < size - 1; col++) {
        const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
        if (last === 4 || last === 0) points++;
      }
    }
    return points * PenaltyScores.N2;
  };
  exports.getPenaltyN3 = function getPenaltyN3(data) {
    const size = data.size;
    let points = 0;
    let bitsCol = 0;
    let bitsRow = 0;
    for (let row = 0; row < size; row++) {
      bitsCol = bitsRow = 0;
      for (let col = 0; col < size; col++) {
        bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
        if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
        bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
        if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
      }
    }
    return points * PenaltyScores.N3;
  };
  exports.getPenaltyN4 = function getPenaltyN4(data) {
    let darkCount = 0;
    const modulesCount = data.data.length;
    for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
    const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
    return k * PenaltyScores.N4;
  };
  function getMaskAt(maskPattern2, i, j) {
    switch (maskPattern2) {
      case exports.Patterns.PATTERN000:
        return (i + j) % 2 === 0;
      case exports.Patterns.PATTERN001:
        return i % 2 === 0;
      case exports.Patterns.PATTERN010:
        return j % 3 === 0;
      case exports.Patterns.PATTERN011:
        return (i + j) % 3 === 0;
      case exports.Patterns.PATTERN100:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case exports.Patterns.PATTERN101:
        return i * j % 2 + i * j % 3 === 0;
      case exports.Patterns.PATTERN110:
        return (i * j % 2 + i * j % 3) % 2 === 0;
      case exports.Patterns.PATTERN111:
        return (i * j % 3 + (i + j) % 2) % 2 === 0;
      default:
        throw new Error("bad maskPattern:" + maskPattern2);
    }
  }
  exports.applyMask = function applyMask(pattern, data) {
    const size = data.size;
    for (let col = 0; col < size; col++) {
      for (let row = 0; row < size; row++) {
        if (data.isReserved(row, col)) continue;
        data.xor(row, col, getMaskAt(pattern, row, col));
      }
    }
  };
  exports.getBestMask = function getBestMask(data, setupFormatFunc) {
    const numPatterns = Object.keys(exports.Patterns).length;
    let bestPattern = 0;
    let lowerPenalty = Infinity;
    for (let p = 0; p < numPatterns; p++) {
      setupFormatFunc(p);
      exports.applyMask(p, data);
      const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
      exports.applyMask(p, data);
      if (penalty < lowerPenalty) {
        lowerPenalty = penalty;
        bestPattern = p;
      }
    }
    return bestPattern;
  };
})(maskPattern);
var errorCorrectionCode = {};
const ECLevel$1 = errorCorrectionLevel;
const EC_BLOCKS_TABLE = [
  // L  M  Q  H
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  2,
  2,
  1,
  2,
  2,
  4,
  1,
  2,
  4,
  4,
  2,
  4,
  4,
  4,
  2,
  4,
  6,
  5,
  2,
  4,
  6,
  6,
  2,
  5,
  8,
  8,
  4,
  5,
  8,
  8,
  4,
  5,
  8,
  11,
  4,
  8,
  10,
  11,
  4,
  9,
  12,
  16,
  4,
  9,
  16,
  16,
  6,
  10,
  12,
  18,
  6,
  10,
  17,
  16,
  6,
  11,
  16,
  19,
  6,
  13,
  18,
  21,
  7,
  14,
  21,
  25,
  8,
  16,
  20,
  25,
  8,
  17,
  23,
  25,
  9,
  17,
  23,
  34,
  9,
  18,
  25,
  30,
  10,
  20,
  27,
  32,
  12,
  21,
  29,
  35,
  12,
  23,
  34,
  37,
  12,
  25,
  34,
  40,
  13,
  26,
  35,
  42,
  14,
  28,
  38,
  45,
  15,
  29,
  40,
  48,
  16,
  31,
  43,
  51,
  17,
  33,
  45,
  54,
  18,
  35,
  48,
  57,
  19,
  37,
  51,
  60,
  19,
  38,
  53,
  63,
  20,
  40,
  56,
  66,
  21,
  43,
  59,
  70,
  22,
  45,
  62,
  74,
  24,
  47,
  65,
  77,
  25,
  49,
  68,
  81
];
const EC_CODEWORDS_TABLE = [
  // L  M  Q  H
  7,
  10,
  13,
  17,
  10,
  16,
  22,
  28,
  15,
  26,
  36,
  44,
  20,
  36,
  52,
  64,
  26,
  48,
  72,
  88,
  36,
  64,
  96,
  112,
  40,
  72,
  108,
  130,
  48,
  88,
  132,
  156,
  60,
  110,
  160,
  192,
  72,
  130,
  192,
  224,
  80,
  150,
  224,
  264,
  96,
  176,
  260,
  308,
  104,
  198,
  288,
  352,
  120,
  216,
  320,
  384,
  132,
  240,
  360,
  432,
  144,
  280,
  408,
  480,
  168,
  308,
  448,
  532,
  180,
  338,
  504,
  588,
  196,
  364,
  546,
  650,
  224,
  416,
  600,
  700,
  224,
  442,
  644,
  750,
  252,
  476,
  690,
  816,
  270,
  504,
  750,
  900,
  300,
  560,
  810,
  960,
  312,
  588,
  870,
  1050,
  336,
  644,
  952,
  1110,
  360,
  700,
  1020,
  1200,
  390,
  728,
  1050,
  1260,
  420,
  784,
  1140,
  1350,
  450,
  812,
  1200,
  1440,
  480,
  868,
  1290,
  1530,
  510,
  924,
  1350,
  1620,
  540,
  980,
  1440,
  1710,
  570,
  1036,
  1530,
  1800,
  570,
  1064,
  1590,
  1890,
  600,
  1120,
  1680,
  1980,
  630,
  1204,
  1770,
  2100,
  660,
  1260,
  1860,
  2220,
  720,
  1316,
  1950,
  2310,
  750,
  1372,
  2040,
  2430
];
errorCorrectionCode.getBlocksCount = function getBlocksCount(version2, errorCorrectionLevel2) {
  switch (errorCorrectionLevel2) {
    case ECLevel$1.L:
      return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 0];
    case ECLevel$1.M:
      return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 1];
    case ECLevel$1.Q:
      return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 2];
    case ECLevel$1.H:
      return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 3];
    default:
      return void 0;
  }
};
errorCorrectionCode.getTotalCodewordsCount = function getTotalCodewordsCount(version2, errorCorrectionLevel2) {
  switch (errorCorrectionLevel2) {
    case ECLevel$1.L:
      return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 0];
    case ECLevel$1.M:
      return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 1];
    case ECLevel$1.Q:
      return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 2];
    case ECLevel$1.H:
      return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 3];
    default:
      return void 0;
  }
};
var polynomial = {};
var galoisField = {};
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(function initTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 256) {
      x ^= 285;
    }
  }
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255];
  }
})();
galoisField.log = function log(n) {
  if (n < 1) throw new Error("log(" + n + ")");
  return LOG_TABLE[n];
};
galoisField.exp = function exp(n) {
  return EXP_TABLE[n];
};
galoisField.mul = function mul(x, y) {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
};
(function(exports) {
  const GF = galoisField;
  exports.mul = function mul2(p1, p2) {
    const coeff = new Uint8Array(p1.length + p2.length - 1);
    for (let i = 0; i < p1.length; i++) {
      for (let j = 0; j < p2.length; j++) {
        coeff[i + j] ^= GF.mul(p1[i], p2[j]);
      }
    }
    return coeff;
  };
  exports.mod = function mod(divident, divisor) {
    let result = new Uint8Array(divident);
    while (result.length - divisor.length >= 0) {
      const coeff = result[0];
      for (let i = 0; i < divisor.length; i++) {
        result[i] ^= GF.mul(divisor[i], coeff);
      }
      let offset = 0;
      while (offset < result.length && result[offset] === 0) offset++;
      result = result.slice(offset);
    }
    return result;
  };
  exports.generateECPolynomial = function generateECPolynomial(degree) {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) {
      poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
    }
    return poly;
  };
})(polynomial);
const Polynomial = polynomial;
function ReedSolomonEncoder$1(degree) {
  this.genPoly = void 0;
  this.degree = degree;
  if (this.degree) this.initialize(this.degree);
}
ReedSolomonEncoder$1.prototype.initialize = function initialize(degree) {
  this.degree = degree;
  this.genPoly = Polynomial.generateECPolynomial(this.degree);
};
ReedSolomonEncoder$1.prototype.encode = function encode(data) {
  if (!this.genPoly) {
    throw new Error("Encoder not initialized");
  }
  const paddedData = new Uint8Array(data.length + this.degree);
  paddedData.set(data);
  const remainder = Polynomial.mod(paddedData, this.genPoly);
  const start = this.degree - remainder.length;
  if (start > 0) {
    const buff = new Uint8Array(this.degree);
    buff.set(remainder, start);
    return buff;
  }
  return remainder;
};
var reedSolomonEncoder = ReedSolomonEncoder$1;
var version$1 = {};
var mode = {};
var versionCheck = {};
versionCheck.isValid = function isValid(version2) {
  return !isNaN(version2) && version2 >= 1 && version2 <= 40;
};
var regex = {};
const numeric = "[0-9]+";
const alphanumeric = "[A-Z $%*+\\-./:]+";
let kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
kanji = kanji.replace(/u/g, "\\u");
const byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
regex.KANJI = new RegExp(kanji, "g");
regex.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
regex.BYTE = new RegExp(byte, "g");
regex.NUMERIC = new RegExp(numeric, "g");
regex.ALPHANUMERIC = new RegExp(alphanumeric, "g");
const TEST_KANJI = new RegExp("^" + kanji + "$");
const TEST_NUMERIC = new RegExp("^" + numeric + "$");
const TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
regex.testKanji = function testKanji(str) {
  return TEST_KANJI.test(str);
};
regex.testNumeric = function testNumeric(str) {
  return TEST_NUMERIC.test(str);
};
regex.testAlphanumeric = function testAlphanumeric(str) {
  return TEST_ALPHANUMERIC.test(str);
};
(function(exports) {
  const VersionCheck = versionCheck;
  const Regex = regex;
  exports.NUMERIC = {
    id: "Numeric",
    bit: 1 << 0,
    ccBits: [10, 12, 14]
  };
  exports.ALPHANUMERIC = {
    id: "Alphanumeric",
    bit: 1 << 1,
    ccBits: [9, 11, 13]
  };
  exports.BYTE = {
    id: "Byte",
    bit: 1 << 2,
    ccBits: [8, 16, 16]
  };
  exports.KANJI = {
    id: "Kanji",
    bit: 1 << 3,
    ccBits: [8, 10, 12]
  };
  exports.MIXED = {
    bit: -1
  };
  exports.getCharCountIndicator = function getCharCountIndicator(mode2, version2) {
    if (!mode2.ccBits) throw new Error("Invalid mode: " + mode2);
    if (!VersionCheck.isValid(version2)) {
      throw new Error("Invalid version: " + version2);
    }
    if (version2 >= 1 && version2 < 10) return mode2.ccBits[0];
    else if (version2 < 27) return mode2.ccBits[1];
    return mode2.ccBits[2];
  };
  exports.getBestModeForData = function getBestModeForData(dataStr) {
    if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
    else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
    else if (Regex.testKanji(dataStr)) return exports.KANJI;
    else return exports.BYTE;
  };
  exports.toString = function toString2(mode2) {
    if (mode2 && mode2.id) return mode2.id;
    throw new Error("Invalid mode");
  };
  exports.isValid = function isValid2(mode2) {
    return mode2 && mode2.bit && mode2.ccBits;
  };
  function fromString(string) {
    if (typeof string !== "string") {
      throw new Error("Param is not a string");
    }
    const lcStr = string.toLowerCase();
    switch (lcStr) {
      case "numeric":
        return exports.NUMERIC;
      case "alphanumeric":
        return exports.ALPHANUMERIC;
      case "kanji":
        return exports.KANJI;
      case "byte":
        return exports.BYTE;
      default:
        throw new Error("Unknown mode: " + string);
    }
  }
  exports.from = function from(value, defaultValue) {
    if (exports.isValid(value)) {
      return value;
    }
    try {
      return fromString(value);
    } catch (e) {
      return defaultValue;
    }
  };
})(mode);
(function(exports) {
  const Utils2 = utils$1;
  const ECCode2 = errorCorrectionCode;
  const ECLevel2 = errorCorrectionLevel;
  const Mode2 = mode;
  const VersionCheck = versionCheck;
  const G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
  const G18_BCH = Utils2.getBCHDigit(G18);
  function getBestVersionForDataLength(mode2, length, errorCorrectionLevel2) {
    for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
      if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel2, mode2)) {
        return currentVersion;
      }
    }
    return void 0;
  }
  function getReservedBitsCount(mode2, version2) {
    return Mode2.getCharCountIndicator(mode2, version2) + 4;
  }
  function getTotalBitsFromDataArray(segments2, version2) {
    let totalBits = 0;
    segments2.forEach(function(data) {
      const reservedBits = getReservedBitsCount(data.mode, version2);
      totalBits += reservedBits + data.getBitsLength();
    });
    return totalBits;
  }
  function getBestVersionForMixedData(segments2, errorCorrectionLevel2) {
    for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
      const length = getTotalBitsFromDataArray(segments2, currentVersion);
      if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel2, Mode2.MIXED)) {
        return currentVersion;
      }
    }
    return void 0;
  }
  exports.from = function from(value, defaultValue) {
    if (VersionCheck.isValid(value)) {
      return parseInt(value, 10);
    }
    return defaultValue;
  };
  exports.getCapacity = function getCapacity(version2, errorCorrectionLevel2, mode2) {
    if (!VersionCheck.isValid(version2)) {
      throw new Error("Invalid QR Code version");
    }
    if (typeof mode2 === "undefined") mode2 = Mode2.BYTE;
    const totalCodewords = Utils2.getSymbolTotalCodewords(version2);
    const ecTotalCodewords = ECCode2.getTotalCodewordsCount(version2, errorCorrectionLevel2);
    const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
    if (mode2 === Mode2.MIXED) return dataTotalCodewordsBits;
    const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode2, version2);
    switch (mode2) {
      case Mode2.NUMERIC:
        return Math.floor(usableBits / 10 * 3);
      case Mode2.ALPHANUMERIC:
        return Math.floor(usableBits / 11 * 2);
      case Mode2.KANJI:
        return Math.floor(usableBits / 13);
      case Mode2.BYTE:
      default:
        return Math.floor(usableBits / 8);
    }
  };
  exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel2) {
    let seg;
    const ecl = ECLevel2.from(errorCorrectionLevel2, ECLevel2.M);
    if (Array.isArray(data)) {
      if (data.length > 1) {
        return getBestVersionForMixedData(data, ecl);
      }
      if (data.length === 0) {
        return 1;
      }
      seg = data[0];
    } else {
      seg = data;
    }
    return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
  };
  exports.getEncodedBits = function getEncodedBits2(version2) {
    if (!VersionCheck.isValid(version2) || version2 < 7) {
      throw new Error("Invalid QR Code version");
    }
    let d = version2 << 12;
    while (Utils2.getBCHDigit(d) - G18_BCH >= 0) {
      d ^= G18 << Utils2.getBCHDigit(d) - G18_BCH;
    }
    return version2 << 12 | d;
  };
})(version$1);
var formatInfo = {};
const Utils$3 = utils$1;
const G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
const G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
const G15_BCH = Utils$3.getBCHDigit(G15);
formatInfo.getEncodedBits = function getEncodedBits(errorCorrectionLevel2, mask) {
  const data = errorCorrectionLevel2.bit << 3 | mask;
  let d = data << 10;
  while (Utils$3.getBCHDigit(d) - G15_BCH >= 0) {
    d ^= G15 << Utils$3.getBCHDigit(d) - G15_BCH;
  }
  return (data << 10 | d) ^ G15_MASK;
};
var segments = {};
const Mode$4 = mode;
function NumericData(data) {
  this.mode = Mode$4.NUMERIC;
  this.data = data.toString();
}
NumericData.getBitsLength = function getBitsLength(length) {
  return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
};
NumericData.prototype.getLength = function getLength() {
  return this.data.length;
};
NumericData.prototype.getBitsLength = function getBitsLength2() {
  return NumericData.getBitsLength(this.data.length);
};
NumericData.prototype.write = function write(bitBuffer2) {
  let i, group, value;
  for (i = 0; i + 3 <= this.data.length; i += 3) {
    group = this.data.substr(i, 3);
    value = parseInt(group, 10);
    bitBuffer2.put(value, 10);
  }
  const remainingNum = this.data.length - i;
  if (remainingNum > 0) {
    group = this.data.substr(i);
    value = parseInt(group, 10);
    bitBuffer2.put(value, remainingNum * 3 + 1);
  }
};
var numericData = NumericData;
const Mode$3 = mode;
const ALPHA_NUM_CHARS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  " ",
  "$",
  "%",
  "*",
  "+",
  "-",
  ".",
  "/",
  ":"
];
function AlphanumericData(data) {
  this.mode = Mode$3.ALPHANUMERIC;
  this.data = data;
}
AlphanumericData.getBitsLength = function getBitsLength3(length) {
  return 11 * Math.floor(length / 2) + 6 * (length % 2);
};
AlphanumericData.prototype.getLength = function getLength2() {
  return this.data.length;
};
AlphanumericData.prototype.getBitsLength = function getBitsLength4() {
  return AlphanumericData.getBitsLength(this.data.length);
};
AlphanumericData.prototype.write = function write2(bitBuffer2) {
  let i;
  for (i = 0; i + 2 <= this.data.length; i += 2) {
    let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
    value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
    bitBuffer2.put(value, 11);
  }
  if (this.data.length % 2) {
    bitBuffer2.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
  }
};
var alphanumericData = AlphanumericData;
const Mode$2 = mode;
function ByteData(data) {
  this.mode = Mode$2.BYTE;
  if (typeof data === "string") {
    this.data = new TextEncoder().encode(data);
  } else {
    this.data = new Uint8Array(data);
  }
}
ByteData.getBitsLength = function getBitsLength5(length) {
  return length * 8;
};
ByteData.prototype.getLength = function getLength3() {
  return this.data.length;
};
ByteData.prototype.getBitsLength = function getBitsLength6() {
  return ByteData.getBitsLength(this.data.length);
};
ByteData.prototype.write = function(bitBuffer2) {
  for (let i = 0, l = this.data.length; i < l; i++) {
    bitBuffer2.put(this.data[i], 8);
  }
};
var byteData = ByteData;
const Mode$1 = mode;
const Utils$2 = utils$1;
function KanjiData(data) {
  this.mode = Mode$1.KANJI;
  this.data = data;
}
KanjiData.getBitsLength = function getBitsLength7(length) {
  return length * 13;
};
KanjiData.prototype.getLength = function getLength4() {
  return this.data.length;
};
KanjiData.prototype.getBitsLength = function getBitsLength8() {
  return KanjiData.getBitsLength(this.data.length);
};
KanjiData.prototype.write = function(bitBuffer2) {
  let i;
  for (i = 0; i < this.data.length; i++) {
    let value = Utils$2.toSJIS(this.data[i]);
    if (value >= 33088 && value <= 40956) {
      value -= 33088;
    } else if (value >= 57408 && value <= 60351) {
      value -= 49472;
    } else {
      throw new Error(
        "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
      );
    }
    value = (value >>> 8 & 255) * 192 + (value & 255);
    bitBuffer2.put(value, 13);
  }
};
var kanjiData = KanjiData;
var dijkstra = { exports: {} };
(function(module) {
  var dijkstra2 = {
    single_source_shortest_paths: function(graph, s, d) {
      var predecessors = {};
      var costs = {};
      costs[s] = 0;
      var open = dijkstra2.PriorityQueue.make();
      open.push(s, 0);
      var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
      while (!open.empty()) {
        closest = open.pop();
        u = closest.value;
        cost_of_s_to_u = closest.cost;
        adjacent_nodes = graph[u] || {};
        for (v in adjacent_nodes) {
          if (adjacent_nodes.hasOwnProperty(v)) {
            cost_of_e = adjacent_nodes[v];
            cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
            cost_of_s_to_v = costs[v];
            first_visit = typeof costs[v] === "undefined";
            if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
              costs[v] = cost_of_s_to_u_plus_cost_of_e;
              open.push(v, cost_of_s_to_u_plus_cost_of_e);
              predecessors[v] = u;
            }
          }
        }
      }
      if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
        var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
        throw new Error(msg);
      }
      return predecessors;
    },
    extract_shortest_path_from_predecessor_list: function(predecessors, d) {
      var nodes = [];
      var u = d;
      while (u) {
        nodes.push(u);
        predecessors[u];
        u = predecessors[u];
      }
      nodes.reverse();
      return nodes;
    },
    find_path: function(graph, s, d) {
      var predecessors = dijkstra2.single_source_shortest_paths(graph, s, d);
      return dijkstra2.extract_shortest_path_from_predecessor_list(
        predecessors,
        d
      );
    },
    /**
     * A very naive priority queue implementation.
     */
    PriorityQueue: {
      make: function(opts) {
        var T = dijkstra2.PriorityQueue, t = {}, key;
        opts = opts || {};
        for (key in T) {
          if (T.hasOwnProperty(key)) {
            t[key] = T[key];
          }
        }
        t.queue = [];
        t.sorter = opts.sorter || T.default_sorter;
        return t;
      },
      default_sorter: function(a, b) {
        return a.cost - b.cost;
      },
      /**
       * Add a new item to the queue and ensure the highest priority element
       * is at the front of the queue.
       */
      push: function(value, cost) {
        var item = { value, cost };
        this.queue.push(item);
        this.queue.sort(this.sorter);
      },
      /**
       * Return the highest priority element in the queue.
       */
      pop: function() {
        return this.queue.shift();
      },
      empty: function() {
        return this.queue.length === 0;
      }
    }
  };
  {
    module.exports = dijkstra2;
  }
})(dijkstra);
var dijkstraExports = dijkstra.exports;
(function(exports) {
  const Mode2 = mode;
  const NumericData2 = numericData;
  const AlphanumericData2 = alphanumericData;
  const ByteData2 = byteData;
  const KanjiData2 = kanjiData;
  const Regex = regex;
  const Utils2 = utils$1;
  const dijkstra2 = dijkstraExports;
  function getStringByteLength(str) {
    return unescape(encodeURIComponent(str)).length;
  }
  function getSegments(regex2, mode2, str) {
    const segments2 = [];
    let result;
    while ((result = regex2.exec(str)) !== null) {
      segments2.push({
        data: result[0],
        index: result.index,
        mode: mode2,
        length: result[0].length
      });
    }
    return segments2;
  }
  function getSegmentsFromString(dataStr) {
    const numSegs = getSegments(Regex.NUMERIC, Mode2.NUMERIC, dataStr);
    const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode2.ALPHANUMERIC, dataStr);
    let byteSegs;
    let kanjiSegs;
    if (Utils2.isKanjiModeEnabled()) {
      byteSegs = getSegments(Regex.BYTE, Mode2.BYTE, dataStr);
      kanjiSegs = getSegments(Regex.KANJI, Mode2.KANJI, dataStr);
    } else {
      byteSegs = getSegments(Regex.BYTE_KANJI, Mode2.BYTE, dataStr);
      kanjiSegs = [];
    }
    const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
    return segs.sort(function(s1, s2) {
      return s1.index - s2.index;
    }).map(function(obj) {
      return {
        data: obj.data,
        mode: obj.mode,
        length: obj.length
      };
    });
  }
  function getSegmentBitsLength(length, mode2) {
    switch (mode2) {
      case Mode2.NUMERIC:
        return NumericData2.getBitsLength(length);
      case Mode2.ALPHANUMERIC:
        return AlphanumericData2.getBitsLength(length);
      case Mode2.KANJI:
        return KanjiData2.getBitsLength(length);
      case Mode2.BYTE:
        return ByteData2.getBitsLength(length);
    }
  }
  function mergeSegments(segs) {
    return segs.reduce(function(acc, curr) {
      const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
      if (prevSeg && prevSeg.mode === curr.mode) {
        acc[acc.length - 1].data += curr.data;
        return acc;
      }
      acc.push(curr);
      return acc;
    }, []);
  }
  function buildNodes(segs) {
    const nodes = [];
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      switch (seg.mode) {
        case Mode2.NUMERIC:
          nodes.push([
            seg,
            { data: seg.data, mode: Mode2.ALPHANUMERIC, length: seg.length },
            { data: seg.data, mode: Mode2.BYTE, length: seg.length }
          ]);
          break;
        case Mode2.ALPHANUMERIC:
          nodes.push([
            seg,
            { data: seg.data, mode: Mode2.BYTE, length: seg.length }
          ]);
          break;
        case Mode2.KANJI:
          nodes.push([
            seg,
            { data: seg.data, mode: Mode2.BYTE, length: getStringByteLength(seg.data) }
          ]);
          break;
        case Mode2.BYTE:
          nodes.push([
            { data: seg.data, mode: Mode2.BYTE, length: getStringByteLength(seg.data) }
          ]);
      }
    }
    return nodes;
  }
  function buildGraph(nodes, version2) {
    const table = {};
    const graph = { start: {} };
    let prevNodeIds = ["start"];
    for (let i = 0; i < nodes.length; i++) {
      const nodeGroup = nodes[i];
      const currentNodeIds = [];
      for (let j = 0; j < nodeGroup.length; j++) {
        const node2 = nodeGroup[j];
        const key = "" + i + j;
        currentNodeIds.push(key);
        table[key] = { node: node2, lastCount: 0 };
        graph[key] = {};
        for (let n = 0; n < prevNodeIds.length; n++) {
          const prevNodeId = prevNodeIds[n];
          if (table[prevNodeId] && table[prevNodeId].node.mode === node2.mode) {
            graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node2.length, node2.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node2.mode);
            table[prevNodeId].lastCount += node2.length;
          } else {
            if (table[prevNodeId]) table[prevNodeId].lastCount = node2.length;
            graph[prevNodeId][key] = getSegmentBitsLength(node2.length, node2.mode) + 4 + Mode2.getCharCountIndicator(node2.mode, version2);
          }
        }
      }
      prevNodeIds = currentNodeIds;
    }
    for (let n = 0; n < prevNodeIds.length; n++) {
      graph[prevNodeIds[n]].end = 0;
    }
    return { map: graph, table };
  }
  function buildSingleSegment(data, modesHint) {
    let mode2;
    const bestMode = Mode2.getBestModeForData(data);
    mode2 = Mode2.from(modesHint, bestMode);
    if (mode2 !== Mode2.BYTE && mode2.bit < bestMode.bit) {
      throw new Error('"' + data + '" cannot be encoded with mode ' + Mode2.toString(mode2) + ".\n Suggested mode is: " + Mode2.toString(bestMode));
    }
    if (mode2 === Mode2.KANJI && !Utils2.isKanjiModeEnabled()) {
      mode2 = Mode2.BYTE;
    }
    switch (mode2) {
      case Mode2.NUMERIC:
        return new NumericData2(data);
      case Mode2.ALPHANUMERIC:
        return new AlphanumericData2(data);
      case Mode2.KANJI:
        return new KanjiData2(data);
      case Mode2.BYTE:
        return new ByteData2(data);
    }
  }
  exports.fromArray = function fromArray(array) {
    return array.reduce(function(acc, seg) {
      if (typeof seg === "string") {
        acc.push(buildSingleSegment(seg, null));
      } else if (seg.data) {
        acc.push(buildSingleSegment(seg.data, seg.mode));
      }
      return acc;
    }, []);
  };
  exports.fromString = function fromString(data, version2) {
    const segs = getSegmentsFromString(data, Utils2.isKanjiModeEnabled());
    const nodes = buildNodes(segs);
    const graph = buildGraph(nodes, version2);
    const path2 = dijkstra2.find_path(graph.map, "start", "end");
    const optimizedSegs = [];
    for (let i = 1; i < path2.length - 1; i++) {
      optimizedSegs.push(graph.table[path2[i]].node);
    }
    return exports.fromArray(mergeSegments(optimizedSegs));
  };
  exports.rawSplit = function rawSplit(data) {
    return exports.fromArray(
      getSegmentsFromString(data, Utils2.isKanjiModeEnabled())
    );
  };
})(segments);
const Utils$1 = utils$1;
const ECLevel = errorCorrectionLevel;
const BitBuffer = bitBuffer;
const BitMatrix = bitMatrix;
const AlignmentPattern = alignmentPattern;
const FinderPattern = finderPattern;
const MaskPattern = maskPattern;
const ECCode = errorCorrectionCode;
const ReedSolomonEncoder = reedSolomonEncoder;
const Version = version$1;
const FormatInfo = formatInfo;
const Mode = mode;
const Segments = segments;
function setupFinderPattern(matrix, version2) {
  const size = matrix.size;
  const pos = FinderPattern.getPositions(version2);
  for (let i = 0; i < pos.length; i++) {
    const row = pos[i][0];
    const col = pos[i][1];
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || size <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || size <= col + c) continue;
        if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          matrix.set(row + r, col + c, true, true);
        } else {
          matrix.set(row + r, col + c, false, true);
        }
      }
    }
  }
}
function setupTimingPattern(matrix) {
  const size = matrix.size;
  for (let r = 8; r < size - 8; r++) {
    const value = r % 2 === 0;
    matrix.set(r, 6, value, true);
    matrix.set(6, r, value, true);
  }
}
function setupAlignmentPattern(matrix, version2) {
  const pos = AlignmentPattern.getPositions(version2);
  for (let i = 0; i < pos.length; i++) {
    const row = pos[i][0];
    const col = pos[i][1];
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
          matrix.set(row + r, col + c, true, true);
        } else {
          matrix.set(row + r, col + c, false, true);
        }
      }
    }
  }
}
function setupVersionInfo(matrix, version2) {
  const size = matrix.size;
  const bits2 = Version.getEncodedBits(version2);
  let row, col, mod;
  for (let i = 0; i < 18; i++) {
    row = Math.floor(i / 3);
    col = i % 3 + size - 8 - 3;
    mod = (bits2 >> i & 1) === 1;
    matrix.set(row, col, mod, true);
    matrix.set(col, row, mod, true);
  }
}
function setupFormatInfo(matrix, errorCorrectionLevel2, maskPattern2) {
  const size = matrix.size;
  const bits2 = FormatInfo.getEncodedBits(errorCorrectionLevel2, maskPattern2);
  let i, mod;
  for (i = 0; i < 15; i++) {
    mod = (bits2 >> i & 1) === 1;
    if (i < 6) {
      matrix.set(i, 8, mod, true);
    } else if (i < 8) {
      matrix.set(i + 1, 8, mod, true);
    } else {
      matrix.set(size - 15 + i, 8, mod, true);
    }
    if (i < 8) {
      matrix.set(8, size - i - 1, mod, true);
    } else if (i < 9) {
      matrix.set(8, 15 - i - 1 + 1, mod, true);
    } else {
      matrix.set(8, 15 - i - 1, mod, true);
    }
  }
  matrix.set(size - 8, 8, 1, true);
}
function setupData(matrix, data) {
  const size = matrix.size;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    while (true) {
      for (let c = 0; c < 2; c++) {
        if (!matrix.isReserved(row, col - c)) {
          let dark = false;
          if (byteIndex < data.length) {
            dark = (data[byteIndex] >>> bitIndex & 1) === 1;
          }
          matrix.set(row, col - c, dark);
          bitIndex--;
          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }
      row += inc;
      if (row < 0 || size <= row) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
}
function createData(version2, errorCorrectionLevel2, segments2) {
  const buffer = new BitBuffer();
  segments2.forEach(function(data) {
    buffer.put(data.mode.bit, 4);
    buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version2));
    data.write(buffer);
  });
  const totalCodewords = Utils$1.getSymbolTotalCodewords(version2);
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version2, errorCorrectionLevel2);
  const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
  if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
    buffer.put(0, 4);
  }
  while (buffer.getLengthInBits() % 8 !== 0) {
    buffer.putBit(0);
  }
  const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
  for (let i = 0; i < remainingByte; i++) {
    buffer.put(i % 2 ? 17 : 236, 8);
  }
  return createCodewords(buffer, version2, errorCorrectionLevel2);
}
function createCodewords(bitBuffer2, version2, errorCorrectionLevel2) {
  const totalCodewords = Utils$1.getSymbolTotalCodewords(version2);
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version2, errorCorrectionLevel2);
  const dataTotalCodewords = totalCodewords - ecTotalCodewords;
  const ecTotalBlocks = ECCode.getBlocksCount(version2, errorCorrectionLevel2);
  const blocksInGroup2 = totalCodewords % ecTotalBlocks;
  const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
  const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
  const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
  const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
  const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
  const rs = new ReedSolomonEncoder(ecCount);
  let offset = 0;
  const dcData = new Array(ecTotalBlocks);
  const ecData = new Array(ecTotalBlocks);
  let maxDataSize = 0;
  const buffer = new Uint8Array(bitBuffer2.buffer);
  for (let b = 0; b < ecTotalBlocks; b++) {
    const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
    dcData[b] = buffer.slice(offset, offset + dataSize);
    ecData[b] = rs.encode(dcData[b]);
    offset += dataSize;
    maxDataSize = Math.max(maxDataSize, dataSize);
  }
  const data = new Uint8Array(totalCodewords);
  let index = 0;
  let i, r;
  for (i = 0; i < maxDataSize; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      if (i < dcData[r].length) {
        data[index++] = dcData[r][i];
      }
    }
  }
  for (i = 0; i < ecCount; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      data[index++] = ecData[r][i];
    }
  }
  return data;
}
function createSymbol(data, version2, errorCorrectionLevel2, maskPattern2) {
  let segments2;
  if (Array.isArray(data)) {
    segments2 = Segments.fromArray(data);
  } else if (typeof data === "string") {
    let estimatedVersion = version2;
    if (!estimatedVersion) {
      const rawSegments = Segments.rawSplit(data);
      estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel2);
    }
    segments2 = Segments.fromString(data, estimatedVersion || 40);
  } else {
    throw new Error("Invalid data");
  }
  const bestVersion = Version.getBestVersionForData(segments2, errorCorrectionLevel2);
  if (!bestVersion) {
    throw new Error("The amount of data is too big to be stored in a QR Code");
  }
  if (!version2) {
    version2 = bestVersion;
  } else if (version2 < bestVersion) {
    throw new Error(
      "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
    );
  }
  const dataBits = createData(version2, errorCorrectionLevel2, segments2);
  const moduleCount = Utils$1.getSymbolSize(version2);
  const modules = new BitMatrix(moduleCount);
  setupFinderPattern(modules, version2);
  setupTimingPattern(modules);
  setupAlignmentPattern(modules, version2);
  setupFormatInfo(modules, errorCorrectionLevel2, 0);
  if (version2 >= 7) {
    setupVersionInfo(modules, version2);
  }
  setupData(modules, dataBits);
  if (isNaN(maskPattern2)) {
    maskPattern2 = MaskPattern.getBestMask(
      modules,
      setupFormatInfo.bind(null, modules, errorCorrectionLevel2)
    );
  }
  MaskPattern.applyMask(maskPattern2, modules);
  setupFormatInfo(modules, errorCorrectionLevel2, maskPattern2);
  return {
    modules,
    version: version2,
    errorCorrectionLevel: errorCorrectionLevel2,
    maskPattern: maskPattern2,
    segments: segments2
  };
}
qrcode.create = function create(data, options2) {
  if (typeof data === "undefined" || data === "") {
    throw new Error("No input text");
  }
  let errorCorrectionLevel2 = ECLevel.M;
  let version2;
  let mask;
  if (typeof options2 !== "undefined") {
    errorCorrectionLevel2 = ECLevel.from(options2.errorCorrectionLevel, ECLevel.M);
    version2 = Version.from(options2.version);
    mask = MaskPattern.from(options2.maskPattern);
    if (options2.toSJISFunc) {
      Utils$1.setToSJISFunction(options2.toSJISFunc);
    }
  }
  return createSymbol(data, version2, errorCorrectionLevel2, mask);
};
var png$1 = {};
var png = {};
var parserAsync = { exports: {} };
var chunkstream = { exports: {} };
let util$n = require$$0$2;
let Stream$2 = require$$1$2;
let ChunkStream$2 = chunkstream.exports = function() {
  Stream$2.call(this);
  this._buffers = [];
  this._buffered = 0;
  this._reads = [];
  this._paused = false;
  this._encoding = "utf8";
  this.writable = true;
};
util$n.inherits(ChunkStream$2, Stream$2);
ChunkStream$2.prototype.read = function(length, callback) {
  this._reads.push({
    length: Math.abs(length),
    // if length < 0 then at most this length
    allowLess: length < 0,
    func: callback
  });
  process.nextTick(
    (function() {
      this._process();
      if (this._paused && this._reads && this._reads.length > 0) {
        this._paused = false;
        this.emit("drain");
      }
    }).bind(this)
  );
};
ChunkStream$2.prototype.write = function(data, encoding) {
  if (!this.writable) {
    this.emit("error", new Error("Stream not writable"));
    return false;
  }
  let dataBuffer;
  if (Buffer.isBuffer(data)) {
    dataBuffer = data;
  } else {
    dataBuffer = Buffer.from(data, encoding || this._encoding);
  }
  this._buffers.push(dataBuffer);
  this._buffered += dataBuffer.length;
  this._process();
  if (this._reads && this._reads.length === 0) {
    this._paused = true;
  }
  return this.writable && !this._paused;
};
ChunkStream$2.prototype.end = function(data, encoding) {
  if (data) {
    this.write(data, encoding);
  }
  this.writable = false;
  if (!this._buffers) {
    return;
  }
  if (this._buffers.length === 0) {
    this._end();
  } else {
    this._buffers.push(null);
    this._process();
  }
};
ChunkStream$2.prototype.destroySoon = ChunkStream$2.prototype.end;
ChunkStream$2.prototype._end = function() {
  if (this._reads.length > 0) {
    this.emit("error", new Error("Unexpected end of input"));
  }
  this.destroy();
};
ChunkStream$2.prototype.destroy = function() {
  if (!this._buffers) {
    return;
  }
  this.writable = false;
  this._reads = null;
  this._buffers = null;
  this.emit("close");
};
ChunkStream$2.prototype._processReadAllowingLess = function(read) {
  this._reads.shift();
  let smallerBuf = this._buffers[0];
  if (smallerBuf.length > read.length) {
    this._buffered -= read.length;
    this._buffers[0] = smallerBuf.slice(read.length);
    read.func.call(this, smallerBuf.slice(0, read.length));
  } else {
    this._buffered -= smallerBuf.length;
    this._buffers.shift();
    read.func.call(this, smallerBuf);
  }
};
ChunkStream$2.prototype._processRead = function(read) {
  this._reads.shift();
  let pos = 0;
  let count = 0;
  let data = Buffer.alloc(read.length);
  while (pos < read.length) {
    let buf = this._buffers[count++];
    let len = Math.min(buf.length, read.length - pos);
    buf.copy(data, pos, 0, len);
    pos += len;
    if (len !== buf.length) {
      this._buffers[--count] = buf.slice(len);
    }
  }
  if (count > 0) {
    this._buffers.splice(0, count);
  }
  this._buffered -= read.length;
  read.func.call(this, data);
};
ChunkStream$2.prototype._process = function() {
  try {
    while (this._buffered > 0 && this._reads && this._reads.length > 0) {
      let read = this._reads[0];
      if (read.allowLess) {
        this._processReadAllowingLess(read);
      } else if (this._buffered >= read.length) {
        this._processRead(read);
      } else {
        break;
      }
    }
    if (this._buffers && !this.writable) {
      this._end();
    }
  } catch (ex) {
    this.emit("error", ex);
  }
};
var chunkstreamExports = chunkstream.exports;
var filterParseAsync = { exports: {} };
var filterParse = { exports: {} };
var interlace = {};
let imagePasses = [
  {
    // pass 1 - 1px
    x: [0],
    y: [0]
  },
  {
    // pass 2 - 1px
    x: [4],
    y: [0]
  },
  {
    // pass 3 - 2px
    x: [0, 4],
    y: [4]
  },
  {
    // pass 4 - 4px
    x: [2, 6],
    y: [0, 4]
  },
  {
    // pass 5 - 8px
    x: [0, 2, 4, 6],
    y: [2, 6]
  },
  {
    // pass 6 - 16px
    x: [1, 3, 5, 7],
    y: [0, 2, 4, 6]
  },
  {
    // pass 7 - 32px
    x: [0, 1, 2, 3, 4, 5, 6, 7],
    y: [1, 3, 5, 7]
  }
];
interlace.getImagePasses = function(width, height) {
  let images = [];
  let xLeftOver = width % 8;
  let yLeftOver = height % 8;
  let xRepeats = (width - xLeftOver) / 8;
  let yRepeats = (height - yLeftOver) / 8;
  for (let i = 0; i < imagePasses.length; i++) {
    let pass = imagePasses[i];
    let passWidth = xRepeats * pass.x.length;
    let passHeight = yRepeats * pass.y.length;
    for (let j = 0; j < pass.x.length; j++) {
      if (pass.x[j] < xLeftOver) {
        passWidth++;
      } else {
        break;
      }
    }
    for (let j = 0; j < pass.y.length; j++) {
      if (pass.y[j] < yLeftOver) {
        passHeight++;
      } else {
        break;
      }
    }
    if (passWidth > 0 && passHeight > 0) {
      images.push({ width: passWidth, height: passHeight, index: i });
    }
  }
  return images;
};
interlace.getInterlaceIterator = function(width) {
  return function(x, y, pass) {
    let outerXLeftOver = x % imagePasses[pass].x.length;
    let outerX = (x - outerXLeftOver) / imagePasses[pass].x.length * 8 + imagePasses[pass].x[outerXLeftOver];
    let outerYLeftOver = y % imagePasses[pass].y.length;
    let outerY = (y - outerYLeftOver) / imagePasses[pass].y.length * 8 + imagePasses[pass].y[outerYLeftOver];
    return outerX * 4 + outerY * width * 4;
  };
};
var paethPredictor$2 = function paethPredictor(left, above, upLeft) {
  let paeth = left + above - upLeft;
  let pLeft = Math.abs(paeth - left);
  let pAbove = Math.abs(paeth - above);
  let pUpLeft = Math.abs(paeth - upLeft);
  if (pLeft <= pAbove && pLeft <= pUpLeft) {
    return left;
  }
  if (pAbove <= pUpLeft) {
    return above;
  }
  return upLeft;
};
let interlaceUtils$1 = interlace;
let paethPredictor$1 = paethPredictor$2;
function getByteWidth(width, bpp, depth) {
  let byteWidth = width * bpp;
  if (depth !== 8) {
    byteWidth = Math.ceil(byteWidth / (8 / depth));
  }
  return byteWidth;
}
let Filter$2 = filterParse.exports = function(bitmapInfo, dependencies) {
  let width = bitmapInfo.width;
  let height = bitmapInfo.height;
  let interlace2 = bitmapInfo.interlace;
  let bpp = bitmapInfo.bpp;
  let depth = bitmapInfo.depth;
  this.read = dependencies.read;
  this.write = dependencies.write;
  this.complete = dependencies.complete;
  this._imageIndex = 0;
  this._images = [];
  if (interlace2) {
    let passes = interlaceUtils$1.getImagePasses(width, height);
    for (let i = 0; i < passes.length; i++) {
      this._images.push({
        byteWidth: getByteWidth(passes[i].width, bpp, depth),
        height: passes[i].height,
        lineIndex: 0
      });
    }
  } else {
    this._images.push({
      byteWidth: getByteWidth(width, bpp, depth),
      height,
      lineIndex: 0
    });
  }
  if (depth === 8) {
    this._xComparison = bpp;
  } else if (depth === 16) {
    this._xComparison = bpp * 2;
  } else {
    this._xComparison = 1;
  }
};
Filter$2.prototype.start = function() {
  this.read(
    this._images[this._imageIndex].byteWidth + 1,
    this._reverseFilterLine.bind(this)
  );
};
Filter$2.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {
  let xComparison = this._xComparison;
  let xBiggerThan = xComparison - 1;
  for (let x = 0; x < byteWidth; x++) {
    let rawByte = rawData[1 + x];
    let f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
    unfilteredLine[x] = rawByte + f1Left;
  }
};
Filter$2.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {
  let lastLine = this._lastLine;
  for (let x = 0; x < byteWidth; x++) {
    let rawByte = rawData[1 + x];
    let f2Up = lastLine ? lastLine[x] : 0;
    unfilteredLine[x] = rawByte + f2Up;
  }
};
Filter$2.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {
  let xComparison = this._xComparison;
  let xBiggerThan = xComparison - 1;
  let lastLine = this._lastLine;
  for (let x = 0; x < byteWidth; x++) {
    let rawByte = rawData[1 + x];
    let f3Up = lastLine ? lastLine[x] : 0;
    let f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
    let f3Add = Math.floor((f3Left + f3Up) / 2);
    unfilteredLine[x] = rawByte + f3Add;
  }
};
Filter$2.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {
  let xComparison = this._xComparison;
  let xBiggerThan = xComparison - 1;
  let lastLine = this._lastLine;
  for (let x = 0; x < byteWidth; x++) {
    let rawByte = rawData[1 + x];
    let f4Up = lastLine ? lastLine[x] : 0;
    let f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
    let f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
    let f4Add = paethPredictor$1(f4Left, f4Up, f4UpLeft);
    unfilteredLine[x] = rawByte + f4Add;
  }
};
Filter$2.prototype._reverseFilterLine = function(rawData) {
  let filter2 = rawData[0];
  let unfilteredLine;
  let currentImage = this._images[this._imageIndex];
  let byteWidth = currentImage.byteWidth;
  if (filter2 === 0) {
    unfilteredLine = rawData.slice(1, byteWidth + 1);
  } else {
    unfilteredLine = Buffer.alloc(byteWidth);
    switch (filter2) {
      case 1:
        this._unFilterType1(rawData, unfilteredLine, byteWidth);
        break;
      case 2:
        this._unFilterType2(rawData, unfilteredLine, byteWidth);
        break;
      case 3:
        this._unFilterType3(rawData, unfilteredLine, byteWidth);
        break;
      case 4:
        this._unFilterType4(rawData, unfilteredLine, byteWidth);
        break;
      default:
        throw new Error("Unrecognised filter type - " + filter2);
    }
  }
  this.write(unfilteredLine);
  currentImage.lineIndex++;
  if (currentImage.lineIndex >= currentImage.height) {
    this._lastLine = null;
    this._imageIndex++;
    currentImage = this._images[this._imageIndex];
  } else {
    this._lastLine = unfilteredLine;
  }
  if (currentImage) {
    this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
  } else {
    this._lastLine = null;
    this.complete();
  }
};
var filterParseExports = filterParse.exports;
let util$m = require$$0$2;
let ChunkStream$1 = chunkstreamExports;
let Filter$1 = filterParseExports;
let FilterAsync$1 = filterParseAsync.exports = function(bitmapInfo) {
  ChunkStream$1.call(this);
  let buffers = [];
  let that = this;
  this._filter = new Filter$1(bitmapInfo, {
    read: this.read.bind(this),
    write: function(buffer) {
      buffers.push(buffer);
    },
    complete: function() {
      that.emit("complete", Buffer.concat(buffers));
    }
  });
  this._filter.start();
};
util$m.inherits(FilterAsync$1, ChunkStream$1);
var filterParseAsyncExports = filterParseAsync.exports;
var parser = { exports: {} };
var constants$5 = {
  PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10],
  TYPE_IHDR: 1229472850,
  TYPE_IEND: 1229278788,
  TYPE_IDAT: 1229209940,
  TYPE_PLTE: 1347179589,
  TYPE_tRNS: 1951551059,
  // eslint-disable-line camelcase
  TYPE_gAMA: 1732332865,
  // eslint-disable-line camelcase
  // color-type bits
  COLORTYPE_GRAYSCALE: 0,
  COLORTYPE_PALETTE: 1,
  COLORTYPE_COLOR: 2,
  COLORTYPE_ALPHA: 4,
  // e.g. grayscale and alpha
  // color-type combinations
  COLORTYPE_PALETTE_COLOR: 3,
  COLORTYPE_COLOR_ALPHA: 6,
  COLORTYPE_TO_BPP_MAP: {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4
  },
  GAMMA_DIVISION: 1e5
};
var crc = { exports: {} };
let crcTable = [];
(function() {
  for (let i = 0; i < 256; i++) {
    let currentCrc = i;
    for (let j = 0; j < 8; j++) {
      if (currentCrc & 1) {
        currentCrc = 3988292384 ^ currentCrc >>> 1;
      } else {
        currentCrc = currentCrc >>> 1;
      }
    }
    crcTable[i] = currentCrc;
  }
})();
let CrcCalculator$1 = crc.exports = function() {
  this._crc = -1;
};
CrcCalculator$1.prototype.write = function(data) {
  for (let i = 0; i < data.length; i++) {
    this._crc = crcTable[(this._crc ^ data[i]) & 255] ^ this._crc >>> 8;
  }
  return true;
};
CrcCalculator$1.prototype.crc32 = function() {
  return this._crc ^ -1;
};
CrcCalculator$1.crc32 = function(buf) {
  let crc2 = -1;
  for (let i = 0; i < buf.length; i++) {
    crc2 = crcTable[(crc2 ^ buf[i]) & 255] ^ crc2 >>> 8;
  }
  return crc2 ^ -1;
};
var crcExports = crc.exports;
let constants$4 = constants$5;
let CrcCalculator = crcExports;
let Parser$3 = parser.exports = function(options2, dependencies) {
  this._options = options2;
  options2.checkCRC = options2.checkCRC !== false;
  this._hasIHDR = false;
  this._hasIEND = false;
  this._emittedHeadersFinished = false;
  this._palette = [];
  this._colorType = 0;
  this._chunks = {};
  this._chunks[constants$4.TYPE_IHDR] = this._handleIHDR.bind(this);
  this._chunks[constants$4.TYPE_IEND] = this._handleIEND.bind(this);
  this._chunks[constants$4.TYPE_IDAT] = this._handleIDAT.bind(this);
  this._chunks[constants$4.TYPE_PLTE] = this._handlePLTE.bind(this);
  this._chunks[constants$4.TYPE_tRNS] = this._handleTRNS.bind(this);
  this._chunks[constants$4.TYPE_gAMA] = this._handleGAMA.bind(this);
  this.read = dependencies.read;
  this.error = dependencies.error;
  this.metadata = dependencies.metadata;
  this.gamma = dependencies.gamma;
  this.transColor = dependencies.transColor;
  this.palette = dependencies.palette;
  this.parsed = dependencies.parsed;
  this.inflateData = dependencies.inflateData;
  this.finished = dependencies.finished;
  this.simpleTransparency = dependencies.simpleTransparency;
  this.headersFinished = dependencies.headersFinished || function() {
  };
};
Parser$3.prototype.start = function() {
  this.read(constants$4.PNG_SIGNATURE.length, this._parseSignature.bind(this));
};
Parser$3.prototype._parseSignature = function(data) {
  let signature = constants$4.PNG_SIGNATURE;
  for (let i = 0; i < signature.length; i++) {
    if (data[i] !== signature[i]) {
      this.error(new Error("Invalid file signature"));
      return;
    }
  }
  this.read(8, this._parseChunkBegin.bind(this));
};
Parser$3.prototype._parseChunkBegin = function(data) {
  let length = data.readUInt32BE(0);
  let type = data.readUInt32BE(4);
  let name = "";
  for (let i = 4; i < 8; i++) {
    name += String.fromCharCode(data[i]);
  }
  let ancillary = Boolean(data[4] & 32);
  if (!this._hasIHDR && type !== constants$4.TYPE_IHDR) {
    this.error(new Error("Expected IHDR on beggining"));
    return;
  }
  this._crc = new CrcCalculator();
  this._crc.write(Buffer.from(name));
  if (this._chunks[type]) {
    return this._chunks[type](length);
  }
  if (!ancillary) {
    this.error(new Error("Unsupported critical chunk type " + name));
    return;
  }
  this.read(length + 4, this._skipChunk.bind(this));
};
Parser$3.prototype._skipChunk = function() {
  this.read(8, this._parseChunkBegin.bind(this));
};
Parser$3.prototype._handleChunkEnd = function() {
  this.read(4, this._parseChunkEnd.bind(this));
};
Parser$3.prototype._parseChunkEnd = function(data) {
  let fileCrc = data.readInt32BE(0);
  let calcCrc = this._crc.crc32();
  if (this._options.checkCRC && calcCrc !== fileCrc) {
    this.error(new Error("Crc error - " + fileCrc + " - " + calcCrc));
    return;
  }
  if (!this._hasIEND) {
    this.read(8, this._parseChunkBegin.bind(this));
  }
};
Parser$3.prototype._handleIHDR = function(length) {
  this.read(length, this._parseIHDR.bind(this));
};
Parser$3.prototype._parseIHDR = function(data) {
  this._crc.write(data);
  let width = data.readUInt32BE(0);
  let height = data.readUInt32BE(4);
  let depth = data[8];
  let colorType = data[9];
  let compr = data[10];
  let filter2 = data[11];
  let interlace2 = data[12];
  if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
    this.error(new Error("Unsupported bit depth " + depth));
    return;
  }
  if (!(colorType in constants$4.COLORTYPE_TO_BPP_MAP)) {
    this.error(new Error("Unsupported color type"));
    return;
  }
  if (compr !== 0) {
    this.error(new Error("Unsupported compression method"));
    return;
  }
  if (filter2 !== 0) {
    this.error(new Error("Unsupported filter method"));
    return;
  }
  if (interlace2 !== 0 && interlace2 !== 1) {
    this.error(new Error("Unsupported interlace method"));
    return;
  }
  this._colorType = colorType;
  let bpp = constants$4.COLORTYPE_TO_BPP_MAP[this._colorType];
  this._hasIHDR = true;
  this.metadata({
    width,
    height,
    depth,
    interlace: Boolean(interlace2),
    palette: Boolean(colorType & constants$4.COLORTYPE_PALETTE),
    color: Boolean(colorType & constants$4.COLORTYPE_COLOR),
    alpha: Boolean(colorType & constants$4.COLORTYPE_ALPHA),
    bpp,
    colorType
  });
  this._handleChunkEnd();
};
Parser$3.prototype._handlePLTE = function(length) {
  this.read(length, this._parsePLTE.bind(this));
};
Parser$3.prototype._parsePLTE = function(data) {
  this._crc.write(data);
  let entries = Math.floor(data.length / 3);
  for (let i = 0; i < entries; i++) {
    this._palette.push([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255]);
  }
  this.palette(this._palette);
  this._handleChunkEnd();
};
Parser$3.prototype._handleTRNS = function(length) {
  this.simpleTransparency();
  this.read(length, this._parseTRNS.bind(this));
};
Parser$3.prototype._parseTRNS = function(data) {
  this._crc.write(data);
  if (this._colorType === constants$4.COLORTYPE_PALETTE_COLOR) {
    if (this._palette.length === 0) {
      this.error(new Error("Transparency chunk must be after palette"));
      return;
    }
    if (data.length > this._palette.length) {
      this.error(new Error("More transparent colors than palette size"));
      return;
    }
    for (let i = 0; i < data.length; i++) {
      this._palette[i][3] = data[i];
    }
    this.palette(this._palette);
  }
  if (this._colorType === constants$4.COLORTYPE_GRAYSCALE) {
    this.transColor([data.readUInt16BE(0)]);
  }
  if (this._colorType === constants$4.COLORTYPE_COLOR) {
    this.transColor([
      data.readUInt16BE(0),
      data.readUInt16BE(2),
      data.readUInt16BE(4)
    ]);
  }
  this._handleChunkEnd();
};
Parser$3.prototype._handleGAMA = function(length) {
  this.read(length, this._parseGAMA.bind(this));
};
Parser$3.prototype._parseGAMA = function(data) {
  this._crc.write(data);
  this.gamma(data.readUInt32BE(0) / constants$4.GAMMA_DIVISION);
  this._handleChunkEnd();
};
Parser$3.prototype._handleIDAT = function(length) {
  if (!this._emittedHeadersFinished) {
    this._emittedHeadersFinished = true;
    this.headersFinished();
  }
  this.read(-length, this._parseIDAT.bind(this, length));
};
Parser$3.prototype._parseIDAT = function(length, data) {
  this._crc.write(data);
  if (this._colorType === constants$4.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
    throw new Error("Expected palette not found");
  }
  this.inflateData(data);
  let leftOverLength = length - data.length;
  if (leftOverLength > 0) {
    this._handleIDAT(leftOverLength);
  } else {
    this._handleChunkEnd();
  }
};
Parser$3.prototype._handleIEND = function(length) {
  this.read(length, this._parseIEND.bind(this));
};
Parser$3.prototype._parseIEND = function(data) {
  this._crc.write(data);
  this._hasIEND = true;
  this._handleChunkEnd();
  if (this.finished) {
    this.finished();
  }
};
var parserExports = parser.exports;
var bitmapper$2 = {};
let interlaceUtils = interlace;
let pixelBppMapper = [
  // 0 - dummy entry
  function() {
  },
  // 1 - L
  // 0: 0, 1: 0, 2: 0, 3: 0xff
  function(pxData, data, pxPos, rawPos) {
    if (rawPos === data.length) {
      throw new Error("Ran out of data");
    }
    let pixel = data[rawPos];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = 255;
  },
  // 2 - LA
  // 0: 0, 1: 0, 2: 0, 3: 1
  function(pxData, data, pxPos, rawPos) {
    if (rawPos + 1 >= data.length) {
      throw new Error("Ran out of data");
    }
    let pixel = data[rawPos];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = data[rawPos + 1];
  },
  // 3 - RGB
  // 0: 0, 1: 1, 2: 2, 3: 0xff
  function(pxData, data, pxPos, rawPos) {
    if (rawPos + 2 >= data.length) {
      throw new Error("Ran out of data");
    }
    pxData[pxPos] = data[rawPos];
    pxData[pxPos + 1] = data[rawPos + 1];
    pxData[pxPos + 2] = data[rawPos + 2];
    pxData[pxPos + 3] = 255;
  },
  // 4 - RGBA
  // 0: 0, 1: 1, 2: 2, 3: 3
  function(pxData, data, pxPos, rawPos) {
    if (rawPos + 3 >= data.length) {
      throw new Error("Ran out of data");
    }
    pxData[pxPos] = data[rawPos];
    pxData[pxPos + 1] = data[rawPos + 1];
    pxData[pxPos + 2] = data[rawPos + 2];
    pxData[pxPos + 3] = data[rawPos + 3];
  }
];
let pixelBppCustomMapper = [
  // 0 - dummy entry
  function() {
  },
  // 1 - L
  // 0: 0, 1: 0, 2: 0, 3: 0xff
  function(pxData, pixelData, pxPos, maxBit) {
    let pixel = pixelData[0];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = maxBit;
  },
  // 2 - LA
  // 0: 0, 1: 0, 2: 0, 3: 1
  function(pxData, pixelData, pxPos) {
    let pixel = pixelData[0];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = pixelData[1];
  },
  // 3 - RGB
  // 0: 0, 1: 1, 2: 2, 3: 0xff
  function(pxData, pixelData, pxPos, maxBit) {
    pxData[pxPos] = pixelData[0];
    pxData[pxPos + 1] = pixelData[1];
    pxData[pxPos + 2] = pixelData[2];
    pxData[pxPos + 3] = maxBit;
  },
  // 4 - RGBA
  // 0: 0, 1: 1, 2: 2, 3: 3
  function(pxData, pixelData, pxPos) {
    pxData[pxPos] = pixelData[0];
    pxData[pxPos + 1] = pixelData[1];
    pxData[pxPos + 2] = pixelData[2];
    pxData[pxPos + 3] = pixelData[3];
  }
];
function bitRetriever(data, depth) {
  let leftOver = [];
  let i = 0;
  function split() {
    if (i === data.length) {
      throw new Error("Ran out of data");
    }
    let byte2 = data[i];
    i++;
    let byte8, byte7, byte6, byte5, byte4, byte3, byte22, byte1;
    switch (depth) {
      default:
        throw new Error("unrecognised depth");
      case 16:
        byte22 = data[i];
        i++;
        leftOver.push((byte2 << 8) + byte22);
        break;
      case 4:
        byte22 = byte2 & 15;
        byte1 = byte2 >> 4;
        leftOver.push(byte1, byte22);
        break;
      case 2:
        byte4 = byte2 & 3;
        byte3 = byte2 >> 2 & 3;
        byte22 = byte2 >> 4 & 3;
        byte1 = byte2 >> 6 & 3;
        leftOver.push(byte1, byte22, byte3, byte4);
        break;
      case 1:
        byte8 = byte2 & 1;
        byte7 = byte2 >> 1 & 1;
        byte6 = byte2 >> 2 & 1;
        byte5 = byte2 >> 3 & 1;
        byte4 = byte2 >> 4 & 1;
        byte3 = byte2 >> 5 & 1;
        byte22 = byte2 >> 6 & 1;
        byte1 = byte2 >> 7 & 1;
        leftOver.push(byte1, byte22, byte3, byte4, byte5, byte6, byte7, byte8);
        break;
    }
  }
  return {
    get: function(count) {
      while (leftOver.length < count) {
        split();
      }
      let returner = leftOver.slice(0, count);
      leftOver = leftOver.slice(count);
      return returner;
    },
    resetAfterLine: function() {
      leftOver.length = 0;
    },
    end: function() {
      if (i !== data.length) {
        throw new Error("extra data found");
      }
    }
  };
}
function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
  let imageWidth = image.width;
  let imageHeight = image.height;
  let imagePass = image.index;
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      let pxPos = getPxPos(x, y, imagePass);
      pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
      rawPos += bpp;
    }
  }
  return rawPos;
}
function mapImageCustomBit(image, pxData, getPxPos, bpp, bits2, maxBit) {
  let imageWidth = image.width;
  let imageHeight = image.height;
  let imagePass = image.index;
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      let pixelData = bits2.get(bpp);
      let pxPos = getPxPos(x, y, imagePass);
      pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
    }
    bits2.resetAfterLine();
  }
}
bitmapper$2.dataToBitMap = function(data, bitmapInfo) {
  let width = bitmapInfo.width;
  let height = bitmapInfo.height;
  let depth = bitmapInfo.depth;
  let bpp = bitmapInfo.bpp;
  let interlace2 = bitmapInfo.interlace;
  let bits2;
  if (depth !== 8) {
    bits2 = bitRetriever(data, depth);
  }
  let pxData;
  if (depth <= 8) {
    pxData = Buffer.alloc(width * height * 4);
  } else {
    pxData = new Uint16Array(width * height * 4);
  }
  let maxBit = Math.pow(2, depth) - 1;
  let rawPos = 0;
  let images;
  let getPxPos;
  if (interlace2) {
    images = interlaceUtils.getImagePasses(width, height);
    getPxPos = interlaceUtils.getInterlaceIterator(width, height);
  } else {
    let nonInterlacedPxPos = 0;
    getPxPos = function() {
      let returner = nonInterlacedPxPos;
      nonInterlacedPxPos += 4;
      return returner;
    };
    images = [{ width, height }];
  }
  for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
    if (depth === 8) {
      rawPos = mapImage8Bit(
        images[imageIndex],
        pxData,
        getPxPos,
        bpp,
        data,
        rawPos
      );
    } else {
      mapImageCustomBit(
        images[imageIndex],
        pxData,
        getPxPos,
        bpp,
        bits2,
        maxBit
      );
    }
  }
  if (depth === 8) {
    if (rawPos !== data.length) {
      throw new Error("extra data found");
    }
  } else {
    bits2.end();
  }
  return pxData;
};
function dePalette(indata, outdata, width, height, palette) {
  let pxPos = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = palette[indata[pxPos]];
      if (!color) {
        throw new Error("index " + indata[pxPos] + " not in palette");
      }
      for (let i = 0; i < 4; i++) {
        outdata[pxPos + i] = color[i];
      }
      pxPos += 4;
    }
  }
}
function replaceTransparentColor(indata, outdata, width, height, transColor) {
  let pxPos = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let makeTrans = false;
      if (transColor.length === 1) {
        if (transColor[0] === indata[pxPos]) {
          makeTrans = true;
        }
      } else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
        makeTrans = true;
      }
      if (makeTrans) {
        for (let i = 0; i < 4; i++) {
          outdata[pxPos + i] = 0;
        }
      }
      pxPos += 4;
    }
  }
}
function scaleDepth(indata, outdata, width, height, depth) {
  let maxOutSample = 255;
  let maxInSample = Math.pow(2, depth) - 1;
  let pxPos = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let i = 0; i < 4; i++) {
        outdata[pxPos + i] = Math.floor(
          indata[pxPos + i] * maxOutSample / maxInSample + 0.5
        );
      }
      pxPos += 4;
    }
  }
}
var formatNormaliser$2 = function(indata, imageData) {
  let depth = imageData.depth;
  let width = imageData.width;
  let height = imageData.height;
  let colorType = imageData.colorType;
  let transColor = imageData.transColor;
  let palette = imageData.palette;
  let outdata = indata;
  if (colorType === 3) {
    dePalette(indata, outdata, width, height, palette);
  } else {
    if (transColor) {
      replaceTransparentColor(indata, outdata, width, height, transColor);
    }
    if (depth !== 8) {
      if (depth === 16) {
        outdata = Buffer.alloc(width * height * 4);
      }
      scaleDepth(indata, outdata, width, height, depth);
    }
  }
  return outdata;
};
let util$l = require$$0$2;
let zlib$3 = require$$1$3;
let ChunkStream = chunkstreamExports;
let FilterAsync = filterParseAsyncExports;
let Parser$2 = parserExports;
let bitmapper$1 = bitmapper$2;
let formatNormaliser$1 = formatNormaliser$2;
let ParserAsync = parserAsync.exports = function(options2) {
  ChunkStream.call(this);
  this._parser = new Parser$2(options2, {
    read: this.read.bind(this),
    error: this._handleError.bind(this),
    metadata: this._handleMetaData.bind(this),
    gamma: this.emit.bind(this, "gamma"),
    palette: this._handlePalette.bind(this),
    transColor: this._handleTransColor.bind(this),
    finished: this._finished.bind(this),
    inflateData: this._inflateData.bind(this),
    simpleTransparency: this._simpleTransparency.bind(this),
    headersFinished: this._headersFinished.bind(this)
  });
  this._options = options2;
  this.writable = true;
  this._parser.start();
};
util$l.inherits(ParserAsync, ChunkStream);
ParserAsync.prototype._handleError = function(err2) {
  this.emit("error", err2);
  this.writable = false;
  this.destroy();
  if (this._inflate && this._inflate.destroy) {
    this._inflate.destroy();
  }
  if (this._filter) {
    this._filter.destroy();
    this._filter.on("error", function() {
    });
  }
  this.errord = true;
};
ParserAsync.prototype._inflateData = function(data) {
  if (!this._inflate) {
    if (this._bitmapInfo.interlace) {
      this._inflate = zlib$3.createInflate();
      this._inflate.on("error", this.emit.bind(this, "error"));
      this._filter.on("complete", this._complete.bind(this));
      this._inflate.pipe(this._filter);
    } else {
      let rowSize = (this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1;
      let imageSize = rowSize * this._bitmapInfo.height;
      let chunkSize = Math.max(imageSize, zlib$3.Z_MIN_CHUNK);
      this._inflate = zlib$3.createInflate({ chunkSize });
      let leftToInflate = imageSize;
      let emitError = this.emit.bind(this, "error");
      this._inflate.on("error", function(err2) {
        if (!leftToInflate) {
          return;
        }
        emitError(err2);
      });
      this._filter.on("complete", this._complete.bind(this));
      let filterWrite = this._filter.write.bind(this._filter);
      this._inflate.on("data", function(chunk) {
        if (!leftToInflate) {
          return;
        }
        if (chunk.length > leftToInflate) {
          chunk = chunk.slice(0, leftToInflate);
        }
        leftToInflate -= chunk.length;
        filterWrite(chunk);
      });
      this._inflate.on("end", this._filter.end.bind(this._filter));
    }
  }
  this._inflate.write(data);
};
ParserAsync.prototype._handleMetaData = function(metaData) {
  this._metaData = metaData;
  this._bitmapInfo = Object.create(metaData);
  this._filter = new FilterAsync(this._bitmapInfo);
};
ParserAsync.prototype._handleTransColor = function(transColor) {
  this._bitmapInfo.transColor = transColor;
};
ParserAsync.prototype._handlePalette = function(palette) {
  this._bitmapInfo.palette = palette;
};
ParserAsync.prototype._simpleTransparency = function() {
  this._metaData.alpha = true;
};
ParserAsync.prototype._headersFinished = function() {
  this.emit("metadata", this._metaData);
};
ParserAsync.prototype._finished = function() {
  if (this.errord) {
    return;
  }
  if (!this._inflate) {
    this.emit("error", "No Inflate block");
  } else {
    this._inflate.end();
  }
};
ParserAsync.prototype._complete = function(filteredData) {
  if (this.errord) {
    return;
  }
  let normalisedBitmapData;
  try {
    let bitmapData = bitmapper$1.dataToBitMap(filteredData, this._bitmapInfo);
    normalisedBitmapData = formatNormaliser$1(bitmapData, this._bitmapInfo);
    bitmapData = null;
  } catch (ex) {
    this._handleError(ex);
    return;
  }
  this.emit("parsed", normalisedBitmapData);
};
var parserAsyncExports = parserAsync.exports;
var packerAsync = { exports: {} };
var packer = { exports: {} };
let constants$3 = constants$5;
var bitpacker = function(dataIn, width, height, options2) {
  let outHasAlpha = [constants$3.COLORTYPE_COLOR_ALPHA, constants$3.COLORTYPE_ALPHA].indexOf(
    options2.colorType
  ) !== -1;
  if (options2.colorType === options2.inputColorType) {
    let bigEndian = function() {
      let buffer = new ArrayBuffer(2);
      new DataView(buffer).setInt16(
        0,
        256,
        true
        /* littleEndian */
      );
      return new Int16Array(buffer)[0] !== 256;
    }();
    if (options2.bitDepth === 8 || options2.bitDepth === 16 && bigEndian) {
      return dataIn;
    }
  }
  let data = options2.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
  let maxValue = 255;
  let inBpp = constants$3.COLORTYPE_TO_BPP_MAP[options2.inputColorType];
  if (inBpp === 4 && !options2.inputHasAlpha) {
    inBpp = 3;
  }
  let outBpp = constants$3.COLORTYPE_TO_BPP_MAP[options2.colorType];
  if (options2.bitDepth === 16) {
    maxValue = 65535;
    outBpp *= 2;
  }
  let outData = Buffer.alloc(width * height * outBpp);
  let inIndex = 0;
  let outIndex = 0;
  let bgColor = options2.bgColor || {};
  if (bgColor.red === void 0) {
    bgColor.red = maxValue;
  }
  if (bgColor.green === void 0) {
    bgColor.green = maxValue;
  }
  if (bgColor.blue === void 0) {
    bgColor.blue = maxValue;
  }
  function getRGBA() {
    let red;
    let green;
    let blue;
    let alpha = maxValue;
    switch (options2.inputColorType) {
      case constants$3.COLORTYPE_COLOR_ALPHA:
        alpha = data[inIndex + 3];
        red = data[inIndex];
        green = data[inIndex + 1];
        blue = data[inIndex + 2];
        break;
      case constants$3.COLORTYPE_COLOR:
        red = data[inIndex];
        green = data[inIndex + 1];
        blue = data[inIndex + 2];
        break;
      case constants$3.COLORTYPE_ALPHA:
        alpha = data[inIndex + 1];
        red = data[inIndex];
        green = red;
        blue = red;
        break;
      case constants$3.COLORTYPE_GRAYSCALE:
        red = data[inIndex];
        green = red;
        blue = red;
        break;
      default:
        throw new Error(
          "input color type:" + options2.inputColorType + " is not supported at present"
        );
    }
    if (options2.inputHasAlpha) {
      if (!outHasAlpha) {
        alpha /= maxValue;
        red = Math.min(
          Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0),
          maxValue
        );
        green = Math.min(
          Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0),
          maxValue
        );
        blue = Math.min(
          Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0),
          maxValue
        );
      }
    }
    return { red, green, blue, alpha };
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rgba = getRGBA();
      switch (options2.colorType) {
        case constants$3.COLORTYPE_COLOR_ALPHA:
        case constants$3.COLORTYPE_COLOR:
          if (options2.bitDepth === 8) {
            outData[outIndex] = rgba.red;
            outData[outIndex + 1] = rgba.green;
            outData[outIndex + 2] = rgba.blue;
            if (outHasAlpha) {
              outData[outIndex + 3] = rgba.alpha;
            }
          } else {
            outData.writeUInt16BE(rgba.red, outIndex);
            outData.writeUInt16BE(rgba.green, outIndex + 2);
            outData.writeUInt16BE(rgba.blue, outIndex + 4);
            if (outHasAlpha) {
              outData.writeUInt16BE(rgba.alpha, outIndex + 6);
            }
          }
          break;
        case constants$3.COLORTYPE_ALPHA:
        case constants$3.COLORTYPE_GRAYSCALE: {
          let grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
          if (options2.bitDepth === 8) {
            outData[outIndex] = grayscale;
            if (outHasAlpha) {
              outData[outIndex + 1] = rgba.alpha;
            }
          } else {
            outData.writeUInt16BE(grayscale, outIndex);
            if (outHasAlpha) {
              outData.writeUInt16BE(rgba.alpha, outIndex + 2);
            }
          }
          break;
        }
        default:
          throw new Error("unrecognised color Type " + options2.colorType);
      }
      inIndex += inBpp;
      outIndex += outBpp;
    }
  }
  return outData;
};
let paethPredictor2 = paethPredictor$2;
function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
  for (let x = 0; x < byteWidth; x++) {
    rawData[rawPos + x] = pxData[pxPos + x];
  }
}
function filterSumNone(pxData, pxPos, byteWidth) {
  let sum = 0;
  let length = pxPos + byteWidth;
  for (let i = pxPos; i < length; i++) {
    sum += Math.abs(pxData[i]);
  }
  return sum;
}
function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
  for (let x = 0; x < byteWidth; x++) {
    let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    let val = pxData[pxPos + x] - left;
    rawData[rawPos + x] = val;
  }
}
function filterSumSub(pxData, pxPos, byteWidth, bpp) {
  let sum = 0;
  for (let x = 0; x < byteWidth; x++) {
    let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    let val = pxData[pxPos + x] - left;
    sum += Math.abs(val);
  }
  return sum;
}
function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {
  for (let x = 0; x < byteWidth; x++) {
    let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    let val = pxData[pxPos + x] - up;
    rawData[rawPos + x] = val;
  }
}
function filterSumUp(pxData, pxPos, byteWidth) {
  let sum = 0;
  let length = pxPos + byteWidth;
  for (let x = pxPos; x < length; x++) {
    let up = pxPos > 0 ? pxData[x - byteWidth] : 0;
    let val = pxData[x] - up;
    sum += Math.abs(val);
  }
  return sum;
}
function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
  for (let x = 0; x < byteWidth; x++) {
    let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    let val = pxData[pxPos + x] - (left + up >> 1);
    rawData[rawPos + x] = val;
  }
}
function filterSumAvg(pxData, pxPos, byteWidth, bpp) {
  let sum = 0;
  for (let x = 0; x < byteWidth; x++) {
    let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    let val = pxData[pxPos + x] - (left + up >> 1);
    sum += Math.abs(val);
  }
  return sum;
}
function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
  for (let x = 0; x < byteWidth; x++) {
    let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
    let val = pxData[pxPos + x] - paethPredictor2(left, up, upleft);
    rawData[rawPos + x] = val;
  }
}
function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
  let sum = 0;
  for (let x = 0; x < byteWidth; x++) {
    let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
    let val = pxData[pxPos + x] - paethPredictor2(left, up, upleft);
    sum += Math.abs(val);
  }
  return sum;
}
let filters = {
  0: filterNone,
  1: filterSub,
  2: filterUp,
  3: filterAvg,
  4: filterPaeth
};
let filterSums = {
  0: filterSumNone,
  1: filterSumSub,
  2: filterSumUp,
  3: filterSumAvg,
  4: filterSumPaeth
};
var filterPack = function(pxData, width, height, options2, bpp) {
  let filterTypes;
  if (!("filterType" in options2) || options2.filterType === -1) {
    filterTypes = [0, 1, 2, 3, 4];
  } else if (typeof options2.filterType === "number") {
    filterTypes = [options2.filterType];
  } else {
    throw new Error("unrecognised filter types");
  }
  if (options2.bitDepth === 16) {
    bpp *= 2;
  }
  let byteWidth = width * bpp;
  let rawPos = 0;
  let pxPos = 0;
  let rawData = Buffer.alloc((byteWidth + 1) * height);
  let sel = filterTypes[0];
  for (let y = 0; y < height; y++) {
    if (filterTypes.length > 1) {
      let min = Infinity;
      for (let i = 0; i < filterTypes.length; i++) {
        let sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
        if (sum < min) {
          sel = filterTypes[i];
          min = sum;
        }
      }
    }
    rawData[rawPos] = sel;
    rawPos++;
    filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
    rawPos += byteWidth;
    pxPos += byteWidth;
  }
  return rawData;
};
let constants$2 = constants$5;
let CrcStream = crcExports;
let bitPacker = bitpacker;
let filter = filterPack;
let zlib$2 = require$$1$3;
let Packer$3 = packer.exports = function(options2) {
  this._options = options2;
  options2.deflateChunkSize = options2.deflateChunkSize || 32 * 1024;
  options2.deflateLevel = options2.deflateLevel != null ? options2.deflateLevel : 9;
  options2.deflateStrategy = options2.deflateStrategy != null ? options2.deflateStrategy : 3;
  options2.inputHasAlpha = options2.inputHasAlpha != null ? options2.inputHasAlpha : true;
  options2.deflateFactory = options2.deflateFactory || zlib$2.createDeflate;
  options2.bitDepth = options2.bitDepth || 8;
  options2.colorType = typeof options2.colorType === "number" ? options2.colorType : constants$2.COLORTYPE_COLOR_ALPHA;
  options2.inputColorType = typeof options2.inputColorType === "number" ? options2.inputColorType : constants$2.COLORTYPE_COLOR_ALPHA;
  if ([
    constants$2.COLORTYPE_GRAYSCALE,
    constants$2.COLORTYPE_COLOR,
    constants$2.COLORTYPE_COLOR_ALPHA,
    constants$2.COLORTYPE_ALPHA
  ].indexOf(options2.colorType) === -1) {
    throw new Error(
      "option color type:" + options2.colorType + " is not supported at present"
    );
  }
  if ([
    constants$2.COLORTYPE_GRAYSCALE,
    constants$2.COLORTYPE_COLOR,
    constants$2.COLORTYPE_COLOR_ALPHA,
    constants$2.COLORTYPE_ALPHA
  ].indexOf(options2.inputColorType) === -1) {
    throw new Error(
      "option input color type:" + options2.inputColorType + " is not supported at present"
    );
  }
  if (options2.bitDepth !== 8 && options2.bitDepth !== 16) {
    throw new Error(
      "option bit depth:" + options2.bitDepth + " is not supported at present"
    );
  }
};
Packer$3.prototype.getDeflateOptions = function() {
  return {
    chunkSize: this._options.deflateChunkSize,
    level: this._options.deflateLevel,
    strategy: this._options.deflateStrategy
  };
};
Packer$3.prototype.createDeflate = function() {
  return this._options.deflateFactory(this.getDeflateOptions());
};
Packer$3.prototype.filterData = function(data, width, height) {
  let packedData = bitPacker(data, width, height, this._options);
  let bpp = constants$2.COLORTYPE_TO_BPP_MAP[this._options.colorType];
  let filteredData = filter(packedData, width, height, this._options, bpp);
  return filteredData;
};
Packer$3.prototype._packChunk = function(type, data) {
  let len = data ? data.length : 0;
  let buf = Buffer.alloc(len + 12);
  buf.writeUInt32BE(len, 0);
  buf.writeUInt32BE(type, 4);
  if (data) {
    data.copy(buf, 8);
  }
  buf.writeInt32BE(
    CrcStream.crc32(buf.slice(4, buf.length - 4)),
    buf.length - 4
  );
  return buf;
};
Packer$3.prototype.packGAMA = function(gamma) {
  let buf = Buffer.alloc(4);
  buf.writeUInt32BE(Math.floor(gamma * constants$2.GAMMA_DIVISION), 0);
  return this._packChunk(constants$2.TYPE_gAMA, buf);
};
Packer$3.prototype.packIHDR = function(width, height) {
  let buf = Buffer.alloc(13);
  buf.writeUInt32BE(width, 0);
  buf.writeUInt32BE(height, 4);
  buf[8] = this._options.bitDepth;
  buf[9] = this._options.colorType;
  buf[10] = 0;
  buf[11] = 0;
  buf[12] = 0;
  return this._packChunk(constants$2.TYPE_IHDR, buf);
};
Packer$3.prototype.packIDAT = function(data) {
  return this._packChunk(constants$2.TYPE_IDAT, data);
};
Packer$3.prototype.packIEND = function() {
  return this._packChunk(constants$2.TYPE_IEND, null);
};
var packerExports = packer.exports;
let util$k = require$$0$2;
let Stream$1 = require$$1$2;
let constants$1 = constants$5;
let Packer$2 = packerExports;
let PackerAsync = packerAsync.exports = function(opt) {
  Stream$1.call(this);
  let options2 = opt || {};
  this._packer = new Packer$2(options2);
  this._deflate = this._packer.createDeflate();
  this.readable = true;
};
util$k.inherits(PackerAsync, Stream$1);
PackerAsync.prototype.pack = function(data, width, height, gamma) {
  this.emit("data", Buffer.from(constants$1.PNG_SIGNATURE));
  this.emit("data", this._packer.packIHDR(width, height));
  if (gamma) {
    this.emit("data", this._packer.packGAMA(gamma));
  }
  let filteredData = this._packer.filterData(data, width, height);
  this._deflate.on("error", this.emit.bind(this, "error"));
  this._deflate.on(
    "data",
    (function(compressedData) {
      this.emit("data", this._packer.packIDAT(compressedData));
    }).bind(this)
  );
  this._deflate.on(
    "end",
    (function() {
      this.emit("data", this._packer.packIEND());
      this.emit("end");
    }).bind(this)
  );
  this._deflate.end(filteredData);
};
var packerAsyncExports = packerAsync.exports;
var pngSync = {};
var syncInflate = { exports: {} };
(function(module, exports) {
  let assert = require$$0$3.ok;
  let zlib2 = require$$1$3;
  let util2 = require$$0$2;
  let kMaxLength = require$$3$2.kMaxLength;
  function Inflate(opts) {
    if (!(this instanceof Inflate)) {
      return new Inflate(opts);
    }
    if (opts && opts.chunkSize < zlib2.Z_MIN_CHUNK) {
      opts.chunkSize = zlib2.Z_MIN_CHUNK;
    }
    zlib2.Inflate.call(this, opts);
    this._offset = this._offset === void 0 ? this._outOffset : this._offset;
    this._buffer = this._buffer || this._outBuffer;
    if (opts && opts.maxLength != null) {
      this._maxLength = opts.maxLength;
    }
  }
  function createInflate(opts) {
    return new Inflate(opts);
  }
  function _close(engine, callback) {
    if (!engine._handle) {
      return;
    }
    engine._handle.close();
    engine._handle = null;
  }
  Inflate.prototype._processChunk = function(chunk, flushFlag, asyncCb) {
    if (typeof asyncCb === "function") {
      return zlib2.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
    }
    let self = this;
    let availInBefore = chunk && chunk.length;
    let availOutBefore = this._chunkSize - this._offset;
    let leftToInflate = this._maxLength;
    let inOff = 0;
    let buffers = [];
    let nread = 0;
    let error;
    this.on("error", function(err2) {
      error = err2;
    });
    function handleChunk(availInAfter, availOutAfter) {
      if (self._hadError) {
        return;
      }
      let have = availOutBefore - availOutAfter;
      assert(have >= 0, "have should not go down");
      if (have > 0) {
        let out = self._buffer.slice(self._offset, self._offset + have);
        self._offset += have;
        if (out.length > leftToInflate) {
          out = out.slice(0, leftToInflate);
        }
        buffers.push(out);
        nread += out.length;
        leftToInflate -= out.length;
        if (leftToInflate === 0) {
          return false;
        }
      }
      if (availOutAfter === 0 || self._offset >= self._chunkSize) {
        availOutBefore = self._chunkSize;
        self._offset = 0;
        self._buffer = Buffer.allocUnsafe(self._chunkSize);
      }
      if (availOutAfter === 0) {
        inOff += availInBefore - availInAfter;
        availInBefore = availInAfter;
        return true;
      }
      return false;
    }
    assert(this._handle, "zlib binding closed");
    let res;
    do {
      res = this._handle.writeSync(
        flushFlag,
        chunk,
        // in
        inOff,
        // in_off
        availInBefore,
        // in_len
        this._buffer,
        // out
        this._offset,
        //out_off
        availOutBefore
      );
      res = res || this._writeState;
    } while (!this._hadError && handleChunk(res[0], res[1]));
    if (this._hadError) {
      throw error;
    }
    if (nread >= kMaxLength) {
      _close(this);
      throw new RangeError(
        "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes"
      );
    }
    let buf = Buffer.concat(buffers, nread);
    _close(this);
    return buf;
  };
  util2.inherits(Inflate, zlib2.Inflate);
  function zlibBufferSync(engine, buffer) {
    if (typeof buffer === "string") {
      buffer = Buffer.from(buffer);
    }
    if (!(buffer instanceof Buffer)) {
      throw new TypeError("Not a string or buffer");
    }
    let flushFlag = engine._finishFlushFlag;
    if (flushFlag == null) {
      flushFlag = zlib2.Z_FINISH;
    }
    return engine._processChunk(buffer, flushFlag);
  }
  function inflateSync2(buffer, opts) {
    return zlibBufferSync(new Inflate(opts), buffer);
  }
  module.exports = exports = inflateSync2;
  exports.Inflate = Inflate;
  exports.createInflate = createInflate;
  exports.inflateSync = inflateSync2;
})(syncInflate, syncInflate.exports);
var syncInflateExports = syncInflate.exports;
var syncReader = { exports: {} };
let SyncReader$2 = syncReader.exports = function(buffer) {
  this._buffer = buffer;
  this._reads = [];
};
SyncReader$2.prototype.read = function(length, callback) {
  this._reads.push({
    length: Math.abs(length),
    // if length < 0 then at most this length
    allowLess: length < 0,
    func: callback
  });
};
SyncReader$2.prototype.process = function() {
  while (this._reads.length > 0 && this._buffer.length) {
    let read = this._reads[0];
    if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
      this._reads.shift();
      let buf = this._buffer;
      this._buffer = buf.slice(read.length);
      read.func.call(this, buf.slice(0, read.length));
    } else {
      break;
    }
  }
  if (this._reads.length > 0) {
    return new Error("There are some read requests waitng on finished stream");
  }
  if (this._buffer.length > 0) {
    return new Error("unrecognised content at end of stream");
  }
};
var syncReaderExports = syncReader.exports;
var filterParseSync = {};
let SyncReader$1 = syncReaderExports;
let Filter = filterParseExports;
filterParseSync.process = function(inBuffer, bitmapInfo) {
  let outBuffers = [];
  let reader = new SyncReader$1(inBuffer);
  let filter2 = new Filter(bitmapInfo, {
    read: reader.read.bind(reader),
    write: function(bufferPart) {
      outBuffers.push(bufferPart);
    },
    complete: function() {
    }
  });
  filter2.start();
  reader.process();
  return Buffer.concat(outBuffers);
};
let hasSyncZlib$1 = true;
let zlib$1 = require$$1$3;
let inflateSync$1 = syncInflateExports;
if (!zlib$1.deflateSync) {
  hasSyncZlib$1 = false;
}
let SyncReader = syncReaderExports;
let FilterSync = filterParseSync;
let Parser$1 = parserExports;
let bitmapper = bitmapper$2;
let formatNormaliser = formatNormaliser$2;
var parserSync = function(buffer, options2) {
  if (!hasSyncZlib$1) {
    throw new Error(
      "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
    );
  }
  let err2;
  function handleError(_err_) {
    err2 = _err_;
  }
  let metaData;
  function handleMetaData(_metaData_) {
    metaData = _metaData_;
  }
  function handleTransColor(transColor) {
    metaData.transColor = transColor;
  }
  function handlePalette(palette) {
    metaData.palette = palette;
  }
  function handleSimpleTransparency() {
    metaData.alpha = true;
  }
  let gamma;
  function handleGamma(_gamma_) {
    gamma = _gamma_;
  }
  let inflateDataList = [];
  function handleInflateData(inflatedData2) {
    inflateDataList.push(inflatedData2);
  }
  let reader = new SyncReader(buffer);
  let parser2 = new Parser$1(options2, {
    read: reader.read.bind(reader),
    error: handleError,
    metadata: handleMetaData,
    gamma: handleGamma,
    palette: handlePalette,
    transColor: handleTransColor,
    inflateData: handleInflateData,
    simpleTransparency: handleSimpleTransparency
  });
  parser2.start();
  reader.process();
  if (err2) {
    throw err2;
  }
  let inflateData = Buffer.concat(inflateDataList);
  inflateDataList.length = 0;
  let inflatedData;
  if (metaData.interlace) {
    inflatedData = zlib$1.inflateSync(inflateData);
  } else {
    let rowSize = (metaData.width * metaData.bpp * metaData.depth + 7 >> 3) + 1;
    let imageSize = rowSize * metaData.height;
    inflatedData = inflateSync$1(inflateData, {
      chunkSize: imageSize,
      maxLength: imageSize
    });
  }
  inflateData = null;
  if (!inflatedData || !inflatedData.length) {
    throw new Error("bad png - invalid inflate data response");
  }
  let unfilteredData = FilterSync.process(inflatedData, metaData);
  inflateData = null;
  let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
  unfilteredData = null;
  let normalisedBitmapData = formatNormaliser(bitmapData, metaData);
  metaData.data = normalisedBitmapData;
  metaData.gamma = gamma || 0;
  return metaData;
};
let hasSyncZlib = true;
let zlib = require$$1$3;
if (!zlib.deflateSync) {
  hasSyncZlib = false;
}
let constants = constants$5;
let Packer$1 = packerExports;
var packerSync = function(metaData, opt) {
  if (!hasSyncZlib) {
    throw new Error(
      "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
    );
  }
  let options2 = opt || {};
  let packer2 = new Packer$1(options2);
  let chunks = [];
  chunks.push(Buffer.from(constants.PNG_SIGNATURE));
  chunks.push(packer2.packIHDR(metaData.width, metaData.height));
  if (metaData.gamma) {
    chunks.push(packer2.packGAMA(metaData.gamma));
  }
  let filteredData = packer2.filterData(
    metaData.data,
    metaData.width,
    metaData.height
  );
  let compressedData = zlib.deflateSync(
    filteredData,
    packer2.getDeflateOptions()
  );
  filteredData = null;
  if (!compressedData || !compressedData.length) {
    throw new Error("bad png - invalid compressed data response");
  }
  chunks.push(packer2.packIDAT(compressedData));
  chunks.push(packer2.packIEND());
  return Buffer.concat(chunks);
};
let parse = parserSync;
let pack = packerSync;
pngSync.read = function(buffer, options2) {
  return parse(buffer, options2 || {});
};
pngSync.write = function(png2, options2) {
  return pack(png2, options2);
};
let util$j = require$$0$2;
let Stream = require$$1$2;
let Parser = parserAsyncExports;
let Packer = packerAsyncExports;
let PNGSync = pngSync;
let PNG = png.PNG = function(options2) {
  Stream.call(this);
  options2 = options2 || {};
  this.width = options2.width | 0;
  this.height = options2.height | 0;
  this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
  if (options2.fill && this.data) {
    this.data.fill(0);
  }
  this.gamma = 0;
  this.readable = this.writable = true;
  this._parser = new Parser(options2);
  this._parser.on("error", this.emit.bind(this, "error"));
  this._parser.on("close", this._handleClose.bind(this));
  this._parser.on("metadata", this._metadata.bind(this));
  this._parser.on("gamma", this._gamma.bind(this));
  this._parser.on(
    "parsed",
    (function(data) {
      this.data = data;
      this.emit("parsed", data);
    }).bind(this)
  );
  this._packer = new Packer(options2);
  this._packer.on("data", this.emit.bind(this, "data"));
  this._packer.on("end", this.emit.bind(this, "end"));
  this._parser.on("close", this._handleClose.bind(this));
  this._packer.on("error", this.emit.bind(this, "error"));
};
util$j.inherits(PNG, Stream);
PNG.sync = PNGSync;
PNG.prototype.pack = function() {
  if (!this.data || !this.data.length) {
    this.emit("error", "No data provided");
    return this;
  }
  process.nextTick(
    (function() {
      this._packer.pack(this.data, this.width, this.height, this.gamma);
    }).bind(this)
  );
  return this;
};
PNG.prototype.parse = function(data, callback) {
  if (callback) {
    let onParsed, onError;
    onParsed = (function(parsedData) {
      this.removeListener("error", onError);
      this.data = parsedData;
      callback(null, this);
    }).bind(this);
    onError = (function(err2) {
      this.removeListener("parsed", onParsed);
      callback(err2, null);
    }).bind(this);
    this.once("parsed", onParsed);
    this.once("error", onError);
  }
  this.end(data);
  return this;
};
PNG.prototype.write = function(data) {
  this._parser.write(data);
  return true;
};
PNG.prototype.end = function(data) {
  this._parser.end(data);
};
PNG.prototype._metadata = function(metadata) {
  this.width = metadata.width;
  this.height = metadata.height;
  this.emit("metadata", metadata);
};
PNG.prototype._gamma = function(gamma) {
  this.gamma = gamma;
};
PNG.prototype._handleClose = function() {
  if (!this._parser.writable && !this._packer.readable) {
    this.emit("close");
  }
};
PNG.bitblt = function(src2, dst, srcX, srcY, width, height, deltaX, deltaY) {
  srcX |= 0;
  srcY |= 0;
  width |= 0;
  height |= 0;
  deltaX |= 0;
  deltaY |= 0;
  if (srcX > src2.width || srcY > src2.height || srcX + width > src2.width || srcY + height > src2.height) {
    throw new Error("bitblt reading outside image");
  }
  if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
    throw new Error("bitblt writing outside image");
  }
  for (let y = 0; y < height; y++) {
    src2.data.copy(
      dst.data,
      (deltaY + y) * dst.width + deltaX << 2,
      (srcY + y) * src2.width + srcX << 2,
      (srcY + y) * src2.width + srcX + width << 2
    );
  }
};
PNG.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) {
  PNG.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
  return this;
};
PNG.adjustGamma = function(src2) {
  if (src2.gamma) {
    for (let y = 0; y < src2.height; y++) {
      for (let x = 0; x < src2.width; x++) {
        let idx = src2.width * y + x << 2;
        for (let i = 0; i < 3; i++) {
          let sample = src2.data[idx + i] / 255;
          sample = Math.pow(sample, 1 / 2.2 / src2.gamma);
          src2.data[idx + i] = Math.round(sample * 255);
        }
      }
    }
    src2.gamma = 0;
  }
};
PNG.prototype.adjustGamma = function() {
  PNG.adjustGamma(this);
};
var utils = {};
(function(exports) {
  function hex2rgba(hex) {
    if (typeof hex === "number") {
      hex = hex.toString();
    }
    if (typeof hex !== "string") {
      throw new Error("Color should be defined as hex string");
    }
    let hexCode = hex.slice().replace("#", "").split("");
    if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
      throw new Error("Invalid hex color: " + hex);
    }
    if (hexCode.length === 3 || hexCode.length === 4) {
      hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
        return [c, c];
      }));
    }
    if (hexCode.length === 6) hexCode.push("F", "F");
    const hexValue = parseInt(hexCode.join(""), 16);
    return {
      r: hexValue >> 24 & 255,
      g: hexValue >> 16 & 255,
      b: hexValue >> 8 & 255,
      a: hexValue & 255,
      hex: "#" + hexCode.slice(0, 6).join("")
    };
  }
  exports.getOptions = function getOptions(options2) {
    if (!options2) options2 = {};
    if (!options2.color) options2.color = {};
    const margin = typeof options2.margin === "undefined" || options2.margin === null || options2.margin < 0 ? 4 : options2.margin;
    const width = options2.width && options2.width >= 21 ? options2.width : void 0;
    const scale = options2.scale || 4;
    return {
      width,
      scale: width ? 4 : scale,
      margin,
      color: {
        dark: hex2rgba(options2.color.dark || "#000000ff"),
        light: hex2rgba(options2.color.light || "#ffffffff")
      },
      type: options2.type,
      rendererOpts: options2.rendererOpts || {}
    };
  };
  exports.getScale = function getScale(qrSize, opts) {
    return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
  };
  exports.getImageWidth = function getImageWidth(qrSize, opts) {
    const scale = exports.getScale(qrSize, opts);
    return Math.floor((qrSize + opts.margin * 2) * scale);
  };
  exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
    const size = qr.modules.size;
    const data = qr.modules.data;
    const scale = exports.getScale(size, opts);
    const symbolSize = Math.floor((size + opts.margin * 2) * scale);
    const scaledMargin = opts.margin * scale;
    const palette = [opts.color.light, opts.color.dark];
    for (let i = 0; i < symbolSize; i++) {
      for (let j = 0; j < symbolSize; j++) {
        let posDst = (i * symbolSize + j) * 4;
        let pxColor = opts.color.light;
        if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
          const iSrc = Math.floor((i - scaledMargin) / scale);
          const jSrc = Math.floor((j - scaledMargin) / scale);
          pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
        }
        imgData[posDst++] = pxColor.r;
        imgData[posDst++] = pxColor.g;
        imgData[posDst++] = pxColor.b;
        imgData[posDst] = pxColor.a;
      }
    }
  };
})(utils);
(function(exports) {
  const fs2 = require$$1$1;
  const PNG2 = png.PNG;
  const Utils2 = utils;
  exports.render = function render3(qrData, options2) {
    const opts = Utils2.getOptions(options2);
    const pngOpts = opts.rendererOpts;
    const size = Utils2.getImageWidth(qrData.modules.size, opts);
    pngOpts.width = size;
    pngOpts.height = size;
    const pngImage = new PNG2(pngOpts);
    Utils2.qrToImageData(pngImage.data, qrData, opts);
    return pngImage;
  };
  exports.renderToDataURL = function renderToDataURL(qrData, options2, cb) {
    if (typeof cb === "undefined") {
      cb = options2;
      options2 = void 0;
    }
    exports.renderToBuffer(qrData, options2, function(err2, output) {
      if (err2) cb(err2);
      let url = "data:image/png;base64,";
      url += output.toString("base64");
      cb(null, url);
    });
  };
  exports.renderToBuffer = function renderToBuffer(qrData, options2, cb) {
    if (typeof cb === "undefined") {
      cb = options2;
      options2 = void 0;
    }
    const png2 = exports.render(qrData, options2);
    const buffer = [];
    png2.on("error", cb);
    png2.on("data", function(data) {
      buffer.push(data);
    });
    png2.on("end", function() {
      cb(null, Buffer.concat(buffer));
    });
    png2.pack();
  };
  exports.renderToFile = function renderToFile(path2, qrData, options2, cb) {
    if (typeof cb === "undefined") {
      cb = options2;
      options2 = void 0;
    }
    let called = false;
    const done = (...args) => {
      if (called) return;
      called = true;
      cb.apply(null, args);
    };
    const stream = fs2.createWriteStream(path2);
    stream.on("error", done);
    stream.on("close", done);
    exports.renderToFileStream(stream, qrData, options2);
  };
  exports.renderToFileStream = function renderToFileStream(stream, qrData, options2) {
    const png2 = exports.render(qrData, options2);
    png2.pack().pipe(stream);
  };
})(png$1);
var utf8 = {};
(function(exports) {
  const Utils2 = utils;
  const BLOCK_CHAR = {
    WW: " ",
    WB: "▄",
    BB: "█",
    BW: "▀"
  };
  const INVERTED_BLOCK_CHAR = {
    BB: " ",
    BW: "▄",
    WW: "█",
    WB: "▀"
  };
  function getBlockChar(top, bottom, blocks) {
    if (top && bottom) return blocks.BB;
    if (top && !bottom) return blocks.BW;
    if (!top && bottom) return blocks.WB;
    return blocks.WW;
  }
  exports.render = function(qrData, options2, cb) {
    const opts = Utils2.getOptions(options2);
    let blocks = BLOCK_CHAR;
    if (opts.color.dark.hex === "#ffffff" || opts.color.light.hex === "#000000") {
      blocks = INVERTED_BLOCK_CHAR;
    }
    const size = qrData.modules.size;
    const data = qrData.modules.data;
    let output = "";
    let hMargin = Array(size + opts.margin * 2 + 1).join(blocks.WW);
    hMargin = Array(opts.margin / 2 + 1).join(hMargin + "\n");
    const vMargin = Array(opts.margin + 1).join(blocks.WW);
    output += hMargin;
    for (let i = 0; i < size; i += 2) {
      output += vMargin;
      for (let j = 0; j < size; j++) {
        const topModule = data[i * size + j];
        const bottomModule = data[(i + 1) * size + j];
        output += getBlockChar(topModule, bottomModule, blocks);
      }
      output += vMargin + "\n";
    }
    output += hMargin.slice(0, -1);
    if (typeof cb === "function") {
      cb(null, output);
    }
    return output;
  };
  exports.renderToFile = function renderToFile(path2, qrData, options2, cb) {
    if (typeof cb === "undefined") {
      cb = options2;
      options2 = void 0;
    }
    const fs2 = require$$1$1;
    const utf82 = exports.render(qrData, options2);
    fs2.writeFile(path2, utf82, cb);
  };
})(utf8);
var terminal$1 = {};
var terminal = {};
terminal.render = function(qrData, options2, cb) {
  const size = qrData.modules.size;
  const data = qrData.modules.data;
  const black = "\x1B[40m  \x1B[0m";
  const white = "\x1B[47m  \x1B[0m";
  let output = "";
  const hMargin = Array(size + 3).join(white);
  const vMargin = Array(2).join(white);
  output += hMargin + "\n";
  for (let i = 0; i < size; ++i) {
    output += white;
    for (let j = 0; j < size; j++) {
      output += data[i * size + j] ? black : white;
    }
    output += vMargin + "\n";
  }
  output += hMargin + "\n";
  if (typeof cb === "function") {
    cb(null, output);
  }
  return output;
};
var terminalSmall = {};
const backgroundWhite = "\x1B[47m";
const backgroundBlack = "\x1B[40m";
const foregroundWhite = "\x1B[37m";
const foregroundBlack = "\x1B[30m";
const reset = "\x1B[0m";
const lineSetupNormal = backgroundWhite + foregroundBlack;
const lineSetupInverse = backgroundBlack + foregroundWhite;
const createPalette = function(lineSetup, foregroundWhite2, foregroundBlack2) {
  return {
    // 1 ... white, 2 ... black, 0 ... transparent (default)
    "00": reset + " " + lineSetup,
    "01": reset + foregroundWhite2 + "▄" + lineSetup,
    "02": reset + foregroundBlack2 + "▄" + lineSetup,
    10: reset + foregroundWhite2 + "▀" + lineSetup,
    11: " ",
    12: "▄",
    20: reset + foregroundBlack2 + "▀" + lineSetup,
    21: "▀",
    22: "█"
  };
};
const mkCodePixel = function(modules, size, x, y) {
  const sizePlus = size + 1;
  if (x >= sizePlus || y >= sizePlus || y < -1 || x < -1) return "0";
  if (x >= size || y >= size || y < 0 || x < 0) return "1";
  const idx = y * size + x;
  return modules[idx] ? "2" : "1";
};
const mkCode = function(modules, size, x, y) {
  return mkCodePixel(modules, size, x, y) + mkCodePixel(modules, size, x, y + 1);
};
terminalSmall.render = function(qrData, options2, cb) {
  const size = qrData.modules.size;
  const data = qrData.modules.data;
  const inverse = !!(options2 && options2.inverse);
  const lineSetup = options2 && options2.inverse ? lineSetupInverse : lineSetupNormal;
  const white = inverse ? foregroundBlack : foregroundWhite;
  const black = inverse ? foregroundWhite : foregroundBlack;
  const palette = createPalette(lineSetup, white, black);
  const newLine = reset + "\n" + lineSetup;
  let output = lineSetup;
  for (let y = -1; y < size + 1; y += 2) {
    for (let x = -1; x < size; x++) {
      output += palette[mkCode(data, size, x, y)];
    }
    output += palette[mkCode(data, size, size, y)] + newLine;
  }
  output += reset;
  if (typeof cb === "function") {
    cb(null, output);
  }
  return output;
};
const big = terminal;
const small = terminalSmall;
terminal$1.render = function(qrData, options2, cb) {
  if (options2 && options2.small) {
    return small.render(qrData, options2, cb);
  }
  return big.render(qrData, options2, cb);
};
var svg = {};
var svgTag = {};
const Utils = utils;
function getColorAttrib(color, attrib) {
  const alpha = color.a / 255;
  const str = attrib + '="' + color.hex + '"';
  return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
}
function svgCmd(cmd, x, y) {
  let str = cmd + x;
  if (typeof y !== "undefined") str += " " + y;
  return str;
}
function qrToPath(data, size, margin) {
  let path2 = "";
  let moveBy = 0;
  let newRow = false;
  let lineLength = 0;
  for (let i = 0; i < data.length; i++) {
    const col = Math.floor(i % size);
    const row = Math.floor(i / size);
    if (!col && !newRow) newRow = true;
    if (data[i]) {
      lineLength++;
      if (!(i > 0 && col > 0 && data[i - 1])) {
        path2 += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
        moveBy = 0;
        newRow = false;
      }
      if (!(col + 1 < size && data[i + 1])) {
        path2 += svgCmd("h", lineLength);
        lineLength = 0;
      }
    } else {
      moveBy++;
    }
  }
  return path2;
}
svgTag.render = function render(qrData, options2, cb) {
  const opts = Utils.getOptions(options2);
  const size = qrData.modules.size;
  const data = qrData.modules.data;
  const qrcodesize = size + opts.margin * 2;
  const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
  const path2 = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
  const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
  const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
  const svgTag2 = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path2 + "</svg>\n";
  if (typeof cb === "function") {
    cb(null, svgTag2);
  }
  return svgTag2;
};
(function(exports) {
  const svgTagRenderer = svgTag;
  exports.render = svgTagRenderer.render;
  exports.renderToFile = function renderToFile(path2, qrData, options2, cb) {
    if (typeof cb === "undefined") {
      cb = options2;
      options2 = void 0;
    }
    const fs2 = require$$1$1;
    const svgTag2 = exports.render(qrData, options2);
    const xmlStr = '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' + svgTag2;
    fs2.writeFile(path2, xmlStr, cb);
  };
})(svg);
var browser$1 = {};
var canvas = {};
var hasRequiredCanvas;
function requireCanvas() {
  if (hasRequiredCanvas) return canvas;
  hasRequiredCanvas = 1;
  (function(exports) {
    const Utils2 = utils;
    function clearCanvas(ctx, canvas2, size) {
      ctx.clearRect(0, 0, canvas2.width, canvas2.height);
      if (!canvas2.style) canvas2.style = {};
      canvas2.height = size;
      canvas2.width = size;
      canvas2.style.height = size + "px";
      canvas2.style.width = size + "px";
    }
    function getCanvasElement() {
      try {
        return document.createElement("canvas");
      } catch (e) {
        throw new Error("You need to specify a canvas element");
      }
    }
    exports.render = function render3(qrData, canvas2, options2) {
      let opts = options2;
      let canvasEl = canvas2;
      if (typeof opts === "undefined" && (!canvas2 || !canvas2.getContext)) {
        opts = canvas2;
        canvas2 = void 0;
      }
      if (!canvas2) {
        canvasEl = getCanvasElement();
      }
      opts = Utils2.getOptions(opts);
      const size = Utils2.getImageWidth(qrData.modules.size, opts);
      const ctx = canvasEl.getContext("2d");
      const image = ctx.createImageData(size, size);
      Utils2.qrToImageData(image.data, qrData, opts);
      clearCanvas(ctx, canvasEl, size);
      ctx.putImageData(image, 0, 0);
      return canvasEl;
    };
    exports.renderToDataURL = function renderToDataURL(qrData, canvas2, options2) {
      let opts = options2;
      if (typeof opts === "undefined" && (!canvas2 || !canvas2.getContext)) {
        opts = canvas2;
        canvas2 = void 0;
      }
      if (!opts) opts = {};
      const canvasEl = exports.render(qrData, canvas2, opts);
      const type = opts.type || "image/png";
      const rendererOpts = opts.rendererOpts || {};
      return canvasEl.toDataURL(type, rendererOpts.quality);
    };
  })(canvas);
  return canvas;
}
var hasRequiredBrowser$1;
function requireBrowser$1() {
  if (hasRequiredBrowser$1) return browser$1;
  hasRequiredBrowser$1 = 1;
  const canPromise2 = canPromise$1;
  const QRCode2 = qrcode;
  const CanvasRenderer = requireCanvas();
  const SvgRenderer2 = svgTag;
  function renderCanvas(renderFunc, canvas2, text, opts, cb) {
    const args = [].slice.call(arguments, 1);
    const argsNum = args.length;
    const isLastArgCb = typeof args[argsNum - 1] === "function";
    if (!isLastArgCb && !canPromise2()) {
      throw new Error("Callback required as last argument");
    }
    if (isLastArgCb) {
      if (argsNum < 2) {
        throw new Error("Too few arguments provided");
      }
      if (argsNum === 2) {
        cb = text;
        text = canvas2;
        canvas2 = opts = void 0;
      } else if (argsNum === 3) {
        if (canvas2.getContext && typeof cb === "undefined") {
          cb = opts;
          opts = void 0;
        } else {
          cb = opts;
          opts = text;
          text = canvas2;
          canvas2 = void 0;
        }
      }
    } else {
      if (argsNum < 1) {
        throw new Error("Too few arguments provided");
      }
      if (argsNum === 1) {
        text = canvas2;
        canvas2 = opts = void 0;
      } else if (argsNum === 2 && !canvas2.getContext) {
        opts = text;
        text = canvas2;
        canvas2 = void 0;
      }
      return new Promise(function(resolve, reject) {
        try {
          const data = QRCode2.create(text, opts);
          resolve(renderFunc(data, canvas2, opts));
        } catch (e) {
          reject(e);
        }
      });
    }
    try {
      const data = QRCode2.create(text, opts);
      cb(null, renderFunc(data, canvas2, opts));
    } catch (e) {
      cb(e);
    }
  }
  browser$1.create = QRCode2.create;
  browser$1.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
  browser$1.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
  browser$1.toString = renderCanvas.bind(null, function(data, _, opts) {
    return SvgRenderer2.render(data, opts);
  });
  return browser$1;
}
const canPromise = canPromise$1;
const QRCode$1 = qrcode;
const PngRenderer = png$1;
const Utf8Renderer = utf8;
const TerminalRenderer = terminal$1;
const SvgRenderer = svg;
function checkParams(text, opts, cb) {
  if (typeof text === "undefined") {
    throw new Error("String required as first argument");
  }
  if (typeof cb === "undefined") {
    cb = opts;
    opts = {};
  }
  if (typeof cb !== "function") {
    if (!canPromise()) {
      throw new Error("Callback required as last argument");
    } else {
      opts = cb || {};
      cb = null;
    }
  }
  return {
    opts,
    cb
  };
}
function getTypeFromFilename(path2) {
  return path2.slice((path2.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
}
function getRendererFromType(type) {
  switch (type) {
    case "svg":
      return SvgRenderer;
    case "txt":
    case "utf8":
      return Utf8Renderer;
    case "png":
    case "image/png":
    default:
      return PngRenderer;
  }
}
function getStringRendererFromType(type) {
  switch (type) {
    case "svg":
      return SvgRenderer;
    case "terminal":
      return TerminalRenderer;
    case "utf8":
    default:
      return Utf8Renderer;
  }
}
function render2(renderFunc, text, params) {
  if (!params.cb) {
    return new Promise(function(resolve, reject) {
      try {
        const data = QRCode$1.create(text, params.opts);
        return renderFunc(data, params.opts, function(err2, data2) {
          return err2 ? reject(err2) : resolve(data2);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  try {
    const data = QRCode$1.create(text, params.opts);
    return renderFunc(data, params.opts, params.cb);
  } catch (e) {
    params.cb(e);
  }
}
server.create = QRCode$1.create;
server.toCanvas = requireBrowser$1().toCanvas;
server.toString = function toString(text, opts, cb) {
  const params = checkParams(text, opts, cb);
  const type = params.opts ? params.opts.type : void 0;
  const renderer = getStringRendererFromType(type);
  return render2(renderer.render, text, params);
};
server.toDataURL = function toDataURL(text, opts, cb) {
  const params = checkParams(text, opts, cb);
  const renderer = getRendererFromType(params.opts.type);
  return render2(renderer.renderToDataURL, text, params);
};
server.toBuffer = function toBuffer(text, opts, cb) {
  const params = checkParams(text, opts, cb);
  const renderer = getRendererFromType(params.opts.type);
  return render2(renderer.renderToBuffer, text, params);
};
server.toFile = function toFile(path2, text, opts, cb) {
  if (typeof path2 !== "string" || !(typeof text === "string" || typeof text === "object")) {
    throw new Error("Invalid argument");
  }
  if (arguments.length < 3 && !canPromise()) {
    throw new Error("Too few arguments provided");
  }
  const params = checkParams(text, opts, cb);
  const type = params.opts.type || getTypeFromFilename(path2);
  const renderer = getRendererFromType(type);
  const renderToFile = renderer.renderToFile.bind(null, path2);
  return render2(renderToFile, text, params);
};
server.toFileStream = function toFileStream(stream, text, opts) {
  if (arguments.length < 2) {
    throw new Error("Too few arguments provided");
  }
  const params = checkParams(text, opts, stream.emit.bind(stream, "error"));
  const renderer = getRendererFromType("png");
  const renderToFileStream = renderer.renderToFileStream.bind(null, stream);
  render2(renderToFileStream, text, params);
};
var lib$1 = server;
const QRCode = /* @__PURE__ */ getDefaultExportFromCjs(lib$1);
function writeJson(file, value) {
  fs$c.mkdirSync(path$6.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    fs$c.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 384 });
    fs$c.renameSync(temporary, file);
  } finally {
    fs$c.rmSync(temporary, { force: true });
  }
}
function createPreferences(directory) {
  const file = path$6.join(directory, "desktop-config.json");
  let closeBehavior = "quit";
  try {
    if (JSON.parse(fs$c.readFileSync(file, "utf8")).closeBehavior === "tray") closeBehavior = "tray";
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("[desktop] 配置读取失败，使用关闭时退出", error);
  }
  return {
    get: () => closeBehavior,
    set(value) {
      if (value !== "quit" && value !== "tray") throw new Error("无效的关闭行为");
      writeJson(file, { closeBehavior: value });
      closeBehavior = value;
    }
  };
}
const shouldHideOnClose = (behavior, quitting2, trayAvailable) => behavior === "tray" && !quitting2 && trayAvailable;
const WECHAT_BASE = "https://ilinkai.weixin.qq.com";
function officialBase(input) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !(url.hostname === "weixin.qq.com" || url.hostname.endsWith(".weixin.qq.com"))) throw new Error("微信返回了不受支持的服务地址");
  return url.origin;
}
class WechatError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
function createWechatRequest(fetcher) {
  return async (base, endpoint, body, token, signal) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), endpoint.includes("getupdates") || endpoint.includes("get_qrcode_status") ? 4e4 : 15e3);
    const abort = () => controller.abort();
    if (signal == null ? void 0 : signal.aborted) controller.abort();
    else signal == null ? void 0 : signal.addEventListener("abort", abort, { once: true });
    const headers = { "iLink-App-Id": "bot", "iLink-App-ClientVersion": String(2 << 16 | 4 << 8 | 8) };
    if (body) Object.assign(headers, {
      "Content-Type": "application/json",
      AuthorizationType: "ilink_bot_token",
      "X-WECHAT-UIN": Buffer.from(String(node_crypto.randomBytes(4).readUInt32BE())).toString("base64"),
      ...token ? { Authorization: `Bearer ${token}` } : {}
    });
    try {
      const response = await fetcher(`${officialBase(base)}/ilink/bot/${endpoint}`, {
        method: body ? "POST" : "GET",
        headers,
        redirect: "error",
        signal: controller.signal,
        ...body ? { body: JSON.stringify({ ...body, base_info: { channel_version: "2.4.8", bot_agent: "wttch-hub/1.0.0" } }) } : {}
      });
      if (!response.ok) throw new WechatError(`微信服务 HTTP ${response.status}`);
      const value = await response.json();
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new WechatError("微信响应格式错误");
      const code = value.errcode || value.ret;
      if (code) throw new WechatError(code === -14 ? "微信登录已失效，请重新扫码" : `微信拒绝请求（${code}），请检查会话状态或重新向机器人发一条消息`, code);
      return value;
    } catch (error) {
      if (error instanceof WechatError) throw error;
      throw new WechatError((signal == null ? void 0 : signal.aborted) ? "操作已取消" : "微信网络请求失败或超时，请稍后重试");
    } finally {
      clearTimeout(timeout);
      signal == null ? void 0 : signal.removeEventListener("abort", abort);
    }
  };
}
const DATA_KEYS = ["wttch-hub:plugin-runtime:v1", "wttch-hub:plugin-settings", "wttch-hub:navigation:v1", "wttch-hub:home-widgets", "folderart-config-v2", "wttch:packetdraw:text"];
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function validateJson(value) {
  if (Array.isArray(value)) {
    value.forEach(validateJson);
    return;
  }
  if (isRecord(value)) for (const [key, item] of Object.entries(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("数据包含不支持的属性名");
    validateJson(item);
  }
}
function validateBackup(input) {
  if (!isRecord(input) || input.format !== "wttch-hub-backup" || input.version !== 1 || typeof input.createdAt !== "string" || !["quit", "tray"].includes(String(input.closeBehavior)) || !isRecord(input.entries)) throw new Error("不是受支持的工作台备份");
  if (new TextEncoder().encode(JSON.stringify(input)).length > MAX_BACKUP_BYTES) throw new Error("备份超过 10 MB 限制");
  for (const [key, raw] of Object.entries(input.entries)) {
    if (!DATA_KEYS.includes(key) || typeof raw !== "string") throw new Error("备份含有未登记的数据项");
    if (key === "wttch:packetdraw:text") continue;
    const value = JSON.parse(raw);
    validateJson(value);
    if (key === "wttch-hub:home-widgets") {
      if (!Array.isArray(value)) throw new Error("Widget 布局格式无效");
    } else if (!isRecord(value)) throw new Error("配置格式无效");
    if (key === DATA_KEYS[0] || key === DATA_KEYS[1]) {
      const runtime = value;
      for (const field of ["enabled", "values", "storage"]) {
        if (runtime[field] !== void 0 && !isRecord(runtime[field])) throw new Error("插件数据格式无效");
      }
      for (const flag of Object.values(runtime.enabled ?? {})) if (typeof flag !== "boolean") throw new Error("插件启用状态无效");
      for (const item of Object.values(runtime.storage ?? {})) if (!isRecord(item)) throw new Error("插件存储格式无效");
      for (const item of Object.values(runtime.values ?? {})) {
        if (!isRecord(item) || Object.values(item).some((v) => !["boolean", "number", "string"].includes(typeof v))) throw new Error("插件设置格式无效");
      }
    }
  }
  return { format: "wttch-hub-backup", version: 1, createdAt: input.createdAt, closeBehavior: input.closeBehavior, entries: { ...input.entries } };
}
const emptyWechat = () => ({ enabled: false, peers: {}, cursor: "", rules: [] });
const safeId = (value) => typeof value === "string" && value.length > 0 && value.length <= 256 && !["__proto__", "constructor", "prototype"].includes(value);
const validTopic = (value) => typeof value === "string" && /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/.test(value) && value.length <= 160;
function parseWechatStored(value) {
  if (!isRecord(value) || typeof value.enabled !== "boolean" || !isRecord(value.peers) || !Array.isArray(value.rules) || typeof value.cursor !== "string") throw new Error("微信本地配置格式错误");
  validateJson(value);
  if (value.account && (!isRecord(value.account) || !safeId(value.account.id) || typeof value.account.token !== "string" || !value.account.token || typeof value.account.base !== "string")) throw new Error("微信凭据格式错误");
  if (value.account) officialBase(value.account.base);
  for (const [id, peer] of Object.entries(value.peers)) if (!safeId(id) || !isRecord(peer) || typeof peer.context !== "string" || typeof peer.seenAt !== "string") throw new Error("微信会话格式错误");
  for (const rule of value.rules) if (!isRecord(rule) || !safeId(rule.id) || !validTopic(rule.topic) || !safeId(rule.peerId) || typeof rule.enabled !== "boolean") throw new Error("微信订阅格式错误");
  return value;
}
function createWechatService(deps) {
  let stored = deps.initial;
  let connection = "disconnected";
  let error = "";
  let login;
  let loginSession;
  let generation = 0;
  let loginController;
  let updateController;
  let sendController = new AbortController();
  let loginTimer;
  let updateTimer;
  let services2 = [];
  const deliveries = [];
  const seen = /* @__PURE__ */ new Set();
  let tail = Promise.resolve();
  let queued = 0;
  const notify = () => deps.changed();
  const commit = (next) => {
    deps.save(next);
    stored = next;
  };
  const fail = (reason) => {
    error = reason instanceof Error ? reason.message : "微信操作失败";
    connection = "error";
    notify();
  };
  const stopLogin = () => {
    clearTimeout(loginTimer);
    loginController == null ? void 0 : loginController.abort();
    loginController = void 0;
    loginSession = void 0;
    login = void 0;
  };
  const stopUpdates = () => {
    clearTimeout(updateTimer);
    updateController == null ? void 0 : updateController.abort();
    updateController = void 0;
  };
  const cancelSends = () => {
    sendController.abort();
    sendController = new AbortController();
    generation++;
  };
  const status = () => {
    var _a2;
    return {
      configured: Boolean(stored.account),
      enabled: stored.enabled,
      connection,
      accountId: (_a2 = stored.account) == null ? void 0 : _a2.id,
      ...error ? { error } : {},
      login: login ? { ...login } : void 0,
      peers: Object.entries(stored.peers).map(([id, peer]) => ({ id, seenAt: peer.seenAt })),
      rules: stored.rules.map((rule) => ({ ...rule })),
      services: services2.map((service) => ({ ...service })),
      deliveries: deliveries.map((delivery) => ({ ...delivery }))
    };
  };
  const receive = async () => {
    if (!stored.account || !stored.enabled) return;
    const revision = generation;
    const account = stored.account;
    const controller = new AbortController();
    updateController = controller;
    let delay = 1e3;
    try {
      const response = await deps.request(account.base, "getupdates", { get_updates_buf: stored.cursor }, account.token, controller.signal);
      if (revision !== generation || controller.signal.aborted) return;
      const peers = { ...stored.peers };
      for (const message of response.msgs ?? []) {
        if (message.message_type !== 1 || !safeId(message.from_user_id) || typeof message.context_token !== "string" || !message.context_token) continue;
        if (!(message.from_user_id in peers) && Object.keys(peers).length >= 100) continue;
        peers[message.from_user_id] = { context: message.context_token, seenAt: (/* @__PURE__ */ new Date()).toISOString() };
      }
      const next = { ...stored, peers, cursor: typeof response.get_updates_buf === "string" ? response.get_updates_buf : stored.cursor };
      if (JSON.stringify(next) !== JSON.stringify(stored)) commit(next);
      connection = "connected";
      error = "";
      notify();
    } catch (reason) {
      if (revision !== generation || controller.signal.aborted) return;
      fail(reason);
      delay = 1e4;
      if (reason instanceof WechatError && reason.code === -14) return;
    } finally {
      if (updateController === controller) updateController = void 0;
    }
    if (revision === generation && stored.enabled) updateTimer = setTimeout(() => {
      void receive();
    }, delay);
  };
  const startReceive = () => {
    stopUpdates();
    if (stored.account && stored.enabled) {
      connection = "connecting";
      void receive();
    }
  };
  const pollLogin = async () => {
    const session = loginSession;
    if (!session) return;
    if (Date.now() - session.started > 5 * 6e4) {
      stopLogin();
      login = { status: "expired", message: "二维码已过期，请重新扫码" };
      notify();
      return;
    }
    const controller = new AbortController();
    loginController = controller;
    try {
      const response = await deps.request(session.base, `get_qrcode_status?qrcode=${encodeURIComponent(session.code)}${session.verify ? `&verify_code=${encodeURIComponent(session.verify)}` : ""}`, void 0, void 0, controller.signal);
      if (loginSession !== session || controller.signal.aborted) return;
      const messages = { wait: "请用手机微信扫码", scaned: "已扫码，请在手机确认", need_verifycode: "请输入手机微信显示的配对数字", expired: "二维码已过期，请重新生成", verify_code_blocked: "配对码错误次数过多，请重新扫码", binded_redirect: "已绑定；如仍未连接，请在手机解除旧绑定后重试" };
      if (response.status === "confirmed") {
        if (!safeId(response.ilink_bot_id) || !response.bot_token) throw new Error("微信未返回完整登录凭据");
        const next = { ...emptyWechat(), enabled: true, account: { id: response.ilink_bot_id, token: response.bot_token, base: officialBase(response.baseurl || WECHAT_BASE) } };
        commit(next);
        cancelSends();
        stopLogin();
        error = "";
        startReceive();
        notify();
        return;
      }
      if (response.status === "scaned_but_redirect") {
        if (!response.redirect_host) throw new Error("微信登录跳转地址缺失");
        session.base = officialBase(`https://${response.redirect_host}`);
      }
      login = { ...login, status: response.status || "wait", message: messages[response.status || "wait"] || "正在连接微信" };
      if (response.status === "scaned") session.verify = void 0;
      notify();
      if (["need_verifycode", "expired", "verify_code_blocked", "binded_redirect"].includes(response.status || "")) return;
    } catch (reason) {
      if (loginSession !== session || controller.signal.aborted) return;
      login = { ...login, status: "error", message: reason instanceof Error ? reason.message : "登录失败" };
      notify();
      return;
    } finally {
      if (loginController === controller) loginController = void 0;
    }
    if (loginSession === session) loginTimer = setTimeout(() => {
      void pollLogin();
    }, 1e3);
  };
  return {
    status,
    start: startReceive,
    dispose() {
      stopLogin();
      stopUpdates();
      cancelSends();
    },
    async login() {
      if (stored.account) throw new Error("请先退出当前微信登录，再绑定账号");
      stopLogin();
      const controller = new AbortController();
      loginController = controller;
      login = { status: "loading", message: "正在生成二维码" };
      notify();
      try {
        const response = await deps.request(WECHAT_BASE, "get_bot_qrcode?bot_type=3", { local_token_list: [] }, void 0, controller.signal);
        if (controller.signal.aborted || loginController !== controller) return;
        if (!response.qrcode || !response.qrcode_img_content) throw new Error("微信未返回二维码");
        const image = await deps.qr(response.qrcode_img_content);
        if (controller.signal.aborted || loginController !== controller) return;
        loginSession = { code: response.qrcode, base: WECHAT_BASE, started: Date.now() };
        login = { status: "wait", qrImage: image, message: "请用手机微信扫码并确认连接" };
        notify();
        void pollLogin();
      } catch (reason) {
        if (!controller.signal.aborted) {
          login = { status: "error", message: reason instanceof Error ? reason.message : "登录失败" };
          notify();
        }
      }
    },
    verify(code) {
      if (!loginSession || (login == null ? void 0 : login.status) !== "need_verifycode" || typeof code !== "string" || !/^\d{1,12}$/.test(code)) throw new Error("请填写手机显示的配对数字");
      loginSession.verify = code;
      login = { ...login, status: "checking", message: "正在验证配对码" };
      notify();
      void pollLogin();
    },
    cancelLogin() {
      stopLogin();
      notify();
    },
    logout() {
      commit(emptyWechat());
      stopLogin();
      stopUpdates();
      cancelSends();
      seen.clear();
      deliveries.length = 0;
      connection = "disconnected";
      error = "";
      notify();
    },
    setEnabled(enabled) {
      if (typeof enabled !== "boolean") throw new Error("无效的微信开关");
      if (enabled && !stored.account) throw new Error("请先扫码登录");
      commit({ ...stored, enabled });
      stopUpdates();
      cancelSends();
      if (enabled) startReceive();
      else connection = "disconnected";
      notify();
    },
    register(input) {
      if (!Array.isArray(input) || input.length > 200) throw new Error("服务清单格式无效");
      const next = input.map((item) => {
        if (!isRecord(item) || !validTopic(item.topic) || typeof item.name !== "string" || typeof item.description !== "string" || typeof item.enabled !== "boolean") throw new Error("服务声明格式无效");
        return { topic: item.topic, name: item.name.slice(0, 80), description: item.description.slice(0, 300), enabled: item.enabled };
      });
      if (new Set(next.map((item) => item.topic)).size !== next.length) throw new Error("服务 ID 重复");
      services2 = next;
      notify();
    },
    saveRules(input) {
      if (!stored.account || !Array.isArray(input) || input.length > 100) throw new Error("请登录微信后配置订阅（最多 100 条）");
      const rules = input.map((item) => {
        if (!isRecord(item) || !safeId(item.id) || !validTopic(item.topic) || !safeId(item.peerId) || typeof item.enabled !== "boolean") throw new Error("订阅格式无效");
        if (!services2.some((service) => service.topic === item.topic) || !Object.hasOwn(stored.peers, item.peerId)) throw new Error("请选择已登记服务和收到消息的微信会话");
        return { id: item.id, topic: item.topic, peerId: item.peerId, enabled: item.enabled };
      });
      if (new Set(rules.map((rule) => rule.id)).size !== rules.length || new Set(rules.map((rule) => `${rule.topic}:${rule.peerId}`)).size !== rules.length) throw new Error("同一服务与接收人不能重复订阅");
      commit({ ...stored, rules });
      notify();
    },
    topicStatus(topic) {
      return { configured: Boolean(stored.account && stored.enabled), subscribed: stored.rules.filter((rule) => rule.enabled && rule.topic === topic).length };
    },
    async publish(topic, input) {
      const rejected = (message) => ({ accepted: false, sent: 0, failed: 0, skipped: 0, error: message });
      if (!validTopic(topic) || !services2.some((service) => service.topic === topic && service.enabled)) return rejected("服务未声明或插件已禁用");
      if (!isRecord(input) || !safeId(input.id) || typeof input.title !== "string" || typeof input.text !== "string" || !input.text.trim() || input.title.length > 120 || input.text.length > 3500) return rejected("结果须包含事件 ID、标题及 1–3500 字文本");
      const output = input;
      const rules = stored.rules.filter((rule) => rule.enabled && rule.topic === topic);
      if (!rules.length) return { accepted: true, sent: 0, failed: 0, skipped: 0 };
      if (!stored.account || !stored.enabled) return rejected("微信未连接或分发已暂停");
      const eventKey = `${topic}:${output.id}`;
      if (seen.has(eventKey)) return { accepted: true, sent: 0, failed: 0, skipped: rules.length };
      if (queued >= 50) return rejected("发送队列已满，请稍后再发布");
      seen.add(eventKey);
      if (seen.size > 500) seen.delete(seen.values().next().value);
      const revision = generation;
      queued++;
      const task = tail.then(async () => {
        const result = { accepted: true, sent: 0, failed: 0, skipped: 0 };
        for (const rule of rules) {
          if (revision !== generation || !stored.enabled || !stored.account || !services2.some((service) => service.topic === topic && service.enabled) || !stored.rules.some((current) => current.id === rule.id && current.enabled && current.peerId === rule.peerId && current.topic === topic)) {
            result.skipped++;
            continue;
          }
          const peer = stored.peers[rule.peerId];
          const record = { id: node_crypto.randomUUID(), topic, peerId: rule.peerId, at: (/* @__PURE__ */ new Date()).toISOString(), state: "failed" };
          try {
            if (!(peer == null ? void 0 : peer.context)) throw new Error("缺少会话上下文，请先向 ClawBot 发一条消息");
            await deps.request(stored.account.base, "sendmessage", { msg: {
              from_user_id: "",
              to_user_id: rule.peerId,
              client_id: `hub-${node_crypto.randomUUID()}`,
              message_type: 2,
              message_state: 2,
              context_token: peer.context,
              item_list: [{ type: 1, text_item: { text: output.title ? `${output.title}
${output.text}` : output.text } }]
            } }, stored.account.token, sendController.signal);
            record.state = "sent";
            result.sent++;
          } catch (reason) {
            record.error = reason instanceof Error ? reason.message : "发送失败";
            result.failed++;
          }
          if (revision === generation) {
            deliveries.unshift(record);
            deliveries.splice(50);
            notify();
          }
        }
        return result;
      });
      tail = task.then(() => void 0, () => void 0);
      try {
        return await task;
      } finally {
        queued--;
      }
    }
  };
}
function registerWechatIpc(isAppUrl) {
  const file = path$6.join(require$$3$1.app.getPath("userData"), "wechat-config.json");
  const secure = () => require$$3$1.safeStorage.isEncryptionAvailable() && (process.platform !== "linux" || require$$3$1.safeStorage.getSelectedStorageBackend() !== "basic_text");
  let initial = emptyWechat();
  let storageError = "";
  try {
    if (fs$c.existsSync(file)) {
      if (!secure()) throw new Error("系统安全存储不可用");
      initial = parseWechatStored(JSON.parse(require$$3$1.safeStorage.decryptString(Buffer.from(JSON.parse(fs$c.readFileSync(file, "utf8")).encrypted, "base64"))));
    }
  } catch {
    storageError = "微信配置无法读取，请检查系统安全存储或重新登录";
  }
  const service = createWechatService({
    initial,
    request: createWechatRequest((input, options2) => require$$3$1.net.fetch(input instanceof URL ? input.toString() : input, options2)),
    qr: (text) => QRCode.toDataURL(text, { width: 240, margin: 2 }),
    save(value) {
      if (!secure()) throw new Error("系统安全存储不可用，无法保存微信配置");
      writeJson(file, { version: 1, encrypted: require$$3$1.safeStorage.encryptString(JSON.stringify(value)).toString("base64") });
      storageError = "";
    },
    changed() {
      for (const window2 of require$$3$1.BrowserWindow.getAllWindows()) if (!window2.isDestroyed() && isAppUrl(window2.webContents.getURL()) && !new URL(window2.webContents.getURL()).hash.startsWith("#/floating/")) window2.webContents.send("wechat:changed", service.status());
    }
  });
  const trusted = (event) => Boolean(require$$3$1.BrowserWindow.fromWebContents(event.sender)) && event.senderFrame === event.sender.mainFrame && isAppUrl(event.senderFrame.url) && !new URL(event.senderFrame.url).hash.startsWith("#/floating/");
  const handle = (name, callback) => require$$3$1.ipcMain.handle(name, (event, ...input) => {
    if (!trusted(event)) throw new Error("请在主工作台使用微信服务");
    return callback(...input);
  });
  handle("wechat:status", () => ({ ...service.status(), ...storageError ? { error: storageError } : {} }));
  handle("wechat:login", () => {
    if (!secure()) throw new Error("系统安全存储不可用，不能保存登录凭据");
    return service.login();
  });
  handle("wechat:verify", (code) => service.verify(code));
  handle("wechat:cancel-login", () => service.cancelLogin());
  handle("wechat:logout", () => service.logout());
  handle("wechat:enabled", (enabled) => service.setEnabled(enabled));
  handle("wechat:rules", (rules) => service.saveRules(rules));
  handle("services:register", (input) => service.register(input));
  handle("services:publish", (topic, output) => service.publish(topic, output));
  handle("services:status", (topic) => service.topicStatus(topic));
  require$$3$1.app.on("before-quit", () => service.dispose());
  service.start();
}
function registerDataIpc(isAppUrl, preferences2, trayAvailable, closeWidgets) {
  const directory = require$$3$1.app.getPath("userData");
  const pendingFile = path$6.join(directory, "pending-restore.json");
  let busy = false;
  const snapshot = (entries) => validateBackup({ format: "wttch-hub-backup", version: 1, createdAt: (/* @__PURE__ */ new Date()).toISOString(), closeBehavior: preferences2.get(), entries });
  const readPending = () => fs$c.existsSync(pendingFile) ? validateBackup(JSON.parse(fs$c.readFileSync(pendingFile, "utf8"))) : null;
  const handle = (name, action) => require$$3$1.ipcMain.handle(`desktop:${name}`, (event, input) => {
    const window2 = require$$3$1.BrowserWindow.fromWebContents(event.sender);
    if (!window2 || event.senderFrame !== event.sender.mainFrame || !isAppUrl(event.senderFrame.url) || new URL(event.senderFrame.url).hash.startsWith("#/floating/")) throw new Error("请在主工作台管理数据");
    return action(window2, input);
  });
  handle("info", () => ({ directory, closeBehavior: preferences2.get(), trayAvailable: trayAvailable() }));
  handle("close-behavior", (_window, input) => preferences2.set(input));
  handle("open-directory", async () => {
    const error = await require$$3$1.shell.openPath(directory);
    if (error) throw new Error(error);
  });
  handle("export", async (window2, input) => {
    if (busy) throw new Error("已有数据操作正在进行");
    busy = true;
    try {
      const backup = snapshot(input);
      const result = await require$$3$1.dialog.showSaveDialog(window2, { title: "导出工作台备份", defaultPath: `wttch-hub-${Date.now()}.json`, filters: [{ name: "工作台备份", extensions: ["json"] }] });
      if (result.canceled || !result.filePath) return false;
      writeJson(result.filePath, backup);
      return true;
    } finally {
      busy = false;
    }
  });
  handle("import", async (window2, input) => {
    if (busy) throw new Error("已有数据操作正在进行");
    busy = true;
    try {
      snapshot(input);
      const selected = await require$$3$1.dialog.showOpenDialog(window2, { title: "恢复工作台备份", properties: ["openFile"], filters: [{ name: "工作台备份", extensions: ["json"] }] });
      if (selected.canceled || !selected.filePaths[0]) return false;
      const file = selected.filePaths[0];
      if (fs$c.statSync(file).size > MAX_BACKUP_BYTES) throw new Error("备份超过 10 MB 限制");
      const backup = validateBackup(JSON.parse(fs$c.readFileSync(file, "utf8")));
      const confirmation = await require$$3$1.dialog.showMessageBox(window2, { type: "warning", title: "恢复数据", message: "用备份替换当前业务数据？", detail: `备份时间：${backup.createdAt}
将替换插件数据与设置、导航、布局及关闭行为。AI 配置和密钥不受影响。浮动窗口会关闭，工作台会重新加载。恢复前备份将保存在数据目录的 backups 文件夹。`, buttons: ["取消", "恢复"], defaultId: 0, cancelId: 0 });
      if (confirmation.response !== 1) return false;
      if (window2.isDestroyed() || !isAppUrl(window2.webContents.getURL())) throw new Error("工作台页面已变化，请重试");
      const currentEntries = await window2.webContents.executeJavaScript(`Object.fromEntries(${JSON.stringify(DATA_KEYS)}.flatMap(key => { const value = localStorage.getItem(key); return value === null ? [] : [[key, value]]; }))`);
      const previous = snapshot(currentEntries);
      writeJson(path$6.join(directory, "backups", `before-restore-${Date.now()}.json`), previous);
      writeJson(pendingFile, backup);
      closeWidgets();
      window2.webContents.reload();
      return true;
    } finally {
      busy = false;
    }
  });
  handle("pending", () => readPending());
  handle("finish", () => {
    const pending = readPending();
    if (!pending) return;
    preferences2.set(pending.closeBehavior);
    fs$c.unlinkSync(pendingFile);
  });
}
const getIconDirectory = () => require$$3$1.app.isPackaged ? path$6.join(process.resourcesPath, "icons") : path$6.join(require$$3$1.app.getAppPath(), "assets", "icons");
const getApplicationIconPath = () => path$6.join(getIconDirectory(), process.platform === "win32" ? "hub.ico" : "hub.png");
const createSystemTray = (actions) => {
  const mac = process.platform === "darwin";
  const imagePath = path$6.join(getIconDirectory(), mac ? "hubTemplate.png" : process.platform === "win32" ? "hub.ico" : "hub.png");
  const image = require$$3$1.nativeImage.createFromPath(imagePath);
  if (image.isEmpty()) throw new Error(`无法读取托盘图标：${imagePath}`);
  if (mac) image.setTemplateImage(true);
  const tray = new require$$3$1.Tray(process.platform === "win32" ? imagePath : mac ? image : image.resize({ width: 24, height: 24 }));
  tray.setToolTip("wttch-hub · 工作台");
  const menu = () => require$$3$1.Menu.buildFromTemplate([
    { label: "显示工作台", click: actions.show },
    { label: "隐藏工作台", enabled: actions.isVisible(), click: actions.hide },
    { type: "separator" },
    { label: "退出 wttch-hub", click: actions.quit }
  ]);
  const refresh = () => {
    if (!tray.isDestroyed()) tray.setContextMenu(menu());
  };
  if (mac) {
    tray.setIgnoreDoubleClickEvents(true);
  } else {
    tray.on("click", () => tray.popUpContextMenu(menu()));
  }
  refresh();
  return {
    refresh,
    destroy() {
      if (!tray.isDestroyed()) tray.destroy();
    }
  };
};
var src = { exports: {} };
var browser = { exports: {} };
var debug$1 = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var y = d * 365.25;
  ms = function(val, options2) {
    options2 = options2 || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse2(val);
    } else if (type === "number" && isNaN(val) === false) {
      return options2.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse2(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    if (ms2 >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (ms2 >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (ms2 >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (ms2 >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    return plural(ms2, d, "day") || plural(ms2, h, "hour") || plural(ms2, m, "minute") || plural(ms2, s, "second") || ms2 + " ms";
  }
  function plural(ms2, n, name) {
    if (ms2 < n) {
      return;
    }
    if (ms2 < n * 1.5) {
      return Math.floor(ms2 / n) + " " + name;
    }
    return Math.ceil(ms2 / n) + " " + name + "s";
  }
  return ms;
}
var hasRequiredDebug;
function requireDebug() {
  if (hasRequiredDebug) return debug$1.exports;
  hasRequiredDebug = 1;
  (function(module, exports) {
    exports = module.exports = createDebug.debug = createDebug["default"] = createDebug;
    exports.coerce = coerce;
    exports.disable = disable;
    exports.enable = enable;
    exports.enabled = enabled;
    exports.humanize = requireMs();
    exports.names = [];
    exports.skips = [];
    exports.formatters = {};
    var prevTime;
    function selectColor(namespace) {
      var hash = 0, i;
      for (i in namespace) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return exports.colors[Math.abs(hash) % exports.colors.length];
    }
    function createDebug(namespace) {
      function debug2() {
        if (!debug2.enabled) return;
        var self = debug2;
        var curr = +/* @__PURE__ */ new Date();
        var ms2 = curr - (prevTime || curr);
        self.diff = ms2;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        args[0] = exports.coerce(args[0]);
        if ("string" !== typeof args[0]) {
          args.unshift("%O");
        }
        var index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
          if (match === "%%") return match;
          index++;
          var formatter = exports.formatters[format];
          if ("function" === typeof formatter) {
            var val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        exports.formatArgs.call(self, args);
        var logFn = debug2.log || exports.log || console.log.bind(console);
        logFn.apply(self, args);
      }
      debug2.namespace = namespace;
      debug2.enabled = exports.enabled(namespace);
      debug2.useColors = exports.useColors();
      debug2.color = selectColor(namespace);
      if ("function" === typeof exports.init) {
        exports.init(debug2);
      }
      return debug2;
    }
    function enable(namespaces) {
      exports.save(namespaces);
      exports.names = [];
      exports.skips = [];
      var split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
      var len = split.length;
      for (var i = 0; i < len; i++) {
        if (!split[i]) continue;
        namespaces = split[i].replace(/\*/g, ".*?");
        if (namespaces[0] === "-") {
          exports.skips.push(new RegExp("^" + namespaces.substr(1) + "$"));
        } else {
          exports.names.push(new RegExp("^" + namespaces + "$"));
        }
      }
    }
    function disable() {
      exports.enable("");
    }
    function enabled(name) {
      var i, len;
      for (i = 0, len = exports.skips.length; i < len; i++) {
        if (exports.skips[i].test(name)) {
          return false;
        }
      }
      for (i = 0, len = exports.names.length; i < len; i++) {
        if (exports.names[i].test(name)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) return val.stack || val.message;
      return val;
    }
  })(debug$1, debug$1.exports);
  return debug$1.exports;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
  hasRequiredBrowser = 1;
  (function(module, exports) {
    exports = module.exports = requireDebug();
    exports.log = log2;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = "undefined" != typeof chrome && "undefined" != typeof chrome.storage ? chrome.storage.local : localstorage();
    exports.colors = [
      "lightseagreen",
      "forestgreen",
      "goldenrod",
      "dodgerblue",
      "darkorchid",
      "crimson"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && window.process.type === "renderer") {
        return true;
      }
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || // double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    exports.formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (err2) {
        return "[UnexpectedJSONParseError]: " + err2.message;
      }
    };
    function formatArgs(args) {
      var useColors2 = this.useColors;
      args[0] = (useColors2 ? "%c" : "") + this.namespace + (useColors2 ? " %c" : " ") + args[0] + (useColors2 ? "%c " : " ") + "+" + exports.humanize(this.diff);
      if (!useColors2) return;
      var c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      var index = 0;
      var lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, function(match) {
        if ("%%" === match) return;
        index++;
        if ("%c" === match) {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    function log2() {
      return "object" === typeof console && console.log && Function.prototype.apply.call(console.log, console, arguments);
    }
    function save(namespaces) {
      try {
        if (null == namespaces) {
          exports.storage.removeItem("debug");
        } else {
          exports.storage.debug = namespaces;
        }
      } catch (e) {
      }
    }
    function load() {
      var r;
      try {
        r = exports.storage.debug;
      } catch (e) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    exports.enable(load());
    function localstorage() {
      try {
        return window.localStorage;
      } catch (e) {
      }
    }
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node.exports;
  hasRequiredNode = 1;
  (function(module, exports) {
    var tty = require$$0$4;
    var util2 = require$$0$2;
    exports = module.exports = requireDebug();
    exports.init = init;
    exports.log = log2;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.colors = [6, 2, 3, 4, 5, 1];
    exports.inspectOpts = Object.keys(process.env).filter(function(key) {
      return /^debug_/i.test(key);
    }).reduce(function(obj, key) {
      var prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, function(_, k) {
        return k.toUpperCase();
      });
      var val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
      else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
      else if (val === "null") val = null;
      else val = Number(val);
      obj[prop] = val;
      return obj;
    }, {});
    var fd2 = parseInt(process.env.DEBUG_FD, 10) || 2;
    if (1 !== fd2 && 2 !== fd2) {
      util2.deprecate(function() {
      }, "except for stderr(2) and stdout(1), any other usage of DEBUG_FD is deprecated. Override debug.log if you want to use a different log function (https://git.io/debug_fd)")();
    }
    var stream = 1 === fd2 ? process.stdout : 2 === fd2 ? process.stderr : createWritableStdioStream(fd2);
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(fd2);
    }
    exports.formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts).split("\n").map(function(str) {
        return str.trim();
      }).join(" ");
    };
    exports.formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts);
    };
    function formatArgs(args) {
      var name = this.namespace;
      var useColors2 = this.useColors;
      if (useColors2) {
        var c = this.color;
        var prefix = "  \x1B[3" + c + ";1m" + name + " \x1B[0m";
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push("\x1B[3" + c + "m+" + exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = (/* @__PURE__ */ new Date()).toUTCString() + " " + name + " " + args[0];
      }
    }
    function log2() {
      return stream.write(util2.format.apply(util2, arguments) + "\n");
    }
    function save(namespaces) {
      if (null == namespaces) {
        delete process.env.DEBUG;
      } else {
        process.env.DEBUG = namespaces;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function createWritableStdioStream(fd3) {
      var stream2;
      var tty_wrap = process.binding("tty_wrap");
      switch (tty_wrap.guessHandleType(fd3)) {
        case "TTY":
          stream2 = new tty.WriteStream(fd3);
          stream2._type = "tty";
          if (stream2._handle && stream2._handle.unref) {
            stream2._handle.unref();
          }
          break;
        case "FILE":
          var fs2 = require$$1$1;
          stream2 = new fs2.SyncWriteStream(fd3, { autoClose: false });
          stream2._type = "fs";
          break;
        case "PIPE":
        case "TCP":
          var net2 = require$$4;
          stream2 = new net2.Socket({
            fd: fd3,
            readable: false,
            writable: true
          });
          stream2.readable = false;
          stream2.read = null;
          stream2._type = "pipe";
          if (stream2._handle && stream2._handle.unref) {
            stream2._handle.unref();
          }
          break;
        default:
          throw new Error("Implement me. Unknown stream file type!");
      }
      stream2.fd = fd3;
      stream2._isStdio = true;
      return stream2;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      var keys = Object.keys(exports.inspectOpts);
      for (var i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    exports.enable(load());
  })(node, node.exports);
  return node.exports;
}
if (typeof process !== "undefined" && process.type === "renderer") {
  src.exports = requireBrowser();
} else {
  src.exports = requireNode();
}
var srcExports = src.exports;
var path$4 = require$$1;
var spawn$1 = require$$1$4.spawn;
var debug = srcExports("electron-squirrel-startup");
var app = require$$3$1.app;
var run = function(args, done) {
  var updateExe = path$4.resolve(path$4.dirname(process.execPath), "..", "Update.exe");
  debug("Spawning `%s` with args `%s`", updateExe, args);
  spawn$1(updateExe, args, {
    detached: true
  }).on("close", done);
};
var check = function() {
  if (process.platform === "win32") {
    var cmd = process.argv[1];
    debug("processing squirrel command `%s`", cmd);
    var target = path$4.basename(process.execPath);
    if (cmd === "--squirrel-install" || cmd === "--squirrel-updated") {
      run(["--createShortcut=" + target], app.quit);
      return true;
    }
    if (cmd === "--squirrel-uninstall") {
      run(["--removeShortcut=" + target], app.quit);
      return true;
    }
    if (cmd === "--squirrel-obsolete") {
      app.quit();
      return true;
    }
  }
  return false;
};
var electronSquirrelStartup = check();
const started = /* @__PURE__ */ getDefaultExportFromCjs(electronSquirrelStartup);
var lib = {};
const version = "5.33.8";
const require$$0 = {
  version
};
var util$i = {};
const os$8 = require$$0$1;
const fs$a = require$$1$1;
const path$3 = require$$1;
const spawn = require$$1$4.spawn;
const exec$g = require$$1$4.exec;
const execSync$b = require$$1$4.execSync;
const _platform$h = process.platform;
const _linux$g = _platform$h === "linux" || _platform$h === "android";
const _darwin$g = _platform$h === "darwin";
const _windows$h = _platform$h === "win32";
const _freebsd$f = _platform$h === "freebsd";
const _openbsd$f = _platform$h === "openbsd";
const _netbsd$f = _platform$h === "netbsd";
let _cores = 0;
let codepage = "";
let _smartMonToolsInstalled = null;
let _rpi_cpuinfo = null;
const WINDIR = process.env.WINDIR || "C:\\Windows";
let _psChild;
let _psResult = "";
const _psCmds = [];
let _psPersistent = false;
let _powerShell = "";
const _psToUTF8 = "$OutputEncoding = [System.Console]::OutputEncoding = [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8 ; ";
const _psCmdStart = "--###START###--";
const _psError = "--ERROR--";
const _psCmdSeperator = "--###ENDCMD###--";
const _psIdSeperator = "--##ID##--";
const execOptsWin = {
  windowsHide: true,
  maxBuffer: 1024 * 102400,
  encoding: "UTF-8",
  env: Object.assign({}, process.env, { LANG: "en_US.UTF-8" })
};
const execOptsLinux = {
  maxBuffer: 1024 * 102400,
  encoding: "UTF-8",
  stdio: ["pipe", "pipe", "ignore"]
};
function toInt(value) {
  let result = parseInt(value, 10);
  if (isNaN(result)) {
    result = 0;
  }
  return result;
}
function splitByNumber(str) {
  let numberStarted = false;
  let num = "";
  let cpart = "";
  for (const c of str) {
    if (c >= "0" && c <= "9" || numberStarted) {
      numberStarted = true;
      num += c;
    } else {
      cpart += c;
    }
  }
  return [cpart, num];
}
const stringObj = new String();
const stringReplace = new String().replace;
const stringToLower = new String().toLowerCase;
const stringToString = new String().toString;
const stringSubstr = new String().substr;
const stringSubstring = new String().substring;
const stringTrim = new String().trim;
const stringStartWith = new String().startsWith;
const mathMin = Math.min;
function isFunction(functionToCheck) {
  let getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === "[object Function]";
}
function unique(obj) {
  const uniques = [];
  const stringify = {};
  for (let i = 0; i < obj.length; i++) {
    let keys = Object.keys(obj[i]);
    keys.sort((a, b) => {
      return a - b;
    });
    let str = "";
    for (let j = 0; j < keys.length; j++) {
      str += JSON.stringify(keys[j]);
      str += JSON.stringify(obj[i][keys[j]]);
    }
    if (!{}.hasOwnProperty.call(stringify, str)) {
      uniques.push(obj[i]);
      stringify[str] = true;
    }
  }
  return uniques;
}
function sortByKey(array, keys) {
  return array.sort((a, b) => {
    let x = "";
    let y = "";
    keys.forEach((key) => {
      x = x + a[key];
      y = y + b[key];
    });
    return x < y ? -1 : x > y ? 1 : 0;
  });
}
function cores() {
  if (_cores === 0) {
    _cores = os$8.cpus().length;
  }
  return _cores;
}
function getValue(lines, property, separator, trimmed, lineMatch) {
  separator = separator || ":";
  property = property.toLowerCase();
  trimmed = trimmed || false;
  lineMatch = lineMatch || false;
  let result = "";
  lines.some((line) => {
    let lineLower = line.toLowerCase().replace(/\t/g, "");
    if (trimmed) {
      lineLower = lineLower.trim();
    }
    if (lineLower.startsWith(property) && (lineMatch ? lineLower.match(property + separator) || lineLower.match(property + " " + separator) : true)) {
      const parts = trimmed ? line.trim().split(separator) : line.split(separator);
      if (parts.length >= 2) {
        parts.shift();
        result = parts.join(separator).trim();
        return true;
      }
    }
    return false;
  });
  return result;
}
function decodeEscapeSequence(str, base) {
  base = base || 16;
  return str.replace(/\\x([0-9A-Fa-f]{2})/g, function() {
    return String.fromCharCode(parseInt(arguments[1], base));
  });
}
function detectSplit(str) {
  let seperator = "";
  let part = 0;
  str.split("").forEach((element) => {
    if (element >= "0" && element <= "9") {
      if (part === 1) {
        part++;
      }
    } else {
      if (part === 0) {
        part++;
      }
      if (part === 1) {
        seperator += element;
      }
    }
  });
  return seperator;
}
function parseTime(t, pmDesignator) {
  pmDesignator = pmDesignator || "";
  t = t.toUpperCase();
  let hour = 0;
  let min = 0;
  const splitter = detectSplit(t);
  const parts = t.split(splitter);
  if (parts.length >= 2) {
    if (parts[2]) {
      parts[1] += parts[2];
    }
    const p1 = (parts[1] || "").toLowerCase();
    let isPM = p1.indexOf("pm") > -1 || p1.indexOf("p.m.") > -1 || p1.indexOf("p. m.") > -1 || p1.indexOf("n") > -1 || p1.indexOf("ch") > -1 || p1.indexOf("ös") > -1 || pmDesignator && p1.indexOf(pmDesignator) > -1;
    hour = parseInt(parts[0], 10);
    min = parseInt(parts[1], 10);
    hour = isPM && hour < 12 ? hour + 12 : hour;
    return ("0" + hour).substr(-2) + ":" + ("0" + min).substr(-2);
  }
}
function parseDateTime(dt, culture) {
  const result = {
    date: "",
    time: ""
  };
  culture = culture || {};
  const dateFormat = (culture.dateFormat || "").toLowerCase();
  const pmDesignator = culture.pmDesignator || "";
  const parts = dt.split(" ");
  if (parts[0]) {
    if (parts[0].indexOf("/") >= 0) {
      const dtparts = parts[0].split("/");
      if (dtparts.length === 3) {
        if (dtparts[0].length === 4) {
          result.date = dtparts[0] + "-" + ("0" + dtparts[1]).substr(-2) + "-" + ("0" + dtparts[2]).substr(-2);
        } else if (dtparts[2].length === 2) {
          if (dateFormat.indexOf("/d/") > -1 || dateFormat.indexOf("/dd/") > -1) {
            result.date = "20" + dtparts[2] + "-" + ("0" + dtparts[1]).substr(-2) + "-" + ("0" + dtparts[0]).substr(-2);
          } else {
            result.date = "20" + dtparts[2] + "-" + ("0" + dtparts[1]).substr(-2) + "-" + ("0" + dtparts[0]).substr(-2);
          }
        } else {
          const isEN = dt.toLowerCase().indexOf("pm") > -1 || dt.toLowerCase().indexOf("p.m.") > -1 || dt.toLowerCase().indexOf("p. m.") > -1 || dt.toLowerCase().indexOf("am") > -1 || dt.toLowerCase().indexOf("a.m.") > -1 || dt.toLowerCase().indexOf("a. m.") > -1;
          if ((isEN || dateFormat.indexOf("/d/") > -1 || dateFormat.indexOf("/dd/") > -1) && dateFormat.indexOf("dd/") !== 0) {
            result.date = dtparts[2] + "-" + ("0" + dtparts[0]).substr(-2) + "-" + ("0" + dtparts[1]).substr(-2);
          } else {
            result.date = dtparts[2] + "-" + ("0" + dtparts[1]).substr(-2) + "-" + ("0" + dtparts[0]).substr(-2);
          }
        }
      }
    }
    if (parts[0].indexOf(".") >= 0) {
      const dtparts = parts[0].split(".");
      if (dtparts.length === 3) {
        if (dateFormat.indexOf(".d.") > -1 || dateFormat.indexOf(".dd.") > -1) {
          result.date = dtparts[2] + "-" + ("0" + dtparts[0]).substr(-2) + "-" + ("0" + dtparts[1]).substr(-2);
        } else {
          result.date = dtparts[2] + "-" + ("0" + dtparts[1]).substr(-2) + "-" + ("0" + dtparts[0]).substr(-2);
        }
      }
    }
    if (parts[0].indexOf("-") >= 0) {
      const dtparts = parts[0].split("-");
      if (dtparts.length === 3) {
        result.date = dtparts[0] + "-" + ("0" + dtparts[1]).substr(-2) + "-" + ("0" + dtparts[2]).substr(-2);
      }
    }
  }
  if (parts[1]) {
    parts.shift();
    const time2 = parts.join(" ");
    result.time = parseTime(time2, pmDesignator);
  }
  return result;
}
function parseHead(head, rights) {
  let space = rights > 0;
  let count = 1;
  let from = 0;
  let to = 0;
  const result = [];
  for (let i = 0; i < head.length; i++) {
    if (count <= rights) {
      if (/\s/.test(head[i]) && !space) {
        to = i - 1;
        result.push({
          from,
          to: to + 1,
          cap: head.substring(from, to + 1)
        });
        from = to + 2;
        count++;
      }
      space = head[i] === " ";
    } else {
      if (!/\s/.test(head[i]) && space) {
        to = i - 1;
        if (from < to) {
          result.push({
            from,
            to,
            cap: head.substring(from, to)
          });
        }
        from = to + 1;
        count++;
      }
      space = head[i] === " ";
    }
  }
  to = 5e3;
  result.push({
    from,
    to,
    cap: head.substring(from, to)
  });
  let len = result.length;
  for (let i = 0; i < len; i++) {
    if (result[i].cap.replace(/\s/g, "").length === 0) {
      if (i + 1 < len) {
        result[i].to = result[i + 1].to;
        result[i].cap = result[i].cap + result[i + 1].cap;
        result.splice(i + 1, 1);
        len = len - 1;
      }
    }
  }
  return result;
}
function findObjectByKey(array, key, value) {
  for (let i = 0; i < array.length; i++) {
    if (array[i][key] === value) {
      return i;
    }
  }
  return -1;
}
function getPowershell() {
  _powerShell = "powershell.exe";
  if (_windows$h) {
    const defaultPath = `${WINDIR}\\system32\\WindowsPowerShell\\v1.0\\powershell.exe`;
    if (fs$a.existsSync(defaultPath)) {
      _powerShell = defaultPath;
    }
  }
}
function getVboxmanage() {
  const vboxPath = (process.env.VBOX_INSTALL_PATH || process.env.VBOX_MSI_INSTALL_PATH || "").replace(/["%!^&|<>`$;\r\n]/g, "");
  return _windows$h ? `"${vboxPath}\\VBoxManage.exe"` : "vboxmanage";
}
function powerShellProceedResults(data) {
  let id = "";
  let parts;
  let res = "";
  if (data.indexOf(_psCmdStart) >= 0) {
    parts = data.split(_psCmdStart);
    const parts2 = parts[1].split(_psIdSeperator);
    id = parts2[0];
    if (parts2.length > 1) {
      data = parts2.slice(1).join(_psIdSeperator);
    }
  }
  if (data.indexOf(_psCmdSeperator) >= 0) {
    parts = data.split(_psCmdSeperator);
    res = parts[0];
  }
  let remove = -1;
  for (let i = 0; i < _psCmds.length; i++) {
    if (_psCmds[i].id === id) {
      remove = i;
      _psCmds[i].callback(res);
    }
  }
  if (remove >= 0) {
    _psCmds.splice(remove, 1);
  }
}
function powerShellStart() {
  if (!_psChild) {
    _psChild = spawn(_powerShell, ["-NoProfile", "-NoLogo", "-InputFormat", "Text", "-NoExit", "-Command", "-"], {
      stdio: "pipe",
      windowsHide: true,
      maxBuffer: 1024 * 102400,
      encoding: "UTF-8",
      env: Object.assign({}, process.env, { LANG: "en_US.UTF-8" })
    });
    if (_psChild && _psChild.pid) {
      _psPersistent = true;
      _psChild.stdout.on("data", (data) => {
        _psResult = _psResult + data.toString("utf8");
        let sepIndex = _psResult.indexOf(_psCmdSeperator);
        while (sepIndex >= 0) {
          const end = sepIndex + _psCmdSeperator.length;
          powerShellProceedResults(_psResult.slice(0, end));
          _psResult = _psResult.slice(end);
          sepIndex = _psResult.indexOf(_psCmdSeperator);
        }
      });
      _psChild.stderr.on("data", () => {
        powerShellProceedResults(_psResult + _psError);
      });
      _psChild.on("error", () => {
        powerShellProceedResults(_psResult + _psError);
      });
      _psChild.on("close", () => {
        if (_psChild) {
          _psChild.kill();
        }
      });
    }
  }
}
function powerShellRelease() {
  try {
    if (_psChild) {
      _psChild.stdin.write("exit" + os$8.EOL);
      _psChild.stdin.end();
    }
  } catch {
    if (_psChild) {
      _psChild.kill();
    }
  }
  _psPersistent = false;
  _psChild = null;
}
function powerShell(cmd) {
  if (_psPersistent) {
    const id = Math.random().toString(36).substring(2, 12);
    return new Promise((resolve) => {
      process.nextTick(() => {
        function callback(data) {
          resolve(data);
        }
        _psCmds.push({
          id,
          cmd,
          callback,
          start: /* @__PURE__ */ new Date()
        });
        try {
          if (_psChild && _psChild.pid) {
            _psChild.stdin.write(_psToUTF8 + "echo " + _psCmdStart + id + _psIdSeperator + "; " + os$8.EOL + cmd + os$8.EOL + "echo " + _psCmdSeperator + os$8.EOL);
          }
        } catch {
          resolve("");
        }
      });
    });
  } else {
    let result = "";
    return new Promise((resolve) => {
      process.nextTick(() => {
        try {
          const osVersion = os$8.release().split(".").map(Number);
          const spanOptions = osVersion[0] < 10 ? ["-NoProfile", "-NoLogo", "-InputFormat", "Text", "-NoExit", "-ExecutionPolicy", "Unrestricted", "-Command", "-"] : ["-NoProfile", "-NoLogo", "-InputFormat", "Text", "-ExecutionPolicy", "Unrestricted", "-Command", _psToUTF8 + cmd];
          const child = spawn(_powerShell, spanOptions, {
            stdio: "pipe",
            windowsHide: true,
            maxBuffer: 1024 * 102400,
            encoding: "UTF-8",
            env: Object.assign({}, process.env, { LANG: "en_US.UTF-8" })
          });
          if (child && !child.pid) {
            child.on("error", () => {
              resolve(result);
            });
          }
          if (child && child.pid) {
            child.stdout.on("data", (data) => {
              result = result + data.toString("utf8");
            });
            child.stderr.on("data", () => {
              child.kill();
              resolve(result);
            });
            child.on("close", () => {
              child.kill();
              resolve(result);
            });
            child.on("error", () => {
              child.kill();
              resolve(result);
            });
            if (osVersion[0] < 10) {
              try {
                child.stdin.write(_psToUTF8 + cmd + os$8.EOL);
                child.stdin.write("exit" + os$8.EOL);
                child.stdin.end();
              } catch {
                child.kill();
                resolve(result);
              }
            }
          } else {
            resolve(result);
          }
        } catch {
          resolve(result);
        }
      });
    });
  }
}
function execSafe(cmd, args, options2) {
  let result = "";
  options2 = options2 || {};
  return new Promise((resolve) => {
    process.nextTick(() => {
      try {
        const child = spawn(cmd, args, options2);
        if (child && !child.pid) {
          child.on("error", () => {
            resolve(result);
          });
        }
        if (child && child.pid) {
          child.stdout.on("data", (data) => {
            result += data.toString();
          });
          child.on("close", () => {
            child.kill();
            resolve(result);
          });
          child.on("error", () => {
            child.kill();
            resolve(result);
          });
        } else {
          resolve(result);
        }
      } catch {
        resolve(result);
      }
    });
  });
}
function getCodepage() {
  if (_windows$h) {
    if (!codepage) {
      try {
        const stdout = execSync$b("chcp", execOptsWin);
        const lines = stdout.toString().split("\r\n");
        const parts = lines[0].split(":");
        codepage = parts.length > 1 ? parts[1].replace(".", "").trim() : "";
      } catch {
        codepage = "437";
      }
    }
    return codepage;
  }
  if (_linux$g || _darwin$g || _freebsd$f || _openbsd$f || _netbsd$f) {
    if (!codepage) {
      try {
        const stdout = execSync$b("echo $LANG", execOptsLinux);
        const lines = stdout.toString().split("\r\n");
        const parts = lines[0].split(".");
        codepage = parts.length > 1 ? parts[1].trim() : "";
        if (!codepage) {
          codepage = "UTF-8";
        }
      } catch {
        codepage = "UTF-8";
      }
    }
    return codepage;
  }
}
function smartMonToolsInstalled() {
  if (_smartMonToolsInstalled !== null) {
    return _smartMonToolsInstalled;
  }
  _smartMonToolsInstalled = false;
  if (_windows$h) {
    try {
      const pathArray = execSync$b("WHERE smartctl 2>nul", execOptsWin).toString().split("\r\n");
      if (pathArray && pathArray.length) {
        _smartMonToolsInstalled = pathArray[0].indexOf(":\\") >= 0;
      } else {
        _smartMonToolsInstalled = false;
      }
    } catch {
      _smartMonToolsInstalled = false;
    }
  }
  if (_linux$g || _darwin$g || _freebsd$f || _openbsd$f || _netbsd$f) {
    try {
      const pathArray = execSync$b("which smartctl 2>/dev/null", execOptsLinux).toString().split("\r\n");
      _smartMonToolsInstalled = pathArray.length > 0;
    } catch {
    }
  }
  return _smartMonToolsInstalled;
}
function isRaspberry(cpuinfo) {
  const PI_MODEL_NO = ["BCM2708", "BCM2709", "BCM2710", "BCM2711", "BCM2712", "BCM2835", "BCM2836", "BCM2837", "BCM2837B0"];
  if (_rpi_cpuinfo !== null) {
    cpuinfo = _rpi_cpuinfo;
  } else if (cpuinfo === void 0) {
    try {
      cpuinfo = fs$a.readFileSync("/proc/cpuinfo", { encoding: "utf8" }).toString().split("\n");
      _rpi_cpuinfo = cpuinfo;
    } catch {
      return false;
    }
  }
  const hardware = getValue(cpuinfo, "hardware");
  const model = getValue(cpuinfo, "model");
  return hardware && PI_MODEL_NO.indexOf(hardware) > -1 || model && model.indexOf("Raspberry Pi") > -1;
}
function isRaspbian() {
  let osrelease = [];
  try {
    osrelease = fs$a.readFileSync("/etc/os-release", { encoding: "utf8" }).toString().split("\n");
  } catch {
    return false;
  }
  const id = getValue(osrelease, "id", "=");
  return id && id.indexOf("raspbian") > -1;
}
function execWin(cmd, opts, callback) {
  if (!callback) {
    callback = opts;
    opts = execOptsWin;
  }
  let newCmd = "chcp 65001 > nul && cmd /C " + cmd + " && chcp " + codepage + " > nul";
  exec$g(newCmd, opts, (error, stdout) => {
    callback(error, stdout);
  });
}
function darwinXcodeExists() {
  const cmdLineToolsExists = fs$a.existsSync("/Library/Developer/CommandLineTools/usr/bin/");
  const xcodeAppExists = fs$a.existsSync("/Applications/Xcode.app/Contents/Developer/Tools");
  const xcodeExists = fs$a.existsSync("/Library/Developer/Xcode/");
  return cmdLineToolsExists || xcodeExists || xcodeAppExists;
}
function nanoSeconds() {
  const time2 = process.hrtime();
  if (!Array.isArray(time2) || time2.length !== 2) {
    return 0;
  }
  return +time2[0] * 1e9 + +time2[1];
}
function countUniqueLines(lines, startingWith) {
  startingWith = startingWith || "";
  const uniqueLines = [];
  lines.forEach((line) => {
    if (line.startsWith(startingWith)) {
      if (uniqueLines.indexOf(line) === -1) {
        uniqueLines.push(line);
      }
    }
  });
  return uniqueLines.length;
}
function countLines(lines, startingWith) {
  startingWith = startingWith || "";
  const uniqueLines = [];
  lines.forEach((line) => {
    if (line.startsWith(startingWith)) {
      uniqueLines.push(line);
    }
  });
  return uniqueLines.length;
}
function sanitizeShellString(str, strict) {
  if (typeof strict === "undefined") {
    strict = false;
  }
  const s = str || "";
  let result = "";
  const l = mathMin(s.length, 2e3);
  for (let i = 0; i <= l; i++) {
    if (!(s[i] === void 0 || s[i] === ">" || s[i] === "<" || s[i] === "*" || s[i] === "?" || s[i] === "[" || s[i] === "]" || s[i] === "|" || s[i] === "˚" || s[i] === "$" || s[i] === ";" || s[i] === "&" || s[i] === "]" || s[i] === "#" || s[i] === "%" || s[i] === "!" || s[i] === "^" || s[i] === "\\" || s[i] === "	" || s[i] === "\n" || s[i] === "\r" || s[i] === "'" || s[i] === "`" || s[i] === '"' || s[i].length > 1 || strict && s[i] === "(" || strict && s[i] === ")" || strict && s[i] === "@" || strict && s[i] === " " || strict && s[i] === "{" || strict && s[i] === ";" || strict && s[i] === "}")) {
      result = result + s[i];
    }
  }
  return result;
}
function sanitizeContainerID(str) {
  const s = String(str || "").substring(0, 2e3).replace(/[^a-zA-Z0-9_.,*-]/g, "");
  return s.indexOf("..") === -1 ? s : "";
}
function sanitizeImageID(str) {
  const s = String(str || "").substring(0, 2e3).replace(/[^a-zA-Z0-9_.,:@/-]/g, "");
  return s.indexOf("..") === -1 ? s : "";
}
function isPrototypePolluted() {
  const s = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let notPolluted = true;
  let st = "";
  try {
    st.__proto__.replace = stringReplace;
    st.__proto__.toLowerCase = stringToLower;
    st.__proto__.toString = stringToString;
    st.__proto__.substr = stringSubstr;
    st.__proto__.substring = stringSubstring;
    st.__proto__.trim = stringTrim;
    st.__proto__.startsWith = stringStartWith;
  } catch (e) {
    Object.setPrototypeOf(st, stringObj);
  }
  notPolluted = notPolluted || s.length !== 62;
  const ms2 = Date.now();
  if (typeof ms2 === "number" && ms2 > 16e11) {
    const l = ms2 % 100 + 15;
    for (let i = 0; i < l; i++) {
      const r = Math.random() * 61.99999999 + 1;
      const rs = parseInt(Math.floor(r).toString(), 10);
      const rs2 = parseInt(r.toString().split(".")[0], 10);
      const q = Math.random() * 61.99999999 + 1;
      const qs = parseInt(Math.floor(q).toString(), 10);
      const qs2 = parseInt(q.toString().split(".")[0], 10);
      notPolluted = notPolluted && r !== q;
      notPolluted = notPolluted && rs === rs2 && qs === qs2;
      st += s[rs - 1];
    }
    notPolluted = notPolluted && st.length === l;
    let p = Math.random() * l * 0.9999999999;
    let stm = st.substr(0, p) + " " + st.substr(p, 2e3);
    try {
      stm.__proto__.replace = stringReplace;
    } catch (e) {
      Object.setPrototypeOf(stm, stringObj);
    }
    let sto = stm.replace(/ /g, "");
    notPolluted = notPolluted && st === sto;
    p = Math.random() * l * 0.9999999999;
    stm = st.substr(0, p) + "{" + st.substr(p, 2e3);
    sto = stm.replace(/{/g, "");
    notPolluted = notPolluted && st === sto;
    p = Math.random() * l * 0.9999999999;
    stm = st.substr(0, p) + "*" + st.substr(p, 2e3);
    sto = stm.replace(/\*/g, "");
    notPolluted = notPolluted && st === sto;
    p = Math.random() * l * 0.9999999999;
    stm = st.substr(0, p) + "$" + st.substr(p, 2e3);
    sto = stm.replace(/\$/g, "");
    notPolluted = notPolluted && st === sto;
    const stl = st.toLowerCase();
    notPolluted = notPolluted && stl.length === l && stl[l - 1] && !stl[l];
    for (let i = 0; i < l; i++) {
      const s1 = st[i];
      try {
        s1.__proto__.toLowerCase = stringToLower;
      } catch {
        Object.setPrototypeOf(st, stringObj);
      }
      const s2 = stl ? stl[i] : "";
      const s1l = s1.toLowerCase();
      notPolluted = notPolluted && s1l[0] === s2 && s1l[0] && !s1l[1];
    }
  }
  return !notPolluted;
}
function sanitizeString(str, strict) {
  if (typeof strict === "undefined") {
    strict = false;
  }
  let result = "";
  const s = isPrototypePolluted() ? "---" : sanitizeShellString(str, strict);
  const l = mathMin(s.length, 2e3);
  for (let i = 0; i <= l; i++) {
    if (s[i] !== void 0) {
      result = result + s[i];
    }
  }
  return result;
}
function hex2bin(hex) {
  return ("00000000" + parseInt(hex, 16).toString(2)).substr(-8);
}
function getFilesInPath(source) {
  const lstatSync = fs$a.lstatSync;
  const readdirSync = fs$a.readdirSync;
  const join = path$3.join;
  function isDirectory(source2) {
    return lstatSync(source2).isDirectory();
  }
  function isFile(source2) {
    return lstatSync(source2).isFile();
  }
  function getDirectories(source2) {
    return readdirSync(source2).map((name) => {
      return join(source2, name);
    }).filter(isDirectory);
  }
  function getFiles(source2) {
    return readdirSync(source2).map((name) => {
      return join(source2, name);
    }).filter(isFile);
  }
  function getFilesRecursively(source2) {
    try {
      const dirs = getDirectories(source2);
      const files = dirs.map((dir) => {
        return getFilesRecursively(dir);
      }).reduce((a, b) => {
        return a.concat(b);
      }, []);
      return files.concat(getFiles(source2));
    } catch {
      return [];
    }
  }
  if (fs$a.existsSync(source)) {
    return getFilesRecursively(source);
  } else {
    return [];
  }
}
function decodePiCpuinfo(lines) {
  if (_rpi_cpuinfo === null) {
    _rpi_cpuinfo = lines;
  } else if (lines === void 0) {
    lines = _rpi_cpuinfo;
  }
  const oldRevisionCodes = {
    "0002": {
      type: "B",
      revision: "1.0",
      memory: 256,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0003": {
      type: "B",
      revision: "1.0",
      memory: 256,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0004": {
      type: "B",
      revision: "2.0",
      memory: 256,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0005": {
      type: "B",
      revision: "2.0",
      memory: 256,
      manufacturer: "Qisda",
      processor: "BCM2835"
    },
    "0006": {
      type: "B",
      revision: "2.0",
      memory: 256,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0007": {
      type: "A",
      revision: "2.0",
      memory: 256,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0008": {
      type: "A",
      revision: "2.0",
      memory: 256,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0009": {
      type: "A",
      revision: "2.0",
      memory: 256,
      manufacturer: "Qisda",
      processor: "BCM2835"
    },
    "000d": {
      type: "B",
      revision: "2.0",
      memory: 512,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "000e": {
      type: "B",
      revision: "2.0",
      memory: 512,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "000f": {
      type: "B",
      revision: "2.0",
      memory: 512,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0010": {
      type: "B+",
      revision: "1.2",
      memory: 512,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0011": {
      type: "CM1",
      revision: "1.0",
      memory: 512,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0012": {
      type: "A+",
      revision: "1.1",
      memory: 256,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0013": {
      type: "B+",
      revision: "1.2",
      memory: 512,
      manufacturer: "Embest",
      processor: "BCM2835"
    },
    "0014": {
      type: "CM1",
      revision: "1.0",
      memory: 512,
      manufacturer: "Embest",
      processor: "BCM2835"
    },
    "0015": {
      type: "A+",
      revision: "1.1",
      memory: 256,
      manufacturer: "512MB	Embest",
      processor: "BCM2835"
    }
  };
  const processorList = ["BCM2835", "BCM2836", "BCM2837", "BCM2711", "BCM2712"];
  const manufacturerList = ["Sony UK", "Egoman", "Embest", "Sony Japan", "Embest", "Stadium"];
  const typeList = {
    "00": "A",
    "01": "B",
    "02": "A+",
    "03": "B+",
    "04": "2B",
    "05": "Alpha (early prototype)",
    "06": "CM1",
    "08": "3B",
    "09": "Zero",
    "0a": "CM3",
    "0c": "Zero W",
    "0d": "3B+",
    "0e": "3A+",
    "0f": "Internal use only",
    10: "CM3+",
    11: "4B",
    12: "Zero 2 W",
    13: "400",
    14: "CM4",
    15: "CM4S",
    16: "Internal use only",
    17: "5",
    18: "CM5",
    19: "500/500+",
    "1a": "CM5 Lite"
  };
  const revisionCode = getValue(lines, "revision", ":", true);
  const model = getValue(lines, "model:", ":", true);
  const serial = getValue(lines, "serial", ":", true);
  let result = {};
  if ({}.hasOwnProperty.call(oldRevisionCodes, revisionCode)) {
    result = {
      model,
      serial,
      revisionCode,
      memory: oldRevisionCodes[revisionCode].memory,
      manufacturer: oldRevisionCodes[revisionCode].manufacturer,
      processor: oldRevisionCodes[revisionCode].processor,
      type: oldRevisionCodes[revisionCode].type,
      revision: oldRevisionCodes[revisionCode].revision
    };
  } else {
    const revision = ("00000000" + getValue(lines, "revision", ":", true).toLowerCase()).substr(-8);
    const memSizeCode = parseInt(hex2bin(revision.substr(2, 1)).substr(5, 3), 2) || 0;
    const manufacturer = manufacturerList[parseInt(revision.substr(3, 1), 10)];
    const processor = processorList[parseInt(revision.substr(4, 1), 10)];
    const typeCode = revision.substr(5, 2);
    result = {
      model,
      serial,
      revisionCode,
      memory: 256 * Math.pow(2, memSizeCode),
      manufacturer,
      processor,
      type: {}.hasOwnProperty.call(typeList, typeCode) ? typeList[typeCode] : "",
      revision: "1." + revision.substr(7, 1)
    };
  }
  return result;
}
function getRpiGpu(cpuinfo) {
  if (_rpi_cpuinfo === null && cpuinfo !== void 0) {
    _rpi_cpuinfo = cpuinfo;
  } else if (cpuinfo === void 0 && _rpi_cpuinfo !== null) {
    cpuinfo = _rpi_cpuinfo;
  } else {
    try {
      cpuinfo = fs$a.readFileSync("/proc/cpuinfo", { encoding: "utf8" }).toString().split("\n");
      _rpi_cpuinfo = cpuinfo;
    } catch {
      return false;
    }
  }
  const rpi = decodePiCpuinfo(cpuinfo);
  if (rpi.type === "4B" || rpi.type === "CM4" || rpi.type === "CM4S" || rpi.type === "400") {
    return "VideoCore VI";
  }
  if (rpi.type === "5" || rpi.type === "500") {
    return "VideoCore VII";
  }
  return "VideoCore IV";
}
function promiseAll(promises) {
  const resolvingPromises = promises.map(
    (promise) => new Promise((resolve) => {
      const payload = new Array(2);
      promise.then((result) => {
        payload[0] = result;
      }).catch((error) => {
        payload[1] = error;
      }).then(() => {
        resolve(payload);
      });
    })
  );
  const errors = [];
  const results = [];
  return Promise.all(resolvingPromises).then((items) => {
    items.forEach((payload) => {
      if (payload[1]) {
        errors.push(payload[1]);
        results.push(null);
      } else {
        errors.push(null);
        results.push(payload[0]);
      }
    });
    return {
      errors,
      results
    };
  });
}
function promisify(nodeStyleFunction) {
  return function() {
    const args = Array.prototype.slice.call(arguments);
    return new Promise((resolve, reject) => {
      args.push((err2, data) => {
        if (err2) {
          reject(err2);
        } else {
          resolve(data);
        }
      });
      nodeStyleFunction.apply(null, args);
    });
  };
}
function promisifySave(nodeStyleFunction) {
  return function() {
    const args = Array.prototype.slice.call(arguments);
    return new Promise((resolve) => {
      args.push((err2, data) => {
        resolve(data);
      });
      nodeStyleFunction.apply(null, args);
    });
  };
}
function linuxVersion() {
  let result = "";
  if (_linux$g) {
    try {
      result = execSync$b("uname -v", execOptsLinux).toString();
    } catch {
      result = "";
    }
  }
  return result;
}
function plistParser(xmlStr) {
  const tags = ["array", "dict", "key", "string", "integer", "date", "real", "data", "boolean", "arrayEmpty"];
  const startStr = "<plist version";
  let pos = xmlStr.indexOf(startStr);
  let len = xmlStr.length;
  while (xmlStr[pos] !== ">" && pos < len) {
    pos++;
  }
  let depth = 0;
  let inTagStart = false;
  let inTagContent = false;
  let inTagEnd = false;
  let metaData = [{ tagStart: "", tagEnd: "", tagContent: "", key: "", data: null }];
  let c = "";
  let cn = xmlStr[pos];
  while (pos < len) {
    c = cn;
    if (pos + 1 < len) {
      cn = xmlStr[pos + 1];
    }
    if (c === "<") {
      inTagContent = false;
      if (cn === "/") {
        inTagEnd = true;
      } else if (metaData[depth].tagStart) {
        metaData[depth].tagContent = "";
        if (!metaData[depth].data) {
          metaData[depth].data = metaData[depth].tagStart === "array" ? [] : {};
        }
        depth++;
        metaData.push({ tagStart: "", tagEnd: "", tagContent: "", key: null, data: null });
        inTagStart = true;
        inTagContent = false;
      } else if (!inTagStart) {
        inTagStart = true;
      }
    } else if (c === ">") {
      if (metaData[depth].tagStart === "true/") {
        inTagStart = false;
        inTagEnd = true;
        metaData[depth].tagStart = "";
        metaData[depth].tagEnd = "/boolean";
        metaData[depth].data = true;
      }
      if (metaData[depth].tagStart === "false/") {
        inTagStart = false;
        inTagEnd = true;
        metaData[depth].tagStart = "";
        metaData[depth].tagEnd = "/boolean";
        metaData[depth].data = false;
      }
      if (metaData[depth].tagStart === "array/") {
        inTagStart = false;
        inTagEnd = true;
        metaData[depth].tagStart = "";
        metaData[depth].tagEnd = "/arrayEmpty";
        metaData[depth].data = [];
      }
      if (inTagContent) {
        inTagContent = false;
      }
      if (inTagStart) {
        inTagStart = false;
        inTagContent = true;
        if (metaData[depth].tagStart === "array") {
          metaData[depth].data = [];
        }
        if (metaData[depth].tagStart === "dict") {
          metaData[depth].data = {};
        }
      }
      if (inTagEnd) {
        inTagEnd = false;
        if (metaData[depth].tagEnd && tags.indexOf(metaData[depth].tagEnd.substr(1)) >= 0) {
          if (metaData[depth].tagEnd === "/dict" || metaData[depth].tagEnd === "/array") {
            if (depth > 1 && metaData[depth - 2].tagStart === "array") {
              metaData[depth - 2].data.push(metaData[depth - 1].data);
            }
            if (depth > 1 && metaData[depth - 2].tagStart === "dict" && !isProtoKey(metaData[depth - 1].key)) {
              metaData[depth - 2].data[metaData[depth - 1].key] = metaData[depth - 1].data;
            }
            depth--;
            metaData.pop();
            metaData[depth].tagContent = "";
            metaData[depth].tagStart = "";
            metaData[depth].tagEnd = "";
          } else {
            if (metaData[depth].tagEnd === "/key" && metaData[depth].tagContent) {
              metaData[depth].key = metaData[depth].tagContent;
            } else {
              if (metaData[depth].tagEnd === "/real" && metaData[depth].tagContent) {
                metaData[depth].data = parseFloat(metaData[depth].tagContent) || 0;
              }
              if (metaData[depth].tagEnd === "/integer" && metaData[depth].tagContent) {
                metaData[depth].data = parseInt(metaData[depth].tagContent) || 0;
              }
              if (metaData[depth].tagEnd === "/string" && metaData[depth].tagContent) {
                metaData[depth].data = metaData[depth].tagContent || "";
              }
              if (metaData[depth].tagEnd === "/boolean") {
                metaData[depth].data = metaData[depth].tagContent || false;
              }
              if (metaData[depth].tagEnd === "/arrayEmpty") {
                metaData[depth].data = metaData[depth].tagContent || [];
              }
              if (depth > 0 && metaData[depth - 1].tagStart === "array") {
                metaData[depth - 1].data.push(metaData[depth].data);
              }
              if (depth > 0 && metaData[depth - 1].tagStart === "dict" && !isProtoKey(metaData[depth].key)) {
                metaData[depth - 1].data[metaData[depth].key] = metaData[depth].data;
              }
            }
            metaData[depth].tagContent = "";
            metaData[depth].tagStart = "";
            metaData[depth].tagEnd = "";
          }
        }
        metaData[depth].tagEnd = "";
        inTagStart = false;
        inTagContent = false;
      }
    } else {
      if (inTagStart) {
        metaData[depth].tagStart += c;
      }
      if (inTagEnd) {
        metaData[depth].tagEnd += c;
      }
      if (inTagContent) {
        metaData[depth].tagContent += c;
      }
    }
    pos++;
  }
  return metaData[0].data;
}
function strIsNumeric(str) {
  return typeof str === "string" && !isNaN(str) && !isNaN(parseFloat(str));
}
function plistReader(output) {
  const lines = output.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(" = ") >= 0) {
      const lineParts = lines[i].split(" = ");
      lineParts[0] = lineParts[0].trim();
      if (!lineParts[0].startsWith('"')) {
        lineParts[0] = '"' + lineParts[0] + '"';
      }
      lineParts[1] = lineParts[1].trim();
      if (lineParts[1].indexOf('"') === -1 && lineParts[1].endsWith(";")) {
        const valueString = lineParts[1].substring(0, lineParts[1].length - 1);
        if (!strIsNumeric(valueString)) {
          lineParts[1] = `"${valueString}";`;
        }
      }
      if (lineParts[1].indexOf('"') >= 0 && lineParts[1].endsWith(";")) {
        const valueString = lineParts[1].substring(0, lineParts[1].length - 1).replace(/"/g, "");
        if (strIsNumeric(valueString)) {
          lineParts[1] = `${valueString};`;
        }
      }
      lines[i] = lineParts.join(" : ");
    }
    lines[i] = lines[i].replace(/\(/g, "[").replace(/\)/g, "]").replace(/;/g, ",").trim();
    if (lines[i].startsWith("}") && lines[i - 1] && lines[i - 1].endsWith(",")) {
      lines[i - 1] = lines[i - 1].substring(0, lines[i - 1].length - 1);
    }
  }
  output = lines.join("");
  let obj = {};
  try {
    obj = JSON.parse(output);
  } catch (e) {
  }
  return obj;
}
function semverCompare(v1, v2) {
  let res = 0;
  const parts1 = v1.split(".").map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.split(".").map((p) => parseInt(p, 10) || 0);
  if (parts1[0] < parts2[0]) {
    res = 1;
  } else if (parts1[0] > parts2[0]) {
    res = -1;
  } else if (parts1[0] === parts2[0] && parts1.length >= 2 && parts2.length >= 2) {
    if (parts1[1] < parts2[1]) {
      res = 1;
    } else if (parts1[1] > parts2[1]) {
      res = -1;
    } else if (parts1[1] === parts2[1]) {
      if (parts1.length >= 3 && parts2.length >= 3) {
        if (parts1[2] < parts2[2]) {
          res = 1;
        } else if (parts1[2] > parts2[2]) {
          res = -1;
        }
      } else if (parts2.length >= 3) {
        res = 1;
      }
    }
  }
  return res;
}
function getAppleModel(key) {
  const appleModelIds = [
    {
      key: "Mac17,9",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M5 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,8",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M5 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,7",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M5 Max",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,6",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M5 Max",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,5",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M5 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,4",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M5 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,1",
      name: "MacBook Neo",
      size: "14-inch",
      processor: "A18 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,3",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M5",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac17,2",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M5",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac16,13",
      name: "MacBook Air",
      size: "15-inch",
      processor: "M4",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac16,12",
      name: "MacBook Air",
      size: "13-inch",
      processor: "M4",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac15,13",
      name: "MacBook Air",
      size: "15-inch",
      processor: "M3",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac15,12",
      name: "MacBook Air",
      size: "13-inch",
      processor: "M3",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac14,15",
      name: "MacBook Air",
      size: "15-inch",
      processor: "M2",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac14,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "M2",
      year: "2022",
      additional: ""
    },
    {
      key: "MacBookAir10,1",
      name: "MacBook Air",
      size: "13-inch",
      processor: "M1",
      year: "2020",
      additional: ""
    },
    {
      key: "MacBookAir9,1",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "2020",
      additional: ""
    },
    {
      key: "MacBookAir8,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookAir8,1",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "2018",
      additional: ""
    },
    {
      key: "MacBookAir7,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "MacBookAir7,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Early 2015",
      additional: ""
    },
    {
      key: "MacBookAir7,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Early 2015",
      additional: ""
    },
    {
      key: "MacBookAir6,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Early 2014",
      additional: ""
    },
    {
      key: "MacBookAir6,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Early 2014",
      additional: ""
    },
    {
      key: "MacBookAir6,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Mid 2013",
      additional: ""
    },
    {
      key: "MacBookAir6,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Mid 2013",
      additional: ""
    },
    {
      key: "MacBookAir5,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookAir5,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookAir4,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "MacBookAir4,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "MacBookAir3,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Late 2010",
      additional: ""
    },
    {
      key: "MacBookAir3,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Late 2010",
      additional: ""
    },
    {
      key: "MacBookAir2,1",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Mid 2009",
      additional: ""
    },
    {
      key: "Mac16,1",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M4",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,6",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M4 Pro",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,8",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M4 Max",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,5",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M4 Pro",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,6",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M4 Max",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac15,3",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M3",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,6",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M3 Pro",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,8",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M3 Pro",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,10",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M3 Max",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,7",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M3 Pro",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,9",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M3 Pro",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,11",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M3 Max",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac14,5",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,9",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,6",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,10",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,7",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "M2",
      year: "2022",
      additional: ""
    },
    {
      key: "MacBookPro18,3",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M1 Pro",
      year: "2021",
      additional: ""
    },
    {
      key: "MacBookPro18,4",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M1 Max",
      year: "2021",
      additional: ""
    },
    {
      key: "MacBookPro18,1",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M1 Pro",
      year: "2021",
      additional: ""
    },
    {
      key: "MacBookPro18,2",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M1 Max",
      year: "2021",
      additional: ""
    },
    {
      key: "MacBookPro17,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "M1",
      year: "2020",
      additional: ""
    },
    {
      key: "MacBookPro16,3",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2020",
      additional: "Two Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro16,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2020",
      additional: "Four Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro16,1",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro16,4",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro15,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro15,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro15,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro15,4",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2019",
      additional: "Two Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro15,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2018",
      additional: ""
    },
    {
      key: "MacBookPro15,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2018",
      additional: "Four Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro14,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2017",
      additional: "Two Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro14,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2017",
      additional: "Four Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro14,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "MacBookPro13,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2016",
      additional: "Two Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro13,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2016",
      additional: "Four Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro13,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2016",
      additional: ""
    },
    {
      key: "MacBookPro11,4",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2015",
      additional: ""
    },
    {
      key: "MacBookPro11,5",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2015",
      additional: ""
    },
    {
      key: "MacBookPro12,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Early 2015",
      additional: ""
    },
    {
      key: "MacBookPro11,2",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "MacBookPro11,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "MacBookPro11,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "MacBookPro10,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookPro10,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "MacBookPro9,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookPro9,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookPro8,3",
      name: "MacBook Pro",
      size: "17-inch",
      processor: "",
      year: "Early 2011",
      additional: ""
    },
    {
      key: "MacBookPro8,2",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Early 2011",
      additional: ""
    },
    {
      key: "MacBookPro8,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Early 2011",
      additional: ""
    },
    {
      key: "MacBookPro6,1",
      name: "MacBook Pro",
      size: "17-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacBookPro6,2",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacBookPro7,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacBookPro5,2",
      name: "MacBook Pro",
      size: "17-inch",
      processor: "",
      year: "Early 2009",
      additional: ""
    },
    {
      key: "MacBookPro5,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2009",
      additional: ""
    },
    {
      key: "MacBookPro5,5",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Mid 2009",
      additional: ""
    },
    {
      key: "MacBookPro5,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Late 2008",
      additional: ""
    },
    {
      key: "MacBookPro4,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Early 2008",
      additional: ""
    },
    {
      key: "MacBook10,1",
      name: "MacBook",
      size: "12-inch",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "MacBook9,1",
      name: "MacBook",
      size: "12-inch",
      processor: "",
      year: "Early 2016",
      additional: ""
    },
    {
      key: "MacBook8,1",
      name: "MacBook",
      size: "12-inch",
      processor: "",
      year: "Early 2015",
      additional: ""
    },
    {
      key: "MacBook7,1",
      name: "MacBook",
      size: "13-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacBook6,1",
      name: "MacBook",
      size: "13-inch",
      processor: "",
      year: "Late 2009",
      additional: ""
    },
    {
      key: "MacBook5,2",
      name: "MacBook",
      size: "13-inch",
      processor: "",
      year: "Early 2009",
      additional: ""
    },
    {
      key: "Mac14,13",
      name: "Mac Studio",
      size: "",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,14",
      name: "Mac Studio",
      size: "",
      processor: "M2 Ultra",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac15,14",
      name: "Mac Studio",
      size: "",
      processor: "M3 Ultra",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac16,9",
      name: "Mac Studio",
      size: "",
      processor: "M4 Max",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac13,1",
      name: "Mac Studio",
      size: "",
      processor: "M1 Max",
      year: "2022",
      additional: ""
    },
    {
      key: "Mac13,2",
      name: "Mac Studio",
      size: "",
      processor: "M1 Ultra",
      year: "2022",
      additional: ""
    },
    {
      key: "Mac16,11",
      name: "Mac mini",
      size: "",
      processor: "M4 Pro",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,10",
      name: "Mac mini",
      size: "",
      processor: "M4",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac14,3",
      name: "Mac mini",
      size: "",
      processor: "M2",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,12",
      name: "Mac mini",
      size: "",
      processor: "M2 Pro",
      year: "2023",
      additional: ""
    },
    {
      key: "Macmini9,1",
      name: "Mac mini",
      size: "",
      processor: "M1",
      year: "2020",
      additional: ""
    },
    {
      key: "Macmini8,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Late 2018",
      additional: ""
    },
    {
      key: "Macmini7,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Late 2014",
      additional: ""
    },
    {
      key: "Macmini6,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "Macmini6,2",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "Macmini5,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "Macmini5,2",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "Macmini4,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "Macmini3,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Early 2009",
      additional: ""
    },
    {
      key: "Mac16,3",
      name: "iMac",
      size: "24-inch",
      processor: "M4",
      year: "2024",
      additional: "Four ports"
    },
    {
      key: "Mac16,2",
      name: "iMac",
      size: "24-inch",
      processor: "M4",
      year: "2024",
      additional: "Two ports"
    },
    {
      key: "Mac15,5",
      name: "iMac",
      size: "24-inch",
      processor: "M3",
      year: "2023",
      additional: "Four ports"
    },
    {
      key: "Mac15,4",
      name: "iMac",
      size: "24-inch",
      processor: "M3",
      year: "2023",
      additional: "Two ports"
    },
    {
      key: "iMac21,1",
      name: "iMac",
      size: "24-inch",
      processor: "M1",
      year: "2021",
      additional: ""
    },
    {
      key: "iMac21,2",
      name: "iMac",
      size: "24-inch",
      processor: "M1",
      year: "2021",
      additional: ""
    },
    {
      key: "iMac20,1",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "2020",
      additional: "Retina 5K"
    },
    {
      key: "iMac20,2",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "2020",
      additional: "Retina 5K"
    },
    {
      key: "iMac19,1",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "2019",
      additional: "Retina 5K"
    },
    {
      key: "iMac19,2",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "2019",
      additional: "Retina 4K"
    },
    {
      key: "iMacPro1,1",
      name: "iMac Pro",
      size: "",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "iMac18,3",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "2017",
      additional: "Retina 5K"
    },
    {
      key: "iMac18,2",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "2017",
      additional: "Retina 4K"
    },
    {
      key: "iMac18,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "iMac17,1",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Late 2015",
      additional: "Retina 5K"
    },
    {
      key: "iMac16,2",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2015",
      additional: "Retina 4K"
    },
    {
      key: "iMac16,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2015",
      additional: ""
    },
    {
      key: "iMac15,1",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Late 2014",
      additional: "Retina 5K"
    },
    {
      key: "iMac14,4",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Mid 2014",
      additional: ""
    },
    {
      key: "iMac14,2",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "iMac14,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "iMac13,2",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "iMac13,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "iMac12,2",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "iMac12,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "iMac11,3",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "iMac11,2",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "iMac10,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2009",
      additional: ""
    },
    {
      key: "iMac9,1",
      name: "iMac",
      size: "20-inch",
      processor: "",
      year: "Early 2009",
      additional: ""
    },
    {
      key: "Mac14,8",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,8",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "2023",
      additional: "Rack"
    },
    {
      key: "MacPro7,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacPro7,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "2019",
      additional: "Rack"
    },
    {
      key: "MacPro6,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "MacPro5,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacPro5,1",
      name: "Mac Pro Server",
      size: "",
      processor: "",
      year: "Mid 2012",
      additional: "Server"
    },
    {
      key: "MacPro5,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacPro5,1",
      name: "Mac Pro Server",
      size: "",
      processor: "",
      year: "Mid 2010",
      additional: "Server"
    },
    {
      key: "MacPro4,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "Early 2009",
      additional: ""
    }
  ];
  const list = appleModelIds.filter((model) => model.key === key);
  if (list.length === 0) {
    return {
      key,
      model: "Apple",
      version: "Unknown"
    };
  }
  const features = [];
  if (list[0].size) {
    features.push(list[0].size);
  }
  if (list[0].processor) {
    features.push(list[0].processor);
  }
  if (list[0].year) {
    features.push(list[0].year);
  }
  if (list[0].additional) {
    features.push(list[0].additional);
  }
  return {
    key,
    model: list[0].name,
    version: list[0].name + " (" + features.join(", ") + ")"
  };
}
function checkWebsite(url, timeout = 5e3) {
  const http = url.startsWith("https:") || url.indexOf(":443/") > 0 || url.indexOf(":8443/") > 0 ? require$$5 : require$$6;
  const t = Date.now();
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      res.on("data", () => {
      });
      res.on("end", () => {
        resolve({
          url,
          statusCode: res.statusCode,
          message: res.statusMessage,
          time: Date.now() - t
        });
      });
    }).on("error", (e) => {
      resolve({
        url,
        statusCode: 404,
        message: e.message,
        time: Date.now() - t
      });
    }).setTimeout(timeout, () => {
      request.destroy();
      resolve({
        url,
        statusCode: 408,
        message: "Request Timeout",
        time: Date.now() - t
      });
    });
  });
}
function cleanString(str) {
  return str.replace(/To Be Filled By O.E.M./g, "");
}
function grep(str, pattern) {
  const result = str.split("\n").filter((line) => line.includes(pattern)).join("\n");
  return result;
}
function noop() {
}
function isProtoKey(key) {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}
util$i.toInt = toInt;
util$i.splitByNumber = splitByNumber;
util$i.execOptsWin = execOptsWin;
util$i.execOptsLinux = execOptsLinux;
util$i.getCodepage = getCodepage;
util$i.execWin = execWin;
util$i.isFunction = isFunction;
util$i.unique = unique;
util$i.sortByKey = sortByKey;
util$i.cores = cores;
util$i.getValue = getValue;
util$i.decodeEscapeSequence = decodeEscapeSequence;
util$i.parseDateTime = parseDateTime;
util$i.parseHead = parseHead;
util$i.findObjectByKey = findObjectByKey;
util$i.darwinXcodeExists = darwinXcodeExists;
util$i.getVboxmanage = getVboxmanage;
util$i.powerShell = powerShell;
util$i.powerShellStart = powerShellStart;
util$i.powerShellRelease = powerShellRelease;
util$i.execSafe = execSafe;
util$i.nanoSeconds = nanoSeconds;
util$i.countUniqueLines = countUniqueLines;
util$i.countLines = countLines;
util$i.noop = noop;
util$i.isRaspberry = isRaspberry;
util$i.isRaspbian = isRaspbian;
util$i.sanitizeShellString = sanitizeShellString;
util$i.sanitizeContainerID = sanitizeContainerID;
util$i.sanitizeImageID = sanitizeImageID;
util$i.isPrototypePolluted = isPrototypePolluted;
util$i.sanitizeString = sanitizeString;
util$i.decodePiCpuinfo = decodePiCpuinfo;
util$i.getRpiGpu = getRpiGpu;
util$i.promiseAll = promiseAll;
util$i.promisify = promisify;
util$i.promisifySave = promisifySave;
util$i.smartMonToolsInstalled = smartMonToolsInstalled;
util$i.linuxVersion = linuxVersion;
util$i.plistParser = plistParser;
util$i.plistReader = plistReader;
util$i.stringObj = stringObj;
util$i.stringReplace = stringReplace;
util$i.stringToLower = stringToLower;
util$i.stringToString = stringToString;
util$i.stringSubstr = stringSubstr;
util$i.stringSubstring = stringSubstring;
util$i.stringTrim = stringTrim;
util$i.stringStartWith = stringStartWith;
util$i.mathMin = mathMin;
util$i.WINDIR = WINDIR;
util$i.getFilesInPath = getFilesInPath;
util$i.semverCompare = semverCompare;
util$i.getAppleModel = getAppleModel;
util$i.checkWebsite = checkWebsite;
util$i.cleanString = cleanString;
util$i.grep = grep;
util$i.getPowershell = getPowershell;
var system$1 = {};
const fs$9 = require$$1$1;
const os$7 = require$$0$1;
const util$h = util$i;
const exec$f = require$$1$4.exec;
const execSync$a = require$$1$4.execSync;
const execPromise = util$h.promisify(require$$1$4.exec);
const _platform$g = process.platform;
const _linux$f = _platform$g === "linux" || _platform$g === "android";
const _darwin$f = _platform$g === "darwin";
const _windows$g = _platform$g === "win32";
const _freebsd$e = _platform$g === "freebsd";
const _openbsd$e = _platform$g === "openbsd";
const _netbsd$e = _platform$g === "netbsd";
const _sunos$e = _platform$g === "sunos";
function system(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        manufacturer: "",
        model: "Computer",
        version: "",
        serial: "-",
        uuid: "-",
        sku: "-",
        virtual: false
      };
      if (_linux$f || _freebsd$e || _openbsd$e || _netbsd$e) {
        exec$f("export LC_ALL=C; dmidecode -t system 2>/dev/null; unset LC_ALL", (error, stdout) => {
          let lines = stdout.toString().split("\n");
          result.manufacturer = cleanDefaults(util$h.getValue(lines, "manufacturer"));
          result.model = cleanDefaults(util$h.getValue(lines, "product name"));
          result.version = cleanDefaults(util$h.getValue(lines, "version"));
          result.serial = cleanDefaults(util$h.getValue(lines, "serial number"));
          result.uuid = cleanDefaults(util$h.getValue(lines, "uuid")).toLowerCase();
          result.sku = cleanDefaults(util$h.getValue(lines, "sku number"));
          const cmd = `echo -n "product_name: "; cat /sys/devices/virtual/dmi/id/product_name 2>/dev/null; echo;
            echo -n "product_serial: "; cat /sys/devices/virtual/dmi/id/product_serial 2>/dev/null; echo;
            echo -n "product_uuid: "; cat /sys/devices/virtual/dmi/id/product_uuid 2>/dev/null; echo;
            echo -n "product_version: "; cat /sys/devices/virtual/dmi/id/product_version 2>/dev/null; echo;
            echo -n "sys_vendor: "; cat /sys/devices/virtual/dmi/id/sys_vendor 2>/dev/null; echo;`;
          try {
            lines = execSync$a(cmd, util$h.execOptsLinux).toString().split("\n");
            result.manufacturer = cleanDefaults(result.manufacturer === "" ? util$h.getValue(lines, "sys_vendor") : result.manufacturer);
            result.model = cleanDefaults(result.model === "" ? util$h.getValue(lines, "product_name") : result.model);
            result.version = cleanDefaults(result.version === "" ? util$h.getValue(lines, "product_version") : result.version);
            result.serial = cleanDefaults(result.serial === "" ? util$h.getValue(lines, "product_serial") : result.serial);
            result.uuid = cleanDefaults(result.uuid === "" ? util$h.getValue(lines, "product_uuid").toLowerCase() : result.uuid);
          } catch {
            util$h.noop();
          }
          if (!result.serial) {
            result.serial = "-";
          }
          if (!result.manufacturer) {
            result.manufacturer = "";
          }
          if (!result.model) {
            result.model = "Computer";
          }
          if (!result.version) {
            result.version = "";
          }
          if (!result.sku) {
            result.sku = "-";
          }
          if (result.model.toLowerCase() === "virtualbox" || result.model.toLowerCase() === "kvm" || result.model.toLowerCase() === "virtual machine" || result.model.toLowerCase() === "bochs" || result.model.toLowerCase().startsWith("vmware") || result.model.toLowerCase().startsWith("droplet")) {
            result.virtual = true;
            switch (result.model.toLowerCase()) {
              case "virtualbox":
                result.virtualHost = "VirtualBox";
                break;
              case "vmware":
                result.virtualHost = "VMware";
                break;
              case "kvm":
                result.virtualHost = "KVM";
                break;
              case "bochs":
                result.virtualHost = "bochs";
                break;
            }
          }
          if (result.manufacturer.toLowerCase().startsWith("vmware") || result.manufacturer.toLowerCase() === "xen") {
            result.virtual = true;
            switch (result.manufacturer.toLowerCase()) {
              case "vmware":
                result.virtualHost = "VMware";
                break;
              case "xen":
                result.virtualHost = "Xen";
                break;
            }
          }
          if (!result.virtual) {
            try {
              const disksById = execSync$a("ls -1 /dev/disk/by-id/ 2>/dev/null; pciconf -lv 2>/dev/null || true", util$h.execOptsLinux).toString();
              if (disksById.indexOf("_QEMU_") >= 0 || disksById.indexOf("QEMU ") >= 0) {
                result.virtual = true;
                result.virtualHost = "QEMU";
              }
              if (disksById.indexOf("_VBOX_") >= 0) {
                result.virtual = true;
                result.virtualHost = "VirtualBox";
              }
            } catch {
              util$h.noop();
            }
          }
          if (_freebsd$e || _openbsd$e || _netbsd$e) {
            try {
              const lines2 = execSync$a("sysctl -i kern.hostuuid kern.hostid hw.model", util$h.execOptsLinux).toString().split("\n");
              if (!result.uuid) {
                result.uuid = util$h.getValue(lines2, "kern.hostuuid", ":").toLowerCase();
              }
              if (!result.serial || result.serial === "-") {
                result.serial = util$h.getValue(lines2, "kern.hostid", ":").toLowerCase();
              }
              if (!result.model || result.model === "Computer") {
                result.model = util$h.getValue(lines2, "hw.model", ":").trim();
              }
            } catch {
              util$h.noop();
            }
          }
          if (!result.virtual && (os$7.release().toLowerCase().indexOf("microsoft") >= 0 || os$7.release().toLowerCase().endsWith("wsl2"))) {
            const kernelVersion = parseFloat(os$7.release().toLowerCase());
            result.virtual = true;
            result.manufacturer = "Microsoft";
            result.model = "WSL";
            result.version = kernelVersion < 4.19 ? "1" : "2";
          }
          if ((_freebsd$e || _openbsd$e || _netbsd$e) && !result.virtualHost) {
            try {
              const procInfo = execSync$a("dmidecode -t 4", util$h.execOptsLinux);
              const procLines = procInfo.toString().split("\n");
              const procManufacturer = util$h.getValue(procLines, "manufacturer", ":", true);
              switch (procManufacturer.toLowerCase()) {
                case "virtualbox":
                  result.virtualHost = "VirtualBox";
                  break;
                case "vmware":
                  result.virtualHost = "VMware";
                  break;
                case "kvm":
                  result.virtualHost = "KVM";
                  break;
                case "bochs":
                  result.virtualHost = "bochs";
                  break;
              }
            } catch {
              util$h.noop();
            }
          }
          if (fs$9.existsSync("/.dockerenv") || fs$9.existsSync("/.dockerinit")) {
            result.model = "Docker Container";
          }
          try {
            const stdout2 = execSync$a('dmesg 2>/dev/null | grep -iE "virtual|hypervisor" | grep -iE "vmware|qemu|kvm|xen" | grep -viE "Nested Virtualization|/virtual/"');
            const lines2 = stdout2.toString().split("\n");
            if (lines2.length > 0) {
              if (result.model === "Computer") {
                result.model = "Virtual machine";
              }
              result.virtual = true;
              if (stdout2.toString().toLowerCase().indexOf("vmware") >= 0 && !result.virtualHost) {
                result.virtualHost = "VMware";
              }
              if (stdout2.toString().toLowerCase().indexOf("qemu") >= 0 && !result.virtualHost) {
                result.virtualHost = "QEMU";
              }
              if (stdout2.toString().toLowerCase().indexOf("xen") >= 0 && !result.virtualHost) {
                result.virtualHost = "Xen";
              }
              if (stdout2.toString().toLowerCase().indexOf("kvm") >= 0 && !result.virtualHost) {
                result.virtualHost = "KVM";
              }
            }
          } catch {
            util$h.noop();
          }
          if (result.manufacturer === "" && result.model === "Computer" && result.version === "") {
            fs$9.readFile("/proc/cpuinfo", (error2, stdout2) => {
              if (!error2) {
                let lines2 = stdout2.toString().split("\n");
                result.model = util$h.getValue(lines2, "hardware", ":", true).toUpperCase();
                result.version = util$h.getValue(lines2, "revision", ":", true).toLowerCase();
                result.serial = util$h.getValue(lines2, "serial", ":", true);
                util$h.getValue(lines2, "model:", ":", true);
                if (util$h.isRaspberry(lines2)) {
                  const rPIRevision = util$h.decodePiCpuinfo(lines2);
                  result.model = rPIRevision.model;
                  result.version = rPIRevision.revisionCode;
                  result.manufacturer = "Raspberry Pi Foundation";
                  result.raspberry = {
                    manufacturer: rPIRevision.manufacturer,
                    processor: rPIRevision.processor,
                    type: rPIRevision.type,
                    revision: rPIRevision.revision
                  };
                }
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        });
      }
      if (_darwin$f) {
        exec$f("ioreg -c IOPlatformExpertDevice -d 2", (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().replace(/[<>"]/g, "").split("\n");
            const model = util$h.getAppleModel(util$h.getValue(lines, "model", "=", true));
            result.manufacturer = util$h.getValue(lines, "manufacturer", "=", true);
            result.model = model.key;
            result.type = macOsChassisType(model.version);
            result.version = model.version;
            result.serial = util$h.getValue(lines, "ioplatformserialnumber", "=", true);
            result.uuid = util$h.getValue(lines, "ioplatformuuid", "=", true).toLowerCase();
            result.sku = util$h.getValue(lines, "board-id", "=", true) || util$h.getValue(lines, "target-sub-type", "=", true);
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$e) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_windows$g) {
        try {
          util$h.powerShell("Get-CimInstance Win32_ComputerSystemProduct | select Name,Vendor,Version,IdentifyingNumber,UUID | fl").then((stdout, error) => {
            if (!error) {
              const lines = stdout.split("\r\n");
              result.manufacturer = util$h.getValue(lines, "vendor", ":");
              result.model = util$h.getValue(lines, "name", ":");
              result.version = util$h.getValue(lines, "version", ":");
              result.serial = util$h.getValue(lines, "identifyingnumber", ":");
              result.uuid = util$h.getValue(lines, "uuid", ":").toLowerCase();
              const model = result.model.toLowerCase();
              if (model === "virtualbox" || model === "kvm" || model === "virtual machine" || model === "bochs" || model.startsWith("vmware") || model.startsWith("qemu") || model.startsWith("parallels")) {
                result.virtual = true;
                if (model.startsWith("virtualbox")) {
                  result.virtualHost = "VirtualBox";
                }
                if (model.startsWith("vmware")) {
                  result.virtualHost = "VMware";
                }
                if (model.startsWith("kvm")) {
                  result.virtualHost = "KVM";
                }
                if (model.startsWith("bochs")) {
                  result.virtualHost = "bochs";
                }
                if (model.startsWith("qemu")) {
                  result.virtualHost = "KVM";
                }
                if (model.startsWith("parallels")) {
                  result.virtualHost = "Parallels";
                }
              }
              const manufacturer = result.manufacturer.toLowerCase();
              if (manufacturer.startsWith("vmware") || manufacturer.startsWith("qemu") || manufacturer === "xen" || manufacturer.startsWith("parallels")) {
                result.virtual = true;
                if (manufacturer.startsWith("vmware")) {
                  result.virtualHost = "VMware";
                }
                if (manufacturer.startsWith("xen")) {
                  result.virtualHost = "Xen";
                }
                if (manufacturer.startsWith("qemu")) {
                  result.virtualHost = "KVM";
                }
                if (manufacturer.startsWith("parallels")) {
                  result.virtualHost = "Parallels";
                }
              }
              util$h.powerShell('Get-CimInstance MS_Systeminformation -Namespace "root/wmi" | select systemsku | fl ').then((stdout2, error2) => {
                if (!error2) {
                  const lines2 = stdout2.split("\r\n");
                  result.sku = util$h.getValue(lines2, "systemsku", ":");
                }
                if (!result.virtual) {
                  util$h.powerShell("Get-CimInstance Win32_bios | select Version, SerialNumber, SMBIOSBIOSVersion").then((stdout3, error3) => {
                    if (!error3) {
                      let lines2 = stdout3.toString();
                      if (lines2.indexOf("VRTUAL") >= 0 || lines2.indexOf("A M I ") >= 0 || lines2.indexOf("VirtualBox") >= 0 || lines2.indexOf("VMWare") >= 0 || lines2.indexOf("Xen") >= 0 || lines2.indexOf("Parallels") >= 0) {
                        result.virtual = true;
                        if (lines2.indexOf("VirtualBox") >= 0 && !result.virtualHost) {
                          result.virtualHost = "VirtualBox";
                        }
                        if (lines2.indexOf("VMware") >= 0 && !result.virtualHost) {
                          result.virtualHost = "VMware";
                        }
                        if (lines2.indexOf("Xen") >= 0 && !result.virtualHost) {
                          result.virtualHost = "Xen";
                        }
                        if (lines2.indexOf("VRTUAL") >= 0 && !result.virtualHost) {
                          result.virtualHost = "Hyper-V";
                        }
                        if (lines2.indexOf("A M I") >= 0 && !result.virtualHost) {
                          result.virtualHost = "Virtual PC";
                        }
                        if (lines2.indexOf("Parallels") >= 0 && !result.virtualHost) {
                          result.virtualHost = "Parallels";
                        }
                      }
                      if (callback) {
                        callback(result);
                      }
                      resolve(result);
                    } else {
                      if (callback) {
                        callback(result);
                      }
                      resolve(result);
                    }
                  });
                } else {
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                }
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
system$1.system = system;
function cleanDefaults(s) {
  const cmpStr = s.toLowerCase();
  if (cmpStr.indexOf("o.e.m.") === -1 && cmpStr.indexOf("default string") === -1 && cmpStr !== "default") {
    return s || "";
  }
  return "";
}
function bios(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        vendor: "",
        version: "",
        releaseDate: "",
        revision: ""
      };
      let cmd = "";
      if (_linux$f || _freebsd$e || _openbsd$e || _netbsd$e) {
        if (process.arch === "arm") {
          cmd = "cat /proc/cpuinfo | grep Serial";
        } else {
          cmd = "export LC_ALL=C; dmidecode -t bios 2>/dev/null; unset LC_ALL";
        }
        exec$f(cmd, (error, stdout) => {
          let lines = stdout.toString().split("\n");
          result.vendor = util$h.getValue(lines, "Vendor");
          result.version = util$h.getValue(lines, "Version");
          let datetime = util$h.getValue(lines, "Release Date");
          result.releaseDate = util$h.parseDateTime(datetime).date;
          result.revision = util$h.getValue(lines, "BIOS Revision");
          result.serial = util$h.getValue(lines, "SerialNumber");
          let language = util$h.getValue(lines, "Currently Installed Language").split("|")[0];
          if (language) {
            result.language = language;
          }
          if (lines.length && stdout.toString().indexOf("Characteristics:") >= 0) {
            const features = [];
            lines.forEach((line) => {
              if (line.indexOf(" is supported") >= 0) {
                const feature = line.split(" is supported")[0].trim();
                features.push(feature);
              }
            });
            result.features = features;
          }
          const cmd2 = `echo -n "bios_date: "; cat /sys/devices/virtual/dmi/id/bios_date 2>/dev/null; echo;
            echo -n "bios_vendor: "; cat /sys/devices/virtual/dmi/id/bios_vendor 2>/dev/null; echo;
            echo -n "bios_version: "; cat /sys/devices/virtual/dmi/id/bios_version 2>/dev/null; echo;`;
          try {
            lines = execSync$a(cmd2, util$h.execOptsLinux).toString().split("\n");
            result.vendor = !result.vendor ? util$h.getValue(lines, "bios_vendor") : result.vendor;
            result.version = !result.version ? util$h.getValue(lines, "bios_version") : result.version;
            datetime = util$h.getValue(lines, "bios_date");
            result.releaseDate = !result.releaseDate ? util$h.parseDateTime(datetime).date : result.releaseDate;
          } catch (e) {
            util$h.noop();
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin$f) {
        result.vendor = "Apple Inc.";
        exec$f("system_profiler SPHardwareDataType -json", (error, stdout) => {
          try {
            const hardwareData = JSON.parse(stdout.toString());
            if (hardwareData && hardwareData.SPHardwareDataType && hardwareData.SPHardwareDataType.length) {
              let bootRomVersion = hardwareData.SPHardwareDataType[0].boot_rom_version;
              bootRomVersion = bootRomVersion ? bootRomVersion.split("(")[0].trim() : null;
              result.version = bootRomVersion;
            }
          } catch (e) {
            util$h.noop();
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$e) {
        result.vendor = "Sun Microsystems";
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_windows$g) {
        try {
          util$h.powerShell(
            'Get-CimInstance Win32_bios | select Description,Version,Manufacturer,@{n="ReleaseDate";e={$_.ReleaseDate.ToString("yyyy-MM-dd")}},BuildNumber,SerialNumber,SMBIOSBIOSVersion | fl'
          ).then((stdout, error) => {
            if (!error) {
              let lines = stdout.toString().split("\r\n");
              const description = util$h.getValue(lines, "description", ":");
              const version2 = util$h.getValue(lines, "SMBIOSBIOSVersion", ":");
              if (description.indexOf(" Version ") !== -1) {
                result.vendor = description.split(" Version ")[0].trim();
                result.version = description.split(" Version ")[1].trim();
              } else if (description.indexOf(" Ver: ") !== -1) {
                result.vendor = util$h.getValue(lines, "manufacturer", ":");
                result.version = description.split(" Ver: ")[1].trim();
              } else {
                result.vendor = util$h.getValue(lines, "manufacturer", ":");
                result.version = version2 || util$h.getValue(lines, "version", ":");
              }
              result.releaseDate = util$h.getValue(lines, "releasedate", ":");
              result.revision = util$h.getValue(lines, "buildnumber", ":");
              result.serial = cleanDefaults(util$h.getValue(lines, "serialnumber", ":"));
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch (e) {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
system$1.bios = bios;
function baseboard(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = {
        manufacturer: "",
        model: "",
        version: "",
        serial: "-",
        assetTag: "-",
        memMax: null,
        memSlots: null
      };
      let cmd = "";
      if (_linux$f || _freebsd$e || _openbsd$e || _netbsd$e) {
        if (process.arch === "arm") {
          cmd = "cat /proc/cpuinfo | grep Serial";
        } else {
          cmd = "export LC_ALL=C; dmidecode -t 2 2>/dev/null; unset LC_ALL";
        }
        const workload = [];
        workload.push(execPromise(cmd));
        workload.push(execPromise("export LC_ALL=C; dmidecode -t memory 2>/dev/null"));
        util$h.promiseAll(workload).then((data) => {
          let lines = data.results[0] ? data.results[0].toString().split("\n") : [""];
          result.manufacturer = cleanDefaults(util$h.getValue(lines, "Manufacturer"));
          result.model = cleanDefaults(util$h.getValue(lines, "Product Name"));
          result.version = cleanDefaults(util$h.getValue(lines, "Version"));
          result.serial = cleanDefaults(util$h.getValue(lines, "Serial Number"));
          result.assetTag = cleanDefaults(util$h.getValue(lines, "Asset Tag"));
          const cmd2 = `echo -n "board_asset_tag: "; cat /sys/devices/virtual/dmi/id/board_asset_tag 2>/dev/null; echo;
            echo -n "board_name: "; cat /sys/devices/virtual/dmi/id/board_name 2>/dev/null; echo;
            echo -n "board_serial: "; cat /sys/devices/virtual/dmi/id/board_serial 2>/dev/null; echo;
            echo -n "board_vendor: "; cat /sys/devices/virtual/dmi/id/board_vendor 2>/dev/null; echo;
            echo -n "board_version: "; cat /sys/devices/virtual/dmi/id/board_version 2>/dev/null; echo;`;
          try {
            lines = execSync$a(cmd2, util$h.execOptsLinux).toString().split("\n");
            result.manufacturer = cleanDefaults(!result.manufacturer ? util$h.getValue(lines, "board_vendor") : result.manufacturer);
            result.model = cleanDefaults(!result.model ? util$h.getValue(lines, "board_name") : result.model);
            result.version = cleanDefaults(!result.version ? util$h.getValue(lines, "board_version") : result.version);
            result.serial = cleanDefaults(!result.serial ? util$h.getValue(lines, "board_serial") : result.serial);
            result.assetTag = cleanDefaults(!result.assetTag ? util$h.getValue(lines, "board_asset_tag") : result.assetTag);
          } catch {
            util$h.noop();
          }
          lines = data.results[1] ? data.results[1].toString().split("\n") : [""];
          result.memMax = util$h.toInt(util$h.getValue(lines, "Maximum Capacity")) * 1024 * 1024 * 1024 || null;
          result.memSlots = util$h.toInt(util$h.getValue(lines, "Number Of Devices")) || null;
          if (util$h.isRaspberry()) {
            const rpi = util$h.decodePiCpuinfo();
            result.manufacturer = rpi.manufacturer;
            result.model = "Raspberry Pi";
            result.serial = rpi.serial;
            result.version = rpi.type + " - " + rpi.revision;
            result.memMax = os$7.totalmem();
            result.memSlots = 0;
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin$f) {
        const workload = [];
        workload.push(execPromise("ioreg -c IOPlatformExpertDevice -d 2"));
        workload.push(execPromise("system_profiler SPMemoryDataType"));
        util$h.promiseAll(workload).then((data) => {
          const lines = data.results[0] ? data.results[0].toString().replace(/[<>"]/g, "").split("\n") : [""];
          result.manufacturer = util$h.getValue(lines, "manufacturer", "=", true);
          result.model = util$h.getValue(lines, "model", "=", true);
          result.version = util$h.getValue(lines, "version", "=", true);
          result.serial = util$h.getValue(lines, "ioplatformserialnumber", "=", true);
          result.assetTag = util$h.getValue(lines, "board-id", "=", true);
          let devices = data.results[1] ? data.results[1].toString().split("        BANK ") : [""];
          if (devices.length === 1) {
            devices = data.results[1] ? data.results[1].toString().split("        DIMM") : [""];
          }
          devices.shift();
          result.memSlots = devices.length;
          if (os$7.arch() === "arm64") {
            result.memSlots = 0;
            result.memMax = os$7.totalmem();
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$e) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_windows$g) {
        try {
          const workload = [];
          const win10plus = parseInt(os$7.release()) >= 10;
          const maxCapacityAttribute = win10plus ? "MaxCapacityEx" : "MaxCapacity";
          workload.push(util$h.powerShell("Get-CimInstance Win32_baseboard | select Model,Manufacturer,Product,Version,SerialNumber,PartNumber,SKU | fl"));
          workload.push(util$h.powerShell(`Get-CimInstance Win32_physicalmemoryarray | select ${maxCapacityAttribute}, MemoryDevices | fl`));
          util$h.promiseAll(workload).then((data) => {
            let lines = data.results[0] ? data.results[0].toString().split("\r\n") : [""];
            result.manufacturer = cleanDefaults(util$h.getValue(lines, "manufacturer", ":"));
            result.model = cleanDefaults(util$h.getValue(lines, "model", ":"));
            if (!result.model) {
              result.model = cleanDefaults(util$h.getValue(lines, "product", ":"));
            }
            result.version = cleanDefaults(util$h.getValue(lines, "version", ":"));
            result.serial = cleanDefaults(util$h.getValue(lines, "serialnumber", ":"));
            result.assetTag = cleanDefaults(util$h.getValue(lines, "partnumber", ":"));
            if (!result.assetTag) {
              result.assetTag = cleanDefaults(util$h.getValue(lines, "sku", ":"));
            }
            lines = data.results[1] ? data.results[1].toString().split("\r\n") : [""];
            result.memMax = util$h.toInt(util$h.getValue(lines, maxCapacityAttribute, ":")) * (win10plus ? 1024 : 1) || null;
            result.memSlots = util$h.toInt(util$h.getValue(lines, "MemoryDevices", ":")) || null;
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
system$1.baseboard = baseboard;
function macOsChassisType(model) {
  model = model.toLowerCase();
  if (model.indexOf("macbookair") >= 0 || model.indexOf("macbook air") >= 0) {
    return "Notebook";
  }
  if (model.indexOf("macbookpro") >= 0 || model.indexOf("macbook pro") >= 0) {
    return "Notebook";
  }
  if (model.indexOf("macbook") >= 0) {
    return "Notebook";
  }
  if (model.indexOf("macmini") >= 0 || model.indexOf("mac mini") >= 0) {
    return "Desktop";
  }
  if (model.indexOf("imac") >= 0) {
    return "Desktop";
  }
  if (model.indexOf("macstudio") >= 0 || model.indexOf("mac studio") >= 0) {
    return "Desktop";
  }
  if (model.indexOf("macpro") >= 0 || model.indexOf("mac pro") >= 0) {
    return "Tower";
  }
  return "Other";
}
function chassis(callback) {
  const chassisTypes = [
    "Other",
    "Unknown",
    "Desktop",
    "Low Profile Desktop",
    "Pizza Box",
    "Mini Tower",
    "Tower",
    "Portable",
    "Laptop",
    "Notebook",
    "Hand Held",
    "Docking Station",
    "All in One",
    "Sub Notebook",
    "Space-Saving",
    "Lunch Box",
    "Main System Chassis",
    "Expansion Chassis",
    "SubChassis",
    "Bus Expansion Chassis",
    "Peripheral Chassis",
    "Storage Chassis",
    "Rack Mount Chassis",
    "Sealed-Case PC",
    "Multi-System Chassis",
    "Compact PCI",
    "Advanced TCA",
    "Blade",
    "Blade Enclosure",
    "Tablet",
    "Convertible",
    "Detachable",
    "IoT Gateway ",
    "Embedded PC",
    "Mini PC",
    "Stick PC"
  ];
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        manufacturer: "",
        model: "",
        type: "",
        version: "",
        serial: "-",
        assetTag: "-",
        sku: ""
      };
      if (_linux$f || _freebsd$e || _openbsd$e || _netbsd$e) {
        const cmd = `echo -n "chassis_asset_tag: "; cat /sys/devices/virtual/dmi/id/chassis_asset_tag 2>/dev/null; echo;
            echo -n "chassis_serial: "; cat /sys/devices/virtual/dmi/id/chassis_serial 2>/dev/null; echo;
            echo -n "chassis_type: "; cat /sys/devices/virtual/dmi/id/chassis_type 2>/dev/null; echo;
            echo -n "chassis_vendor: "; cat /sys/devices/virtual/dmi/id/chassis_vendor 2>/dev/null; echo;
            echo -n "chassis_version: "; cat /sys/devices/virtual/dmi/id/chassis_version 2>/dev/null; echo;`;
        exec$f(cmd, (error, stdout) => {
          let lines = stdout.toString().split("\n");
          result.manufacturer = cleanDefaults(util$h.getValue(lines, "chassis_vendor"));
          const ctype = parseInt(util$h.getValue(lines, "chassis_type").replace(/\D/g, ""));
          result.type = cleanDefaults(ctype && !isNaN(ctype) && ctype <= chassisTypes.length ? chassisTypes[ctype - 1] : "");
          result.version = cleanDefaults(util$h.getValue(lines, "chassis_version"));
          result.serial = cleanDefaults(util$h.getValue(lines, "chassis_serial"));
          result.assetTag = cleanDefaults(util$h.getValue(lines, "chassis_asset_tag"));
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin$f) {
        exec$f("ioreg -c IOPlatformExpertDevice -d 2", (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().replace(/[<>"]/g, "").split("\n");
            const model = util$h.getAppleModel(util$h.getValue(lines, "model", "=", true));
            result.manufacturer = util$h.getValue(lines, "manufacturer", "=", true);
            result.model = model.key;
            result.type = macOsChassisType(model.model);
            result.version = model.version;
            result.serial = util$h.getValue(lines, "ioplatformserialnumber", "=", true);
            result.assetTag = util$h.getValue(lines, "board-id", "=", true) || util$h.getValue(lines, "target-type", "=", true);
            result.sku = util$h.getValue(lines, "target-sub-type", "=", true);
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$e) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_windows$g) {
        try {
          util$h.powerShell("Get-CimInstance Win32_SystemEnclosure | select Model,Manufacturer,ChassisTypes,Version,SerialNumber,PartNumber,SKU,SMBIOSAssetTag | fl").then((stdout, error) => {
            if (!error) {
              let lines = stdout.toString().split("\r\n");
              result.manufacturer = cleanDefaults(util$h.getValue(lines, "manufacturer", ":"));
              result.model = cleanDefaults(util$h.getValue(lines, "model", ":"));
              const ctype = parseInt(util$h.getValue(lines, "ChassisTypes", ":").replace(/\D/g, ""));
              result.type = ctype && !isNaN(ctype) && ctype <= chassisTypes.length ? chassisTypes[ctype - 1] : "";
              result.version = cleanDefaults(util$h.getValue(lines, "version", ":"));
              result.serial = cleanDefaults(util$h.getValue(lines, "serialnumber", ":"));
              result.assetTag = cleanDefaults(util$h.getValue(lines, "partnumber", ":"));
              if (!result.assetTag) {
                result.assetTag = cleanDefaults(util$h.getValue(lines, "SMBIOSAssetTag", ":"));
              }
              result.sku = cleanDefaults(util$h.getValue(lines, "sku", ":"));
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
system$1.chassis = chassis;
var osinfo = {};
const os$6 = require$$0$1;
const fs$8 = require$$1$1;
const util$g = util$i;
const exec$e = require$$1$4.exec;
const execSync$9 = require$$1$4.execSync;
const _platform$f = process.platform;
const _linux$e = _platform$f === "linux" || _platform$f === "android";
const _darwin$e = _platform$f === "darwin";
const _windows$f = _platform$f === "win32";
const _freebsd$d = _platform$f === "freebsd";
const _openbsd$d = _platform$f === "openbsd";
const _netbsd$d = _platform$f === "netbsd";
const _sunos$d = _platform$f === "sunos";
function time() {
  const t = (/* @__PURE__ */ new Date()).toString().split(" ");
  let timezoneName = "";
  try {
    timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezoneName = t.length >= 7 ? t.slice(6).join(" ").replace(/\(/g, "").replace(/\)/g, "") : "";
  }
  const result = {
    current: Date.now(),
    uptime: os$6.uptime(),
    timezone: t.length >= 7 ? t[5] : "",
    timezoneName
  };
  if (_darwin$e || _linux$e) {
    try {
      const stdout = execSync$9("date +%Z && date +%z && ls -l /etc/localtime 2>/dev/null", util$g.execOptsLinux);
      const lines = stdout.toString().split(os$6.EOL);
      if (lines.length > 3 && !lines[0]) {
        lines.shift();
      }
      let timezone = lines[0] || "";
      if (timezone.startsWith("+") || timezone.startsWith("-")) {
        timezone = "GMT";
      }
      return {
        current: Date.now(),
        uptime: os$6.uptime(),
        timezone: lines[1] ? timezone + lines[1] : timezone,
        timezoneName: lines[2] && lines[2].indexOf("/zoneinfo/") > 0 ? lines[2].split("/zoneinfo/")[1] || "" : ""
      };
    } catch {
      util$g.noop();
    }
  }
  return result;
}
osinfo.time = time;
function getLogoFile(distro) {
  distro = distro || "";
  distro = distro.toLowerCase();
  let result = _platform$f;
  if (_windows$f) {
    result = "windows";
  } else if (distro.indexOf("mac os") !== -1 || distro.indexOf("macos") !== -1) {
    result = "apple";
  } else if (distro.indexOf("arch") !== -1) {
    result = "arch";
  } else if (distro.indexOf("cachy") !== -1) {
    result = "cachy";
  } else if (distro.indexOf("centos") !== -1) {
    result = "centos";
  } else if (distro.indexOf("coreos") !== -1) {
    result = "coreos";
  } else if (distro.indexOf("debian") !== -1) {
    result = "debian";
  } else if (distro.indexOf("deepin") !== -1) {
    result = "deepin";
  } else if (distro.indexOf("elementary") !== -1) {
    result = "elementary";
  } else if (distro.indexOf("endeavour") !== -1) {
    result = "endeavour";
  } else if (distro.indexOf("fedora") !== -1) {
    result = "fedora";
  } else if (distro.indexOf("gentoo") !== -1) {
    result = "gentoo";
  } else if (distro.indexOf("mageia") !== -1) {
    result = "mageia";
  } else if (distro.indexOf("mandriva") !== -1) {
    result = "mandriva";
  } else if (distro.indexOf("manjaro") !== -1) {
    result = "manjaro";
  } else if (distro.indexOf("mint") !== -1) {
    result = "mint";
  } else if (distro.indexOf("mx") !== -1) {
    result = "mx";
  } else if (distro.indexOf("openbsd") !== -1) {
    result = "openbsd";
  } else if (distro.indexOf("freebsd") !== -1) {
    result = "freebsd";
  } else if (distro.indexOf("opensuse") !== -1) {
    result = "opensuse";
  } else if (distro.indexOf("pclinuxos") !== -1) {
    result = "pclinuxos";
  } else if (distro.indexOf("puppy") !== -1) {
    result = "puppy";
  } else if (distro.indexOf("popos") !== -1) {
    result = "popos";
  } else if (distro.indexOf("raspbian") !== -1) {
    result = "raspbian";
  } else if (distro.indexOf("reactos") !== -1) {
    result = "reactos";
  } else if (distro.indexOf("redhat") !== -1) {
    result = "redhat";
  } else if (distro.indexOf("slackware") !== -1) {
    result = "slackware";
  } else if (distro.indexOf("sugar") !== -1) {
    result = "sugar";
  } else if (distro.indexOf("steam") !== -1) {
    result = "steam";
  } else if (distro.indexOf("suse") !== -1) {
    result = "suse";
  } else if (distro.indexOf("mate") !== -1) {
    result = "ubuntu-mate";
  } else if (distro.indexOf("lubuntu") !== -1) {
    result = "lubuntu";
  } else if (distro.indexOf("xubuntu") !== -1) {
    result = "xubuntu";
  } else if (distro.indexOf("ubuntu") !== -1) {
    result = "ubuntu";
  } else if (distro.indexOf("solaris") !== -1) {
    result = "solaris";
  } else if (distro.indexOf("tails") !== -1) {
    result = "tails";
  } else if (distro.indexOf("feren") !== -1) {
    result = "ferenos";
  } else if (distro.indexOf("robolinux") !== -1) {
    result = "robolinux";
  } else if (_linux$e && distro) {
    result = distro.toLowerCase().trim().replace(/\s+/g, "-");
  }
  return result;
}
const WINDOWS_RELEASES = [
  [26200, "25H2"],
  [26100, "24H2"],
  [22631, "23H2"],
  [22621, "22H2"],
  [19045, "22H2"],
  [22e3, "21H2"],
  [19044, "21H2"],
  [19043, "21H1"],
  [19042, "20H2"],
  [19041, "2004"],
  [18363, "1909"],
  [18362, "1903"],
  [17763, "1809"],
  [17134, "1803"]
];
function getWindowsRelease(build) {
  for (const [minBuild, label] of WINDOWS_RELEASES) {
    if (build >= minBuild) return label;
  }
  return "";
}
function getFQDN() {
  let fqdn = os$6.hostname();
  if (_linux$e || _darwin$e) {
    try {
      const stdout = execSync$9("hostname -f 2>/dev/null", util$g.execOptsLinux);
      fqdn = stdout.toString().split(os$6.EOL)[0];
    } catch {
      util$g.noop();
    }
  }
  if (_freebsd$d || _openbsd$d || _netbsd$d) {
    try {
      const stdout = execSync$9("hostname 2>/dev/null");
      fqdn = stdout.toString().split(os$6.EOL)[0];
    } catch {
      util$g.noop();
    }
  }
  if (_windows$f) {
    try {
      const stdout = execSync$9("echo %COMPUTERNAME%.%USERDNSDOMAIN%", util$g.execOptsWin);
      fqdn = stdout.toString().replace(".%USERDNSDOMAIN%", "").split(os$6.EOL)[0];
    } catch {
      util$g.noop();
    }
  }
  return fqdn;
}
function osInfo(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        platform: _platform$f === "win32" ? "Windows" : _platform$f,
        distro: "unknown",
        release: "unknown",
        codename: "",
        kernel: os$6.release(),
        arch: os$6.arch(),
        hostname: os$6.hostname(),
        fqdn: getFQDN(),
        codepage: "",
        logofile: "",
        serial: "",
        build: "",
        servicepack: "",
        uefi: false
      };
      if (_linux$e) {
        exec$e("cat /etc/*-release; cat /usr/lib/os-release; cat /etc/openwrt_release", (error, stdout) => {
          let release = {};
          let lines = stdout.toString().split("\n");
          lines.forEach((line) => {
            if (line.indexOf("=") !== -1) {
              release[line.split("=")[0].trim().toUpperCase()] = line.split("=")[1].trim();
            }
          });
          result.distro = (release.DISTRIB_ID || release.NAME || "unknown").replace(/"/g, "");
          result.logofile = getLogoFile(result.distro);
          let releaseVersion = (release.VERSION || "").replace(/"/g, "");
          let codename = (release.DISTRIB_CODENAME || release.VERSION_CODENAME || "").replace(/"/g, "");
          const prettyName = (release.PRETTY_NAME || "").replace(/"/g, "");
          if (prettyName.indexOf(result.distro + " ") === 0) {
            releaseVersion = prettyName.replace(result.distro + " ", "").trim();
          }
          if (releaseVersion.indexOf("(") >= 0) {
            codename = releaseVersion.split("(")[1].replace(/[()]/g, "").trim();
            releaseVersion = releaseVersion.split("(")[0].trim();
          }
          result.release = (releaseVersion || release.DISTRIB_RELEASE || release.VERSION_ID || "unknown").replace(/"/g, "");
          result.codename = codename;
          result.codepage = util$g.getCodepage();
          result.build = (release.BUILD_ID || "").replace(/"/g, "").trim();
          isUefiLinux().then((uefi) => {
            result.uefi = uefi;
            uuid().then((data) => {
              result.serial = data.os;
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          });
        });
      }
      if (_freebsd$d || _openbsd$d || _netbsd$d) {
        exec$e("sysctl kern.ostype kern.osrelease kern.osrevision kern.hostuuid machdep.bootmethod kern.geom.confxml", (error, stdout) => {
          let lines = stdout.toString().split("\n");
          const distro = util$g.getValue(lines, "kern.ostype");
          const logofile = getLogoFile(distro);
          const release = util$g.getValue(lines, "kern.osrelease").split("-")[0];
          const serial = util$g.getValue(lines, "kern.hostuuid");
          const bootmethod = util$g.getValue(lines, "machdep.bootmethod");
          const uefiConf = stdout.toString().indexOf("<type>efi</type>") >= 0;
          const uefi = bootmethod ? bootmethod.toLowerCase().indexOf("uefi") >= 0 : uefiConf ? uefiConf : null;
          result.distro = distro || result.distro;
          result.logofile = logofile || result.logofile;
          result.release = release || result.release;
          result.serial = serial || result.serial;
          result.codename = "";
          result.codepage = util$g.getCodepage();
          result.uefi = uefi || null;
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin$e) {
        exec$e("sw_vers; sysctl kern.ostype kern.osrelease kern.osrevision kern.uuid", (error, stdout) => {
          let lines = stdout.toString().split("\n");
          result.serial = util$g.getValue(lines, "kern.uuid");
          result.distro = util$g.getValue(lines, "ProductName");
          result.release = (util$g.getValue(lines, "ProductVersion", ":", true, true) + " " + util$g.getValue(lines, "ProductVersionExtra", ":", true, true)).trim();
          result.build = util$g.getValue(lines, "BuildVersion");
          result.logofile = getLogoFile(result.distro);
          result.codename = "macOS";
          result.codename = result.release.indexOf("10.4") > -1 ? "OS X Tiger" : result.codename;
          result.codename = result.release.indexOf("10.5") > -1 ? "OS X Leopard" : result.codename;
          result.codename = result.release.indexOf("10.6") > -1 ? "OS X Snow Leopard" : result.codename;
          result.codename = result.release.indexOf("10.7") > -1 ? "OS X Lion" : result.codename;
          result.codename = result.release.indexOf("10.8") > -1 ? "OS X Mountain Lion" : result.codename;
          result.codename = result.release.indexOf("10.9") > -1 ? "OS X Mavericks" : result.codename;
          result.codename = result.release.indexOf("10.10") > -1 ? "OS X Yosemite" : result.codename;
          result.codename = result.release.indexOf("10.11") > -1 ? "OS X El Capitan" : result.codename;
          result.codename = result.release.indexOf("10.12") > -1 ? "Sierra" : result.codename;
          result.codename = result.release.indexOf("10.13") > -1 ? "High Sierra" : result.codename;
          result.codename = result.release.indexOf("10.14") > -1 ? "Mojave" : result.codename;
          result.codename = result.release.indexOf("10.15") > -1 ? "Catalina" : result.codename;
          result.codename = result.release.startsWith("11.") ? "Big Sur" : result.codename;
          result.codename = result.release.startsWith("12.") ? "Monterey" : result.codename;
          result.codename = result.release.startsWith("13.") ? "Ventura" : result.codename;
          result.codename = result.release.startsWith("14.") ? "Sonoma" : result.codename;
          result.codename = result.release.startsWith("15.") ? "Sequoia" : result.codename;
          result.codename = result.release.startsWith("26.") ? "Tahoe" : result.codename;
          result.codename = result.release.startsWith("27.") ? "Golden Gate" : result.codename;
          result.uefi = true;
          result.codepage = util$g.getCodepage();
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$d) {
        result.release = result.kernel;
        exec$e("uname -o", (error, stdout) => {
          const lines = stdout.toString().split("\n");
          result.distro = lines[0];
          result.logofile = getLogoFile(result.distro);
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows$f) {
        result.logofile = getLogoFile();
        result.release = result.kernel;
        try {
          const workload = [];
          workload.push(util$g.powerShell("Get-CimInstance Win32_OperatingSystem | select Caption,SerialNumber,BuildNumber,ServicePackMajorVersion,ServicePackMinorVersion | fl"));
          workload.push(util$g.powerShell("(Get-CimInstance Win32_ComputerSystem).HypervisorPresent"));
          workload.push(util$g.powerShell("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SystemInformation]::TerminalServerSession"));
          workload.push(util$g.powerShell('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" /v DisplayVersion'));
          util$g.promiseAll(workload).then((data) => {
            const lines = data.results[0] ? data.results[0].toString().split("\r\n") : [""];
            result.distro = util$g.getValue(lines, "Caption", ":").trim();
            result.serial = util$g.getValue(lines, "SerialNumber", ":").trim();
            result.build = util$g.getValue(lines, "BuildNumber", ":").trim();
            result.servicepack = util$g.getValue(lines, "ServicePackMajorVersion", ":").trim() + "." + util$g.getValue(lines, "ServicePackMinorVersion", ":").trim();
            result.codepage = util$g.getCodepage();
            const hyperv = data.results[1] ? data.results[1].toString().toLowerCase() : "";
            result.hypervisor = hyperv.indexOf("true") !== -1;
            const term = data.results[2] ? data.results[2].toString() : "";
            if (data.results[3]) {
              const codenameParts = data.results[3].split("REG_SZ");
              result.codename = codenameParts.length > 1 ? codenameParts[1].trim() : "";
            }
            if (!result.codename) {
              const buildNum = parseInt(result.build, 10);
              result.codename = getWindowsRelease(buildNum);
            }
            result.remoteSession = term.toString().toLowerCase().indexOf("true") >= 0;
            isUefiWindows().then((uefi) => {
              result.uefi = uefi;
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
osinfo.osInfo = osInfo;
function isUefiLinux() {
  return new Promise((resolve) => {
    process.nextTick(() => {
      fs$8.stat("/sys/firmware/efi", (err2) => {
        if (!err2) {
          return resolve(true);
        } else {
          exec$e('dmesg | grep -E "EFI v"', (error, stdout) => {
            if (!error) {
              const lines = stdout.toString().split("\n");
              return resolve(lines.length > 0);
            }
            return resolve(false);
          });
        }
      });
    });
  });
}
function isUefiWindows() {
  return new Promise((resolve) => {
    process.nextTick(() => {
      try {
        exec$e('findstr /C:"Detected boot environment" "%windir%\\Panther\\setupact.log"', util$g.execOptsWin, (error, stdout) => {
          if (!error) {
            const line = stdout.toString().split("\n\r")[0];
            return resolve(line.toLowerCase().indexOf("efi") >= 0);
          } else {
            exec$e("echo %firmware_type%", util$g.execOptsWin, (error2, stdout2) => {
              if (!error2) {
                const line = stdout2.toString() || "";
                return resolve(line.toLowerCase().indexOf("efi") >= 0);
              } else {
                return resolve(false);
              }
            });
          }
        });
      } catch {
        return resolve(false);
      }
    });
  });
}
function versions(apps, callback) {
  let versionObject = {
    kernel: os$6.release(),
    apache: "",
    bash: "",
    bun: "",
    deno: "",
    docker: "",
    dotnet: "",
    fish: "",
    gcc: "",
    git: "",
    grunt: "",
    gulp: "",
    homebrew: "",
    java: "",
    mongodb: "",
    mysql: "",
    nginx: "",
    node: "",
    //process.versions.node,
    npm: "",
    openssl: "",
    perl: "",
    php: "",
    pip3: "",
    pip: "",
    pm2: "",
    postfix: "",
    postgresql: "",
    powershell: "",
    python3: "",
    python: "",
    redis: "",
    systemOpenssl: "",
    systemOpensslLib: "",
    tsc: "",
    v8: process.versions.v8,
    virtualbox: "",
    yarn: "",
    zsh: ""
  };
  function checkVersionParam(apps2) {
    if (apps2 === "*") {
      return {
        versions: versionObject,
        counter: 34
      };
    }
    if (!Array.isArray(apps2)) {
      apps2 = apps2.trim().toLowerCase().replace(/,+/g, "|").replace(/ /g, "|");
      apps2 = apps2.split("|");
      const result = {
        versions: {},
        counter: 0
      };
      apps2.forEach((el) => {
        if (el) {
          for (let key in versionObject) {
            if ({}.hasOwnProperty.call(versionObject, key)) {
              if (key.toLowerCase() === el.toLowerCase() && !{}.hasOwnProperty.call(result.versions, key)) {
                result.versions[key] = versionObject[key];
                if (key === "openssl") {
                  result.versions.systemOpenssl = "";
                  result.versions.systemOpensslLib = "";
                }
                if (!result.versions[key]) {
                  result.counter++;
                }
              }
            }
          }
        }
      });
      return result;
    }
  }
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (util$g.isFunction(apps) && !callback) {
        callback = apps;
        apps = "*";
      } else {
        apps = apps || "*";
        if (typeof apps !== "string") {
          if (callback) {
            callback({});
          }
          return resolve({});
        }
      }
      const appsObj = checkVersionParam(apps);
      let totalFunctions = appsObj.counter;
      if (totalFunctions <= 0) {
        if (callback) {
          callback(appsObj.versions);
        }
        return resolve(appsObj.versions);
      }
      let functionProcessed = /* @__PURE__ */ (() => {
        return () => {
          if (--totalFunctions === 0) {
            if (callback) {
              callback(appsObj.versions);
            }
            resolve(appsObj.versions);
          }
        };
      })();
      let cmd = "";
      try {
        if ({}.hasOwnProperty.call(appsObj.versions, "openssl")) {
          appsObj.versions.openssl = process.versions.openssl;
          exec$e("openssl version", (error, stdout) => {
            if (!error) {
              let openssl_string = stdout.toString().split("\n")[0].trim();
              let openssl = openssl_string.split(" ");
              appsObj.versions.systemOpenssl = openssl.length > 0 ? openssl[1] : openssl[0];
              appsObj.versions.systemOpensslLib = openssl.length > 0 ? openssl[0] : "openssl";
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "npm")) {
          exec$e("npm -v", (error, stdout) => {
            if (!error) {
              appsObj.versions.npm = stdout.toString().split("\n")[0];
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "pm2")) {
          cmd = "pm2";
          if (_windows$f) {
            cmd += ".cmd";
          }
          exec$e(`${cmd} -v`, (error, stdout) => {
            if (!error) {
              let pm2 = stdout.toString().split("\n")[0].trim();
              if (!pm2.startsWith("[PM2]")) {
                appsObj.versions.pm2 = pm2;
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "yarn")) {
          exec$e("yarn --version", (error, stdout) => {
            if (!error) {
              appsObj.versions.yarn = stdout.toString().split("\n")[0];
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "gulp")) {
          cmd = "gulp";
          if (_windows$f) {
            cmd += ".cmd";
          }
          exec$e(`${cmd} --version`, (error, stdout) => {
            if (!error) {
              const gulp = stdout.toString().split("\n")[0] || "";
              appsObj.versions.gulp = (gulp.toLowerCase().split("version")[1] || "").trim();
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "homebrew")) {
          cmd = "brew";
          exec$e(`${cmd} --version`, (error, stdout) => {
            if (!error) {
              const brew = stdout.toString().split("\n")[0] || "";
              appsObj.versions.homebrew = (brew.toLowerCase().split(" ")[1] || "").trim();
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "tsc")) {
          cmd = "tsc";
          if (_windows$f) {
            cmd += ".cmd";
          }
          exec$e(`${cmd} --version`, (error, stdout) => {
            if (!error) {
              const tsc = stdout.toString().split("\n")[0] || "";
              appsObj.versions.tsc = (tsc.toLowerCase().split("version")[1] || "").trim();
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "grunt")) {
          cmd = "grunt";
          if (_windows$f) {
            cmd += ".cmd";
          }
          exec$e(`${cmd} --version`, (error, stdout) => {
            if (!error) {
              const grunt = stdout.toString().split("\n")[0] || "";
              appsObj.versions.grunt = (grunt.toLowerCase().split("cli v")[1] || "").trim();
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "git")) {
          if (_darwin$e) {
            const gitHomebrewExists = fs$8.existsSync("/usr/local/Cellar/git") || fs$8.existsSync("/opt/homebrew/bin/git");
            if (util$g.darwinXcodeExists() || gitHomebrewExists) {
              exec$e("git --version", (error, stdout) => {
                if (!error) {
                  let git = stdout.toString().split("\n")[0] || "";
                  git = (git.toLowerCase().split("version")[1] || "").trim();
                  appsObj.versions.git = (git.split(" ")[0] || "").trim();
                }
                functionProcessed();
              });
            } else {
              functionProcessed();
            }
          } else {
            exec$e("git --version", (error, stdout) => {
              if (!error) {
                let git = stdout.toString().split("\n")[0] || "";
                git = (git.toLowerCase().split("version")[1] || "").trim();
                appsObj.versions.git = (git.split(" ")[0] || "").trim();
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "apache")) {
          exec$e("apachectl -v 2>&1", (error, stdout) => {
            if (!error) {
              const apache = (stdout.toString().split("\n")[0] || "").split(":");
              appsObj.versions.apache = apache.length > 1 ? apache[1].replace("Apache", "").replace("/", "").split("(")[0].trim() : "";
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "nginx")) {
          exec$e("nginx -v 2>&1", (error, stdout) => {
            if (!error) {
              const nginx = stdout.toString().split("\n")[0] || "";
              appsObj.versions.nginx = (nginx.toLowerCase().split("/")[1] || "").trim();
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "mysql")) {
          exec$e("mysql -V", (error, stdout) => {
            if (!error) {
              let mysql = stdout.toString().split("\n")[0] || "";
              mysql = mysql.toLowerCase();
              if (mysql.indexOf(",") > -1) {
                mysql = (mysql.split(",")[0] || "").trim();
                const parts = mysql.split(" ");
                appsObj.versions.mysql = (parts[parts.length - 1] || "").trim();
              } else {
                if (mysql.indexOf(" ver ") > -1) {
                  mysql = mysql.split(" ver ")[1];
                  appsObj.versions.mysql = mysql.split(" ")[0];
                }
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "php")) {
          exec$e("php -v", (error, stdout) => {
            if (!error) {
              const php = stdout.toString().split("\n")[0] || "";
              let parts = php.split("(");
              if (parts[0].indexOf("-")) {
                parts = parts[0].split("-");
              }
              appsObj.versions.php = parts[0].replace(/[^0-9.]/g, "");
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "redis")) {
          exec$e("redis-server --version", (error, stdout) => {
            if (!error) {
              const redis = stdout.toString().split("\n")[0] || "";
              const parts = redis.split(" ");
              appsObj.versions.redis = util$g.getValue(parts, "v", "=", true);
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "docker")) {
          exec$e("docker --version", (error, stdout) => {
            if (!error) {
              const docker2 = stdout.toString().split("\n")[0] || "";
              const parts = docker2.split(" ");
              appsObj.versions.docker = parts.length > 2 && parts[2].endsWith(",") ? parts[2].slice(0, -1) : "";
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "postfix")) {
          exec$e("postconf -d | grep mail_version", (error, stdout) => {
            if (!error) {
              const postfix = stdout.toString().split("\n") || [];
              appsObj.versions.postfix = util$g.getValue(postfix, "mail_version", "=", true);
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "mongodb")) {
          exec$e("mongod --version", (error, stdout) => {
            if (!error) {
              const mongodb = stdout.toString().split("\n")[0] || "";
              appsObj.versions.mongodb = (mongodb.toLowerCase().split(",")[0] || "").replace(/[^0-9.]/g, "");
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "postgresql")) {
          if (_windows$f) {
            util$g.powerShell("Get-CimInstance Win32_Service | select caption | fl").then((stdout) => {
              let serviceSections = stdout.split(/\n\s*\n/);
              serviceSections.forEach((item) => {
                if (item.trim() !== "") {
                  let lines = item.trim().split("\r\n");
                  let srvCaption = util$g.getValue(lines, "caption", ":", true).toLowerCase();
                  if (srvCaption.indexOf("postgresql") > -1) {
                    const parts = srvCaption.split(" server ");
                    if (parts.length > 1) {
                      appsObj.versions.postgresql = parts[1];
                    }
                  }
                }
              });
              functionProcessed();
            });
          } else {
            const parsePostgres = (stdout) => {
              const postgresql = stdout.toString().split("\n")[0].split(" ") || [];
              let version2 = postgresql.length ? postgresql[postgresql.length - 1] : "";
              if (version2.includes("(") && postgresql.length >= 2 && !postgresql[postgresql.length - 2].includes("(")) {
                version2 = postgresql[postgresql.length - 2];
              }
              return version2.split("-")[0];
            };
            const tryPostgres = (cmds) => {
              if (!cmds.length) {
                return functionProcessed();
              }
              exec$e(cmds[0], (error, stdout) => {
                if (!error && stdout.toString().trim()) {
                  appsObj.versions.postgresql = parsePostgres(stdout);
                  functionProcessed();
                } else {
                  tryPostgres(cmds.slice(1));
                }
              });
            };
            tryPostgres(["postgres -V", "pg_config --version", "psql -V"]);
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "perl")) {
          exec$e("perl -v", (error, stdout) => {
            if (!error) {
              const perl = stdout.toString().split("\n") || "";
              while (perl.length > 0 && perl[0].trim() === "") {
                perl.shift();
              }
              if (perl.length > 0) {
                appsObj.versions.perl = perl[0].split("(").pop().split(")")[0].replace("v", "");
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "python")) {
          if (_darwin$e) {
            try {
              const stdout = execSync$9("sw_vers");
              const lines = stdout.toString().split("\n");
              const osVersion = util$g.getValue(lines, "ProductVersion", ":");
              const gitHomebrewExists1 = fs$8.existsSync("/usr/local/Cellar/python");
              const gitHomebrewExists2 = fs$8.existsSync("/opt/homebrew/bin/python");
              if (util$g.darwinXcodeExists() && util$g.semverCompare("12.0.1", osVersion) < 0 || gitHomebrewExists1 || gitHomebrewExists2) {
                const cmd2 = gitHomebrewExists1 ? "/usr/local/Cellar/python -V 2>&1" : gitHomebrewExists2 ? "/opt/homebrew/bin/python -V 2>&1" : "python -V 2>&1";
                exec$e(cmd2, (error, stdout2) => {
                  if (!error) {
                    const python = stdout2.toString().split("\n")[0] || "";
                    appsObj.versions.python = python.toLowerCase().replace("python", "").trim();
                  }
                  functionProcessed();
                });
              } else {
                functionProcessed();
              }
            } catch {
              functionProcessed();
            }
          } else {
            exec$e("python -V 2>&1", (error, stdout) => {
              if (!error) {
                const python = stdout.toString().split("\n")[0] || "";
                appsObj.versions.python = python.toLowerCase().replace("python", "").trim();
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "python3")) {
          if (_darwin$e) {
            const gitHomebrewExists = fs$8.existsSync("/usr/local/Cellar/python3") || fs$8.existsSync("/opt/homebrew/bin/python3");
            if (util$g.darwinXcodeExists() || gitHomebrewExists) {
              exec$e("python3 -V 2>&1", (error, stdout) => {
                if (!error) {
                  const python = stdout.toString().split("\n")[0] || "";
                  appsObj.versions.python3 = python.toLowerCase().replace("python", "").trim();
                }
                functionProcessed();
              });
            } else {
              functionProcessed();
            }
          } else {
            exec$e("python3 -V 2>&1", (error, stdout) => {
              if (!error) {
                const python = stdout.toString().split("\n")[0] || "";
                appsObj.versions.python3 = python.toLowerCase().replace("python", "").trim();
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "pip")) {
          if (_darwin$e) {
            const gitHomebrewExists = fs$8.existsSync("/usr/local/Cellar/pip") || fs$8.existsSync("/opt/homebrew/bin/pip");
            if (util$g.darwinXcodeExists() || gitHomebrewExists) {
              exec$e("pip -V 2>&1", (error, stdout) => {
                if (!error) {
                  const pip = stdout.toString().split("\n")[0] || "";
                  const parts = pip.split(" ");
                  appsObj.versions.pip = parts.length >= 2 ? parts[1] : "";
                }
                functionProcessed();
              });
            } else {
              functionProcessed();
            }
          } else {
            exec$e("pip -V 2>&1", (error, stdout) => {
              if (!error) {
                const pip = stdout.toString().split("\n")[0] || "";
                const parts = pip.split(" ");
                appsObj.versions.pip = parts.length >= 2 ? parts[1] : "";
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "pip3")) {
          if (_darwin$e) {
            const gitHomebrewExists = fs$8.existsSync("/usr/local/Cellar/pip3") || fs$8.existsSync("/opt/homebrew/bin/pip3");
            if (util$g.darwinXcodeExists() || gitHomebrewExists) {
              exec$e("pip3 -V 2>&1", (error, stdout) => {
                if (!error) {
                  const pip = stdout.toString().split("\n")[0] || "";
                  const parts = pip.split(" ");
                  appsObj.versions.pip3 = parts.length >= 2 ? parts[1] : "";
                }
                functionProcessed();
              });
            } else {
              functionProcessed();
            }
          } else {
            exec$e("pip3 -V 2>&1", (error, stdout) => {
              if (!error) {
                const pip = stdout.toString().split("\n")[0] || "";
                const parts = pip.split(" ");
                appsObj.versions.pip3 = parts.length >= 2 ? parts[1] : "";
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "java")) {
          if (_darwin$e) {
            exec$e("/usr/libexec/java_home -V 2>&1", (error, stdout) => {
              if (!error && stdout.toString().toLowerCase().indexOf("no java runtime") === -1) {
                exec$e("java -version 2>&1", (error2, stdout2) => {
                  if (!error2) {
                    const java = stdout2.toString().split("\n")[0] || "";
                    const parts = java.split('"');
                    appsObj.versions.java = parts.length === 3 ? parts[1].trim() : "";
                  }
                  functionProcessed();
                });
              } else {
                functionProcessed();
              }
            });
          } else {
            exec$e("java -version 2>&1", (error, stdout) => {
              if (!error) {
                const java = stdout.toString().split("\n")[0] || "";
                const parts = java.split('"');
                appsObj.versions.java = parts.length === 3 ? parts[1].trim() : "";
              }
              functionProcessed();
            });
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "gcc")) {
          if (_darwin$e && util$g.darwinXcodeExists() || !_darwin$e) {
            exec$e("gcc -dumpversion", (error, stdout) => {
              if (!error) {
                appsObj.versions.gcc = stdout.toString().split("\n")[0].trim() || "";
              }
              if (appsObj.versions.gcc.indexOf(".") > -1) {
                functionProcessed();
              } else {
                exec$e("gcc --version", (error2, stdout2) => {
                  if (!error2) {
                    const gcc = stdout2.toString().split("\n")[0].trim();
                    if (gcc.indexOf("gcc") > -1 && gcc.indexOf(")") > -1) {
                      const parts = gcc.split(")");
                      appsObj.versions.gcc = parts[1].trim() || appsObj.versions.gcc;
                    }
                  }
                  functionProcessed();
                });
              }
            });
          } else {
            functionProcessed();
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "virtualbox")) {
          exec$e(util$g.getVboxmanage() + " -v 2>&1", (error, stdout) => {
            if (!error) {
              const vbox = stdout.toString().split("\n")[0] || "";
              const parts = vbox.split("r");
              appsObj.versions.virtualbox = parts[0];
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "bash")) {
          exec$e("bash --version", (error, stdout) => {
            if (!error) {
              const line = stdout.toString().split("\n")[0];
              const parts = line.split(" version ");
              if (parts.length > 1) {
                appsObj.versions.bash = parts[1].split(" ")[0].split("(")[0];
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "zsh")) {
          exec$e("zsh --version", (error, stdout) => {
            if (!error) {
              const line = stdout.toString().split("\n")[0];
              const parts = line.split("zsh ");
              if (parts.length > 1) {
                appsObj.versions.zsh = parts[1].split(" ")[0];
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "fish")) {
          exec$e("fish --version", (error, stdout) => {
            if (!error) {
              const line = stdout.toString().split("\n")[0];
              const parts = line.split(" version ");
              if (parts.length > 1) {
                appsObj.versions.fish = parts[1].split(" ")[0];
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "bun")) {
          exec$e("bun -v", (error, stdout) => {
            if (!error) {
              const line = stdout.toString().split("\n")[0].trim();
              appsObj.versions.bun = line;
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "deno")) {
          exec$e("deno -v", (error, stdout) => {
            if (!error) {
              const line = stdout.toString().split("\n")[0].trim();
              const parts = line.split(" ");
              if (parts.length > 1) {
                appsObj.versions.deno = parts[1];
              }
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "node")) {
          exec$e("node -v", (error, stdout) => {
            if (!error) {
              let line = stdout.toString().split("\n")[0].trim();
              if (line.startsWith("v")) {
                line = line.slice(1);
              }
              appsObj.versions.node = line;
            }
            functionProcessed();
          });
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "powershell")) {
          if (_windows$f) {
            util$g.powerShell("$PSVersionTable").then((stdout) => {
              const lines = stdout.toString().toLowerCase().split("\n").map((line) => line.replace(/ +/g, " ").replace(/ +/g, ":"));
              appsObj.versions.powershell = util$g.getValue(lines, "psversion");
              functionProcessed();
            });
          } else {
            functionProcessed();
          }
        }
        if ({}.hasOwnProperty.call(appsObj.versions, "dotnet")) {
          if (_windows$f) {
            util$g.powerShell(
              'gci "HKLM:\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP" -recurse | gp -name Version,Release -EA 0 | where { $_.PSChildName -match "^(?!S)\\p{L}"} | select PSChildName, Version, Release'
            ).then((stdout) => {
              const lines = stdout.toString().split("\r\n");
              let dotnet = "";
              lines.forEach((line) => {
                line = line.replace(/ +/g, " ");
                const parts = line.split(" ");
                dotnet = dotnet || (parts[0].toLowerCase().startsWith("client") && parts.length > 2 ? parts[1].trim() : parts[0].toLowerCase().startsWith("full") && parts.length > 2 ? parts[1].trim() : "");
              });
              appsObj.versions.dotnet = dotnet.trim();
              functionProcessed();
            });
          } else {
            functionProcessed();
          }
        }
      } catch {
        if (callback) {
          callback(appsObj.versions);
        }
        resolve(appsObj.versions);
      }
    });
  });
}
osinfo.versions = versions;
function shell(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (_windows$f) {
        try {
          util$g.powerShell(`Get-CimInstance -className win32_process | where-object {$_.ProcessId -eq ${process.ppid} } | select Name`).then((stdout) => {
            let result = "CMD";
            if (stdout) {
              if (stdout.toString().toLowerCase().indexOf("powershell") >= 0) {
                result = "PowerShell";
              }
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback("CMD");
          }
          resolve("CMD");
        }
      } else {
        let result = "";
        exec$e("echo $SHELL", (error, stdout) => {
          if (!error) {
            result = stdout.toString().split("\n")[0];
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
    });
  });
}
osinfo.shell = shell;
function getUniqueMacAdresses() {
  let macs = [];
  try {
    const ifaces = os$6.networkInterfaces();
    for (let dev in ifaces) {
      if ({}.hasOwnProperty.call(ifaces, dev)) {
        ifaces[dev].forEach((details) => {
          if (details && details.mac && details.mac !== "00:00:00:00:00:00") {
            const mac = details.mac.toLowerCase();
            if (macs.indexOf(mac) === -1) {
              macs.push(mac);
            }
          }
        });
      }
    }
    macs = macs.sort((a, b) => {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });
  } catch {
    macs.push("00:00:00:00:00:00");
  }
  return macs;
}
function uuid(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        os: "",
        hardware: "",
        macs: getUniqueMacAdresses()
      };
      let parts;
      if (_darwin$e) {
        exec$e("system_profiler SPHardwareDataType -json", (error, stdout) => {
          if (!error) {
            try {
              const jsonObj = JSON.parse(stdout.toString());
              if (jsonObj.SPHardwareDataType && jsonObj.SPHardwareDataType.length > 0) {
                const spHardware = jsonObj.SPHardwareDataType[0];
                result.os = spHardware.platform_UUID.toLowerCase();
                result.hardware = spHardware.serial_number;
              }
            } catch {
              util$g.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_linux$e) {
        const cmd = `echo -n "os: "; cat /var/lib/dbus/machine-id 2> /dev/null ||
cat /etc/machine-id 2> /dev/null; echo;
echo -n "hardware: "; cat /sys/class/dmi/id/product_uuid 2> /dev/null; echo;`;
        exec$e(cmd, (error, stdout) => {
          const lines = stdout.toString().split("\n");
          result.os = util$g.getValue(lines, "os").toLowerCase();
          result.hardware = util$g.getValue(lines, "hardware").toLowerCase();
          if (!result.hardware) {
            try {
              const lines2 = fs$8.readFileSync("/proc/cpuinfo", { encoding: "utf8" }).toString().split("\n");
              const serial = util$g.getValue(lines2, "serial");
              result.hardware = serial || "";
            } catch {
              result.hardware = "";
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_freebsd$d || _openbsd$d || _netbsd$d) {
        exec$e("sysctl -i kern.hostid kern.hostuuid", (error, stdout) => {
          const lines = stdout.toString().split("\n");
          result.hardware = util$g.getValue(lines, "kern.hostid", ":").toLowerCase();
          result.os = util$g.getValue(lines, "kern.hostuuid", ":").toLowerCase();
          if (result.os.indexOf("unknown") >= 0) {
            result.os = "";
          }
          if (result.hardware.indexOf("unknown") >= 0) {
            result.hardware = "";
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows$f) {
        let sysdir = "%windir%\\System32";
        if (process.arch === "ia32" && Object.prototype.hasOwnProperty.call(process.env, "PROCESSOR_ARCHITEW6432")) {
          sysdir = "%windir%\\sysnative\\cmd.exe /c %windir%\\System32";
        }
        util$g.powerShell("Get-CimInstance Win32_ComputerSystemProduct | select UUID | fl").then((stdout) => {
          let lines = stdout.split("\r\n");
          result.hardware = util$g.getValue(lines, "uuid", ":").toLowerCase();
          exec$e(`${sysdir}\\reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid`, util$g.execOptsWin, (error, stdout2) => {
            parts = stdout2.toString().split("\n\r")[0].split("REG_SZ");
            result.os = parts.length > 1 ? parts[1].replace(/\r+|\n+|\s+/gi, "").toLowerCase() : "";
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        });
      }
    });
  });
}
osinfo.uuid = uuid;
var cpu$1 = {};
const os$5 = require$$0$1;
const exec$d = require$$1$4.exec;
const execSync$8 = require$$1$4.execSync;
const fs$7 = require$$1$1;
const util$f = util$i;
const _platform$e = process.platform;
const _linux$d = _platform$e === "linux" || _platform$e === "android";
const _darwin$d = _platform$e === "darwin";
const _windows$e = _platform$e === "win32";
const _freebsd$c = _platform$e === "freebsd";
const _openbsd$c = _platform$e === "openbsd";
const _netbsd$c = _platform$e === "netbsd";
const _sunos$c = _platform$e === "sunos";
let _cpu_speed = 0;
let _current_cpu = {
  user: 0,
  nice: 0,
  system: 0,
  idle: 0,
  irq: 0,
  steal: 0,
  guest: 0,
  load: 0,
  tick: 0,
  ms: 0,
  currentLoad: 0,
  currentLoadUser: 0,
  currentLoadSystem: 0,
  currentLoadNice: 0,
  currentLoadIdle: 0,
  currentLoadIrq: 0,
  currentLoadSteal: 0,
  currentLoadGuest: 0,
  rawCurrentLoad: 0,
  rawCurrentLoadUser: 0,
  rawCurrentLoadSystem: 0,
  rawCurrentLoadNice: 0,
  rawCurrentLoadIdle: 0,
  rawCurrentLoadIrq: 0,
  rawCurrentLoadSteal: 0,
  rawCurrentLoadGuest: 0
};
let _cpus = [];
let _corecount = 0;
const AMDBaseFrequencies = {
  8346: "1.8",
  8347: "1.9",
  8350: "2.0",
  8354: "2.2",
  "8356|SE": "2.4",
  8356: "2.3",
  8360: "2.5",
  2372: "2.1",
  2373: "2.1",
  2374: "2.2",
  2376: "2.3",
  2377: "2.3",
  2378: "2.4",
  2379: "2.4",
  2380: "2.5",
  2381: "2.5",
  2382: "2.6",
  2384: "2.7",
  2386: "2.8",
  2387: "2.8",
  2389: "2.9",
  2393: "3.1",
  8374: "2.2",
  8376: "2.3",
  8378: "2.4",
  8379: "2.4",
  8380: "2.5",
  8381: "2.5",
  8382: "2.6",
  8384: "2.7",
  8386: "2.8",
  8387: "2.8",
  8389: "2.9",
  8393: "3.1",
  "2419EE": "1.8",
  "2423HE": "2.0",
  "2425HE": "2.1",
  2427: "2.2",
  2431: "2.4",
  2435: "2.6",
  "2439SE": "2.8",
  "8425HE": "2.1",
  8431: "2.4",
  8435: "2.6",
  "8439SE": "2.8",
  4122: "2.2",
  4130: "2.6",
  "4162EE": "1.7",
  "4164EE": "1.8",
  "4170HE": "2.1",
  "4174HE": "2.3",
  "4176HE": "2.4",
  4180: "2.6",
  4184: "2.8",
  "6124HE": "1.8",
  "6128HE": "2.0",
  "6132HE": "2.2",
  6128: "2.0",
  6134: "2.3",
  6136: "2.4",
  6140: "2.6",
  "6164HE": "1.7",
  "6166HE": "1.8",
  6168: "1.9",
  6172: "2.1",
  6174: "2.2",
  6176: "2.3",
  "6176SE": "2.3",
  "6180SE": "2.5",
  3250: "2.5",
  3260: "2.7",
  3280: "2.4",
  4226: "2.7",
  4228: "2.8",
  4230: "2.9",
  4234: "3.1",
  4238: "3.3",
  4240: "3.4",
  4256: "1.6",
  4274: "2.5",
  4276: "2.6",
  4280: "2.8",
  4284: "3.0",
  6204: "3.3",
  6212: "2.6",
  6220: "3.0",
  6234: "2.4",
  6238: "2.6",
  "6262HE": "1.6",
  6272: "2.1",
  6274: "2.2",
  6276: "2.3",
  6278: "2.4",
  "6282SE": "2.6",
  "6284SE": "2.7",
  6308: "3.5",
  6320: "2.8",
  6328: "3.2",
  "6338P": "2.3",
  6344: "2.6",
  6348: "2.8",
  6366: "1.8",
  "6370P": "2.0",
  6376: "2.3",
  6378: "2.4",
  6380: "2.5",
  6386: "2.8",
  "FX|4100": "3.6",
  "FX|4120": "3.9",
  "FX|4130": "3.8",
  "FX|4150": "3.8",
  "FX|4170": "4.2",
  "FX|6100": "3.3",
  "FX|6120": "3.6",
  "FX|6130": "3.6",
  "FX|6200": "3.8",
  "FX|8100": "2.8",
  "FX|8120": "3.1",
  "FX|8140": "3.2",
  "FX|8150": "3.6",
  "FX|8170": "3.9",
  "FX|4300": "3.8",
  "FX|4320": "4.0",
  "FX|4350": "4.2",
  "FX|6300": "3.5",
  "FX|6350": "3.9",
  "FX|8300": "3.3",
  "FX|8310": "3.4",
  "FX|8320": "3.5",
  "FX|8350": "4.0",
  "FX|8370": "4.0",
  "FX|9370": "4.4",
  "FX|9590": "4.7",
  "FX|8320E": "3.2",
  "FX|8370E": "3.3",
  // ZEN Desktop CPUs
  1200: "3.1",
  "Pro 1200": "3.1",
  "1300X": "3.5",
  "Pro 1300": "3.5",
  1400: "3.2",
  "1500X": "3.5",
  "Pro 1500": "3.5",
  1600: "3.2",
  "1600X": "3.6",
  "Pro 1600": "3.2",
  1700: "3.0",
  "Pro 1700": "3.0",
  "1700X": "3.4",
  "Pro 1700X": "3.4",
  "1800X": "3.6",
  "1900X": "3.8",
  1920: "3.2",
  "1920X": "3.5",
  "1950X": "3.4",
  // ZEN Desktop APUs
  "200GE": "3.2",
  "Pro 200GE": "3.2",
  "220GE": "3.4",
  "240GE": "3.5",
  "3000G": "3.5",
  "300GE": "3.4",
  "3050GE": "3.4",
  "2200G": "3.5",
  "Pro 2200G": "3.5",
  "2200GE": "3.2",
  "Pro 2200GE": "3.2",
  "2400G": "3.6",
  "Pro 2400G": "3.6",
  "2400GE": "3.2",
  "Pro 2400GE": "3.2",
  // ZEN Mobile APUs
  "Pro 200U": "2.3",
  "300U": "2.4",
  "2200U": "2.5",
  "3200U": "2.6",
  "2300U": "2.0",
  "Pro 2300U": "2.0",
  "2500U": "2.0",
  "Pro 2500U": "2.2",
  "2600H": "3.2",
  "2700U": "2.0",
  "Pro 2700U": "2.2",
  "2800H": "3.3",
  // ZEN Server Processors
  7351: "2.4",
  "7351P": "2.4",
  7401: "2.0",
  "7401P": "2.0",
  "7551P": "2.0",
  7551: "2.0",
  7251: "2.1",
  7261: "2.5",
  7281: "2.1",
  7301: "2.2",
  7371: "3.1",
  7451: "2.3",
  7501: "2.0",
  7571: "2.2",
  7601: "2.2",
  // ZEN Embedded Processors
  V1500B: "2.2",
  V1780B: "3.35",
  V1202B: "2.3",
  V1404I: "2.0",
  V1605B: "2.0",
  V1756B: "3.25",
  V1807B: "3.35",
  3101: "2.1",
  3151: "2.7",
  3201: "1.5",
  3251: "2.5",
  3255: "2.5",
  3301: "2.0",
  3351: "1.9",
  3401: "1.85",
  3451: "2.15",
  // ZEN+ Desktop
  "1200|AF": "3.1",
  "2300X": "3.5",
  "2500X": "3.6",
  2600: "3.4",
  "2600E": "3.1",
  "1600|AF": "3.2",
  "2600X": "3.6",
  2700: "3.2",
  "2700E": "2.8",
  "Pro 2700": "3.2",
  "2700X": "3.7",
  "Pro 2700X": "3.6",
  "2920X": "3.5",
  "2950X": "3.5",
  "2970WX": "3.0",
  "2990WX": "3.0",
  // ZEN+ Desktop APU
  "Pro 300GE": "3.4",
  "Pro 3125GE": "3.4",
  "3150G": "3.5",
  "Pro 3150G": "3.5",
  "3150GE": "3.3",
  "Pro 3150GE": "3.3",
  "3200G": "3.6",
  "Pro 3200G": "3.6",
  "3200GE": "3.3",
  "Pro 3200GE": "3.3",
  "3350G": "3.6",
  "Pro 3350G": "3.6",
  "3350GE": "3.3",
  "Pro 3350GE": "3.3",
  "3400G": "3.7",
  "Pro 3400G": "3.7",
  "3400GE": "3.3",
  "Pro 3400GE": "3.3",
  // ZEN+ Mobile
  "3300U": "2.1",
  "PRO 3300U": "2.1",
  "3450U": "2.1",
  "3500U": "2.1",
  "PRO 3500U": "2.1",
  "3500C": "2.1",
  "3550H": "2.1",
  "3580U": "2.1",
  "3700U": "2.3",
  "PRO 3700U": "2.3",
  "3700C": "2.3",
  "3750H": "2.3",
  "3780U": "2.3",
  // ZEN2 Desktop CPUS
  3100: "3.6",
  "3300X": "3.8",
  3500: "3.6",
  "3500X": "3.6",
  3600: "3.6",
  "Pro 3600": "3.6",
  "3600X": "3.8",
  "3600XT": "3.8",
  "Pro 3700": "3.6",
  "3700X": "3.6",
  "3800X": "3.9",
  "3800XT": "3.9",
  3900: "3.1",
  "Pro 3900": "3.1",
  "3900X": "3.8",
  "3900XT": "3.8",
  "3950X": "3.5",
  "3960X": "3.8",
  "3970X": "3.7",
  "3990X": "2.9",
  "3945WX": "4.0",
  "3955WX": "3.9",
  "3975WX": "3.5",
  "3995WX": "2.7",
  // ZEN2 Desktop APUs
  "4300GE": "3.5",
  "Pro 4300GE": "3.5",
  "4300G": "3.8",
  "Pro 4300G": "3.8",
  "4600GE": "3.3",
  "Pro 4650GE": "3.3",
  "4600G": "3.7",
  "Pro 4650G": "3.7",
  "4700GE": "3.1",
  "Pro 4750GE": "3.1",
  "4700G": "3.6",
  "Pro 4750G": "3.6",
  "4300U": "2.7",
  "4450U": "2.5",
  "Pro 4450U": "2.5",
  "4500U": "2.3",
  "4600U": "2.1",
  "PRO 4650U": "2.1",
  "4680U": "2.1",
  "4600HS": "3.0",
  "4600H": "3.0",
  "4700U": "2.0",
  "PRO 4750U": "1.7",
  "4800U": "1.8",
  "4800HS": "2.9",
  "4800H": "2.9",
  "4900HS": "3.0",
  "4900H": "3.3",
  "5300U": "2.6",
  "5500U": "2.1",
  "5700U": "1.8",
  // ZEN2 - EPYC
  "7232P": "3.1",
  "7302P": "3.0",
  "7402P": "2.8",
  "7502P": "2.5",
  "7702P": "2.0",
  7252: "3.1",
  7262: "3.2",
  7272: "2.9",
  7282: "2.8",
  7302: "3.0",
  7352: "2.3",
  7402: "2.8",
  7452: "2.35",
  7502: "2.5",
  7532: "2.4",
  7542: "2.9",
  7552: "2.2",
  7642: "2.3",
  7662: "2.0",
  7702: "2.0",
  7742: "2.25",
  "7H12": "2.6",
  "7F32": "3.7",
  "7F52": "3.5",
  "7F72": "3.2",
  // Epyc (Milan)
  "7773X": "2.2",
  7763: "2.45",
  7713: "2.0",
  "7713P": "2.0",
  7663: "2.0",
  7643: "2.3",
  "7573X": "2.8",
  "75F3": "2.95",
  7543: "2.8",
  "7543P": "2.8",
  7513: "2.6",
  "7473X": "2.8",
  7453: "2.75",
  "74F3": "3.2",
  7443: "2.85",
  "7443P": "2.85",
  7413: "2.65",
  "7373X": "3.05",
  "73F3": "3.5",
  7343: "3.2",
  7313: "3.0",
  "7313P": "3.0",
  "72F3": "3.7",
  // ZEN3
  "5600X": "3.7",
  "5800X": "3.8",
  "5900X": "3.7",
  "5950X": "3.4",
  "5945WX": "4.1",
  "5955WX": "4.0",
  "5965WX": "3.8",
  "5975WX": "3.6",
  "5995WX": "2.7",
  "7960X": "4.2",
  "7970X": "4.0",
  "7980X": "3.2",
  "7965WX": "4.2",
  "7975WX": "4.0",
  "7985WX": "3.2",
  "7995WX": "2.5",
  // ZEN4
  9754: "2.25",
  "9754S": "2.25",
  9734: "2.2",
  "9684X": "2.55",
  "9384X": "3.1",
  "9184X": "3.55",
  "9654P": "2.4",
  9654: "2.4",
  9634: "2.25",
  "9554P": "3.1",
  9554: "3.1",
  9534: "2.45",
  "9474F": "3.6",
  "9454P": "2.75",
  9454: "2.75",
  "9374F": "3.85",
  "9354P": "3.25",
  9354: "3.25",
  9334: "2.7",
  "9274F": "4.05",
  9254: "2.9",
  9224: "2.5",
  "9174F": "4.1",
  9124: "3.0",
  // Epyc 4th gen
  "4124P": "3.8",
  "4244P": "3.8",
  "4344P": "3.8",
  "4364P": "4.5",
  "4464P": "3.7",
  "4484PX": "4.4",
  "4564P": "4.5",
  "4584PX": "4.2",
  "8024P": "2.4",
  "8024PN": "2.05",
  "8124P": "2.45",
  "8124PN": "2.0",
  "8224P": "2.55",
  "8224PN": "2.0",
  "8324P": "2.65",
  "8324PN": "2.05",
  "8434P": "2.5",
  "8434PN": "2.0",
  "8534P": "2.3",
  "8534PN": "2.0",
  // Epyc 5th gen
  9115: "2.6",
  9135: "3.65",
  "9175F": "4.2",
  9255: "3.25",
  "9275F": "4.1",
  9335: "3.0",
  "9355P": "3.55",
  9355: "3.55",
  "9375F": "3.8",
  9365: "3.4",
  "9455P": "3.15",
  9455: "3.15",
  "9475F": "3.65",
  9535: "2.4",
  "9555P": "3.2",
  9555: "3.2",
  "9575F": "3.3",
  9565: "3.15",
  "9655P": "2.5",
  9655: "2.5",
  9755: "2.7",
  "4245P": "3.9",
  "4345P": "3.8",
  "4465P": "3.4",
  "4545P": "3.0",
  "4565P": "4.3",
  "4585PX": "4.3",
  "5900XT": "3.3",
  5900: "3.0",
  5945: "3.0",
  "5800X3D": "3.4",
  "5800XT": "3.8",
  5800: "3.4",
  "5700X3D": "3.0",
  "5700X": "3.4",
  5845: "3.4",
  "5600X3D": "3.3",
  "5600XT": "3.7",
  "5600T": "3.5",
  5600: "3.5",
  "5600F": "3.0",
  5645: "3.7",
  "5500X3D": "3.0",
  "5980HX": "3.3",
  "5980HS": "3.0",
  "5900HX": "3.3",
  "5900HS": "3.0",
  "5800H": "3.2",
  "5800HS": "2.8",
  "5800U": "1.9",
  "5600H": "3.3",
  "5600HS": "3.0",
  "5600U": "2.3",
  "5560U": "2.3",
  "5400U": "2.7",
  "5825U": "2.0",
  "5625U": "2.3",
  "5425U": "2.7",
  "5125C": "3.0",
  "7730U": "2.0",
  "7530U": "2.0",
  "7430U": "2.3",
  "7330U": "2.3",
  7203: "2.8",
  7303: "2.4",
  "7663P": "2.0",
  "6980HX": "3.3",
  "6980HS": "3.3",
  "6900HX": "3.3",
  "6900HS": "3.3",
  "6800H": "3.2",
  "6800HS": "3.2",
  "6800U": "2.7",
  "6600H": "3.3",
  "6600HS": "3.3",
  "6600U": "2.9",
  "7735HS": "3.2",
  "7735H": "3.2",
  "7736U": "2.7",
  "7735U": "2.7",
  "7435HS": "3.1",
  "7435H": "3.1",
  "7535HS": "3.3",
  "7535H": "3.3",
  "7535U": "2.9",
  "7235HS": "3.2",
  "7235H": "3.2",
  "7335U": "3.0",
  270: "4.0",
  260: "3.8",
  250: "3.3",
  240: "4.3",
  230: "3.5",
  220: "3.0",
  210: "2.8",
  "8945HS": "4.0",
  "8845HS": "3.8",
  "8840HS": "3.3",
  "8840U": "3.3",
  "8645HS": "4.3",
  "8640HS": "3.5",
  "8640U": "3.5",
  "8540U": "3.0",
  "8440U": "2.8",
  "9950X3D": "4.3",
  "9950X": "4.3",
  "9900X3D": "4.4",
  "9900X": "4.4",
  "9800X3D": "4.7",
  "9700X": "3.8",
  "9700F": "3.8",
  "9600X": "3.9",
  9600: "3.8",
  "9500F": "3.8",
  "9995WX": "2.5",
  "9985WX": "3.2",
  "9975WX": "4.0",
  "9965WX": "4.2",
  "9955WX": "4.5",
  "9945WX": "4.7",
  "9980X": "3.2",
  "9970X": "4.0",
  "9960X": "4.2",
  "PRO HX375": "2.0",
  HX375: "2.0",
  "PRO HX370": "2.0",
  HX370: "2.0",
  365: "2.0",
  "PRO 360": "2.0",
  350: "2.0",
  "PRO 350": "2.0",
  340: "2.0",
  "PRO 340": "2.0",
  330: "2.0",
  395: "3.0",
  "PRO 395": "3.0",
  390: "3.2",
  "PRO 390": "3.2",
  385: "3.6",
  "PRO 385": "3.6",
  "PRO 380": "3.6",
  "9955HX3D": "2.3",
  "9955HX": "2.5",
  "9850HX": "3.0",
  9015: "3.6",
  9965: "2.25",
  9845: "2.1",
  9825: "2.2",
  9745: "2.4",
  9645: "2.3"
};
const socketTypes = {
  1: "Other",
  2: "Unknown",
  3: "Daughter Board",
  4: "ZIF Socket",
  5: "Replacement/Piggy Back",
  6: "None",
  7: "LIF Socket",
  8: "Slot 1",
  9: "Slot 2",
  10: "370 Pin Socket",
  11: "Slot A",
  12: "Slot M",
  13: "423",
  14: "A (Socket 462)",
  15: "478",
  16: "754",
  17: "940",
  18: "939",
  19: "mPGA604",
  20: "LGA771",
  21: "LGA775",
  22: "S1",
  23: "AM2",
  24: "F (1207)",
  25: "LGA1366",
  26: "G34",
  27: "AM3",
  28: "C32",
  29: "LGA1156",
  30: "LGA1567",
  31: "PGA988A",
  32: "BGA1288",
  33: "rPGA988B",
  34: "BGA1023",
  35: "BGA1224",
  36: "LGA1155",
  37: "LGA1356",
  38: "LGA2011",
  39: "FS1",
  40: "FS2",
  41: "FM1",
  42: "FM2",
  43: "LGA2011-3",
  44: "LGA1356-3",
  45: "LGA1150",
  46: "BGA1168",
  47: "BGA1234",
  48: "BGA1364",
  49: "AM4",
  50: "LGA1151",
  51: "BGA1356",
  52: "BGA1440",
  53: "BGA1515",
  54: "LGA3647-1",
  55: "SP3",
  56: "SP3r2",
  57: "LGA2066",
  58: "BGA1392",
  59: "BGA1510",
  60: "BGA1528",
  61: "LGA4189",
  62: "LGA1200",
  63: "LGA4677",
  64: "LGA1700",
  65: "BGA1744",
  66: "BGA1781",
  67: "BGA1211",
  68: "BGA2422",
  69: "LGA1211",
  70: "LGA2422",
  71: "LGA5773",
  72: "BGA5773",
  73: "AM5",
  74: "SP5",
  75: "SP6",
  76: "BGA883",
  77: "BGA1190",
  78: "BGA4129",
  79: "LGA4710",
  80: "LGA7529",
  81: "BGA1964",
  82: "BGA1792",
  83: "BGA2049",
  84: "BGA2551",
  85: "LGA1851",
  86: "BGA2114",
  87: "BGA2833"
};
const socketTypesByName = {
  LGA1150: "i7-5775C i3-4340 i3-4170 G3250 i3-4160T i3-4160 E3-1231 G3258 G3240 i7-4790S i7-4790K i7-4790 i5-4690K i5-4690 i5-4590T i5-4590S i5-4590 i5-4460 i3-4360 i3-4150 G1820 G3420 G3220 i7-4771 i5-4440 i3-4330 i3-4130T i3-4130 E3-1230 i7-4770S i7-4770K i7-4770 i5-4670K i5-4670 i5-4570T i5-4570S i5-4570 i5-4430",
  LGA1151: "i9-9900KS E-2288G E-2224 G5420 i9-9900T i9-9900 i7-9700T i7-9700F i7-9700E i7-9700 i5-9600 i5-9500T i5-9500F i5-9500 i5-9400T i3-9350K i3-9300 i3-9100T i3-9100F i3-9100 G4930 i9-9900KF i7-9700KF i5-9600KF i5-9400F i5-9400 i3-9350KF i9-9900K i7-9700K i5-9600K G5500 G5400 i7-8700T i7-8086K i5-8600 i5-8500T i5-8500 i5-8400T i3-8300 i3-8100T G4900 i7-8700K i7-8700 i5-8600K i5-8400 i3-8350K i3-8100 E3-1270 G4600 G4560 i7-7700T i7-7700K i7-7700 i5-7600K i5-7600 i5-7500T i5-7500 i5-7400 i3-7350K i3-7300 i3-7100T i3-7100 G3930 G3900 G4400 i7-6700T i7-6700K i7-6700 i5-6600K i5-6600 i5-6500T i5-6500 i5-6400T i5-6400 i3-6300 i3-6100T i3-6100 E3-1270 E3-1270 T4500 T4400",
  1155: "G440 G460 G465 G470 G530T G540T G550T G1610T G1620T G530 G540 G1610 G550 G1620 G555 G1630 i3-2100T i3-2120T i3-3220T i3-3240T i3-3250T i3-2100 i3-2105 i3-2102 i3-3210 i3-3220 i3-2125 i3-2120 i3-3225 i3-2130 i3-3245 i3-3240 i3-3250 i5-3570T i5-2500T i5-2400S i5-2405S i5-2390T i5-3330S i5-2500S i5-3335S i5-2300 i5-3450S i5-3340S i5-3470S i5-3475S i5-3470T i5-2310 i5-3550S i5-2320 i5-3330 i5-3350P i5-3450 i5-2400 i5-3340 i5-3570S i5-2380P i5-2450P i5-3470 i5-2500K i5-3550 i5-2500 i5-3570 i5-3570K i5-2550K i7-3770T i7-2600S i7-3770S i7-2600K i7-2600 i7-3770 i7-3770K i7-2700K G620T G630T G640T G2020T G645T G2100T G2030T G622 G860T G620 G632 G2120T G630 G640 G2010 G840 G2020 G850 G645 G2030 G860 G2120 G870 G2130 G2140 E3-1220L E3-1220L E3-1260L E3-1265L E3-1220 E3-1225 E3-1220 E3-1235 E3-1225 E3-1230 E3-1230 E3-1240 E3-1245 E3-1270 E3-1275 E3-1240 E3-1245 E3-1270 E3-1280 E3-1275 E3-1290 E3-1280 E3-1290"
};
function getSocketTypesByName(str) {
  let result = "";
  for (const key in socketTypesByName) {
    const names = socketTypesByName[key].split(" ");
    names.forEach((element) => {
      if (str.indexOf(element) >= 0) {
        result = key;
      }
    });
  }
  return result;
}
function cpuManufacturer(str) {
  let result = str;
  str = str.toLowerCase();
  if (str.indexOf("intel") >= 0) {
    result = "Intel";
  }
  if (str.indexOf("amd") >= 0) {
    result = "AMD";
  }
  if (str.indexOf("qemu") >= 0) {
    result = "QEMU";
  }
  if (str.indexOf("hygon") >= 0) {
    result = "Hygon";
  }
  if (str.indexOf("centaur") >= 0) {
    result = "WinChip/Via";
  }
  if (str.indexOf("vmware") >= 0) {
    result = "VMware";
  }
  if (str.indexOf("Xen") >= 0) {
    result = "Xen Hypervisor";
  }
  if (str.indexOf("tcg") >= 0) {
    result = "QEMU";
  }
  if (str.indexOf("apple") >= 0) {
    result = "Apple";
  }
  if (str.indexOf("sifive") >= 0) {
    result = "SiFive";
  }
  if (str.indexOf("thead") >= 0) {
    result = "T-Head";
  }
  if (str.indexOf("andestech") >= 0) {
    result = "Andes Technology";
  }
  return result;
}
function cpuBrandManufacturer(res) {
  res.brand = res.brand.replace(/\(R\)+/g, "®").replace(/\s+/g, " ").trim();
  res.brand = res.brand.replace(/\(TM\)+/g, "™").replace(/\s+/g, " ").trim();
  res.brand = res.brand.replace(/\(C\)+/g, "©").replace(/\s+/g, " ").trim();
  res.brand = res.brand.replace(/CPU+/g, "").replace(/\s+/g, " ").trim();
  res.manufacturer = cpuManufacturer(res.brand);
  let parts = res.brand.split(" ");
  parts.shift();
  res.brand = parts.join(" ");
  return res;
}
function getAMDSpeed(brand) {
  let result = "0";
  for (let key in AMDBaseFrequencies) {
    if ({}.hasOwnProperty.call(AMDBaseFrequencies, key)) {
      let parts = key.split("|");
      let found = 0;
      parts.forEach((item) => {
        if (brand.indexOf(item) > -1) {
          found++;
        }
      });
      if (found === parts.length) {
        result = AMDBaseFrequencies[key];
      }
    }
  }
  return parseFloat(result);
}
function getCpu() {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const UNKNOWN = "unknown";
      let result = {
        manufacturer: UNKNOWN,
        brand: UNKNOWN,
        vendor: "",
        family: "",
        model: "",
        stepping: "",
        revision: "",
        voltage: "",
        speed: 0,
        speedMin: 0,
        speedMax: 0,
        governor: "",
        cores: util$f.cores(),
        physicalCores: util$f.cores(),
        performanceCores: util$f.cores(),
        efficiencyCores: 0,
        processors: 1,
        socket: "",
        flags: "",
        virtualization: false,
        cache: {}
      };
      cpuFlags().then((flags) => {
        result.flags = flags;
        result.virtualization = flags.indexOf("vmx") > -1 || flags.indexOf("svm") > -1;
        if (_darwin$d) {
          exec$d("sysctl machdep.cpu hw.cpufrequency_max hw.cpufrequency_min hw.packages hw.physicalcpu_max hw.ncpu hw.tbfrequency hw.cpufamily hw.cpusubfamily", (error, stdout) => {
            const lines = stdout.toString().split("\n");
            const modelline = util$f.getValue(lines, "machdep.cpu.brand_string");
            const modellineParts = modelline.split("@");
            result.brand = modellineParts[0].trim();
            const speed = modellineParts[1] ? modellineParts[1].trim() : "0";
            result.speed = parseFloat(speed.replace(/GHz+/g, ""));
            let tbFrequency = util$f.getValue(lines, "hw.tbfrequency") / 1e9;
            tbFrequency = tbFrequency < 0.1 ? tbFrequency * 100 : tbFrequency;
            result.speed = result.speed === 0 ? tbFrequency : result.speed;
            _cpu_speed = result.speed;
            result = cpuBrandManufacturer(result);
            result.speedMin = util$f.getValue(lines, "hw.cpufrequency_min") ? util$f.getValue(lines, "hw.cpufrequency_min") / 1e9 : result.speed;
            result.speedMax = util$f.getValue(lines, "hw.cpufrequency_max") ? util$f.getValue(lines, "hw.cpufrequency_max") / 1e9 : result.speed;
            result.vendor = util$f.getValue(lines, "machdep.cpu.vendor") || "Apple";
            result.family = util$f.getValue(lines, "machdep.cpu.family") || util$f.getValue(lines, "hw.cpufamily");
            result.model = util$f.getValue(lines, "machdep.cpu.model");
            result.stepping = util$f.getValue(lines, "machdep.cpu.stepping") || util$f.getValue(lines, "hw.cpusubfamily");
            result.virtualization = true;
            const countProcessors = util$f.getValue(lines, "hw.packages");
            const countCores = util$f.getValue(lines, "hw.physicalcpu_max");
            const countThreads = util$f.getValue(lines, "hw.ncpu");
            if (os$5.arch() === "arm64") {
              result.socket = "SOC";
              try {
                const clusters = execSync$8("ioreg -c IOPlatformDevice -d 3 -r | grep cluster-type").toString().split("\n");
                const efficiencyCores = clusters.filter((line) => line.indexOf('"E"') >= 0).length + clusters.filter((line) => line.indexOf('"M"') >= 0).length;
                const performanceCores = clusters.filter((line) => line.indexOf('"P"') >= 0).length;
                result.efficiencyCores = efficiencyCores;
                result.performanceCores = performanceCores;
              } catch {
                util$f.noop();
              }
            }
            if (countProcessors) {
              result.processors = parseInt(countProcessors, 10) || 1;
            }
            if (countCores && countThreads) {
              result.cores = parseInt(countThreads) || util$f.cores();
              result.physicalCores = parseInt(countCores) || util$f.cores();
            }
            cpuCache().then((res) => {
              result.cache = res;
              resolve(result);
            });
          });
        }
        if (_linux$d) {
          let modelline = "";
          let lines = [];
          if (os$5.cpus()[0] && os$5.cpus()[0].model) {
            modelline = os$5.cpus()[0].model;
          }
          exec$d('export LC_ALL=C; lscpu; echo -n "Governor: "; cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null; echo; unset LC_ALL', (error, stdout) => {
            if (!error) {
              lines = stdout.toString().split("\n");
            }
            modelline = util$f.getValue(lines, "model name") || modelline;
            modelline = util$f.getValue(lines, "bios model name") || modelline;
            modelline = util$f.cleanString(modelline);
            const modellineParts = modelline.split("@");
            result.brand = modellineParts[0].trim();
            if (result.brand.indexOf("Unknown") >= 0) {
              result.brand = result.brand.split("Unknown")[0].trim();
            }
            result.speed = modellineParts[1] ? parseFloat(modellineParts[1].trim()) : 0;
            if (result.speed === 0 && (result.brand.indexOf("AMD") > -1 || result.brand.toLowerCase().indexOf("ryzen") > -1)) {
              result.speed = getAMDSpeed(result.brand);
            }
            if (result.speed === 0) {
              const current = getCpuCurrentSpeedSync();
              if (current.avg !== 0) {
                result.speed = current.avg;
              }
            }
            _cpu_speed = result.speed;
            result.speedMin = Math.round(parseFloat(util$f.getValue(lines, "cpu min mhz").replace(/,/g, ".")) / 10) / 100 || result.speedMin;
            result.speedMax = Math.round(parseFloat(util$f.getValue(lines, "cpu max mhz").replace(/,/g, ".")) / 10) / 100 || result.speedMax;
            result = cpuBrandManufacturer(result);
            result.vendor = cpuManufacturer(util$f.getValue(lines, "vendor id"));
            result.family = util$f.getValue(lines, "cpu family");
            result.model = util$f.getValue(lines, "model:");
            result.stepping = util$f.getValue(lines, "stepping");
            result.revision = util$f.getValue(lines, "cpu revision");
            result.cache.l1d = util$f.getValue(lines, "l1d cache");
            if (result.cache.l1d) {
              result.cache.l1d = parseInt(result.cache.l1d) * (result.cache.l1d.indexOf("M") !== -1 ? 1024 * 1024 : result.cache.l1d.indexOf("K") !== -1 ? 1024 : 1);
            }
            result.cache.l1i = util$f.getValue(lines, "l1i cache");
            if (result.cache.l1i) {
              result.cache.l1i = parseInt(result.cache.l1i) * (result.cache.l1i.indexOf("M") !== -1 ? 1024 * 1024 : result.cache.l1i.indexOf("K") !== -1 ? 1024 : 1);
            }
            result.cache.l2 = util$f.getValue(lines, "l2 cache");
            if (result.cache.l2) {
              result.cache.l2 = parseInt(result.cache.l2) * (result.cache.l2.indexOf("M") !== -1 ? 1024 * 1024 : result.cache.l2.indexOf("K") !== -1 ? 1024 : 1);
            }
            result.cache.l3 = util$f.getValue(lines, "l3 cache");
            if (result.cache.l3) {
              result.cache.l3 = parseInt(result.cache.l3) * (result.cache.l3.indexOf("M") !== -1 ? 1024 * 1024 : result.cache.l3.indexOf("K") !== -1 ? 1024 : 1);
            }
            const threadsPerCore = util$f.getValue(lines, "thread(s) per core") || "1";
            const processors = util$f.getValue(lines, "socket(s)") || "1";
            const threadsPerCoreInt = parseInt(threadsPerCore, 10);
            const processorsInt = parseInt(processors, 10) || 1;
            const coresPerSocket = parseInt(util$f.getValue(lines, "core(s) per socket"), 10);
            result.physicalCores = coresPerSocket ? coresPerSocket * processorsInt : result.cores / threadsPerCoreInt;
            result.performanceCores = threadsPerCoreInt > 1 ? result.cores - result.physicalCores : result.cores;
            result.efficiencyCores = threadsPerCoreInt > 1 ? result.cores - threadsPerCoreInt * result.performanceCores : 0;
            result.processors = processorsInt;
            result.governor = util$f.getValue(lines, "governor") || "";
            if (result.vendor === "ARM" && util$f.isRaspberry()) {
              const rPIRevision = util$f.decodePiCpuinfo();
              result.family = result.manufacturer;
              result.manufacturer = rPIRevision.manufacturer;
              result.brand = rPIRevision.processor;
              result.revision = rPIRevision.revisionCode;
              result.socket = "SOC";
            }
            if (util$f.getValue(lines, "architecture") === "riscv64") {
              try {
                const linesRiscV = fs$7.readFileSync("/proc/cpuinfo").toString().split("\n");
                const uarch = util$f.getValue(linesRiscV, "uarch") || "";
                if (uarch.indexOf(",") > -1) {
                  const split = uarch.split(",");
                  result.manufacturer = cpuManufacturer(split[0]);
                  result.brand = split[1];
                }
              } catch {
                util$f.noop();
              }
            }
            let lines2 = [];
            exec$d('export LC_ALL=C; dmidecode -t 4 2>/dev/null | grep "Upgrade: Socket"; unset LC_ALL', (error2, stdout2) => {
              lines2 = stdout2.toString().split("\n");
              if (lines2 && lines2.length) {
                result.socket = util$f.getValue(lines2, "Upgrade").replace("Socket", "").trim() || result.socket;
              }
              resolve(result);
            });
          });
        }
        if (_freebsd$c || _openbsd$c || _netbsd$c) {
          let modelline = "";
          let lines = [];
          if (os$5.cpus()[0] && os$5.cpus()[0].model) {
            modelline = os$5.cpus()[0].model;
          }
          exec$d("export LC_ALL=C; dmidecode -t 4; dmidecode -t 7; unset LC_ALL", (error, stdout) => {
            let cache = [];
            if (!error) {
              const data = stdout.toString().split("# dmidecode");
              const processor = data.length > 1 ? data[1] : "";
              cache = data.length > 2 ? data[2].split("Cache Information") : [];
              lines = processor.split("\n");
            }
            result.brand = modelline.split("@")[0].trim();
            result.speed = modelline.split("@")[1] ? parseFloat(modelline.split("@")[1].trim()) : 0;
            if (result.speed === 0 && (result.brand.indexOf("AMD") > -1 || result.brand.toLowerCase().indexOf("ryzen") > -1)) {
              result.speed = getAMDSpeed(result.brand);
            }
            if (result.speed === 0) {
              const current = getCpuCurrentSpeedSync();
              if (current.avg !== 0) {
                result.speed = current.avg;
              }
            }
            _cpu_speed = result.speed;
            result.speedMin = result.speed;
            result.speedMax = Math.round(parseFloat(util$f.getValue(lines, "max speed").replace(/Mhz/g, "")) / 10) / 100 || result.speed;
            result = cpuBrandManufacturer(result);
            result.vendor = cpuManufacturer(util$f.getValue(lines, "manufacturer"));
            let sig = util$f.getValue(lines, "signature");
            sig = sig.split(",");
            for (let i = 0; i < sig.length; i++) {
              sig[i] = sig[i].trim();
            }
            result.family = util$f.getValue(sig, "Family", " ", true);
            result.model = util$f.getValue(sig, "Model", " ", true);
            result.stepping = util$f.getValue(sig, "Stepping", " ", true);
            result.revision = "";
            const voltage = parseFloat(util$f.getValue(lines, "voltage"));
            result.voltage = isNaN(voltage) ? "" : voltage.toFixed(2);
            for (let i = 0; i < cache.length; i++) {
              lines = cache[i].split("\n");
              let cacheType = util$f.getValue(lines, "Socket Designation").toLowerCase().replace(" ", "-").split("-");
              cacheType = cacheType.length ? cacheType[0] : "";
              const sizeParts = util$f.getValue(lines, "Installed Size").split(" ");
              let size = parseInt(sizeParts[0], 10);
              const unit = sizeParts.length > 1 ? sizeParts[1] : "kb";
              size = size * (unit === "kb" ? 1024 : unit === "mb" ? 1024 * 1024 : unit === "gb" ? 1024 * 1024 * 1024 : 1);
              if (cacheType) {
                if (cacheType === "l1") {
                  result.cache[cacheType + "d"] = size / 2;
                  result.cache[cacheType + "i"] = size / 2;
                } else {
                  result.cache[cacheType] = size;
                }
              }
            }
            result.socket = util$f.getValue(lines, "Upgrade").replace("Socket", "").trim();
            const threadCount = util$f.getValue(lines, "thread count").trim();
            const coreCount = util$f.getValue(lines, "core count").trim();
            if (coreCount && threadCount) {
              result.cores = parseInt(threadCount, 10);
              result.physicalCores = parseInt(coreCount, 10);
            }
            resolve(result);
          });
        }
        if (_sunos$c) {
          resolve(result);
        }
        if (_windows$e) {
          try {
            const workload = [];
            workload.push(
              util$f.powerShell(
                "Get-CimInstance Win32_processor | select Name, Revision, L2CacheSize, L3CacheSize, Manufacturer, MaxClockSpeed, Description, UpgradeMethod, Caption, NumberOfLogicalProcessors, NumberOfCores | fl"
              )
            );
            workload.push(util$f.powerShell("Get-CimInstance Win32_CacheMemory | select CacheType,InstalledSize,Level | fl"));
            workload.push(util$f.powerShell("(Get-CimInstance Win32_ComputerSystem).HypervisorPresent"));
            Promise.all(workload).then((data) => {
              let lines = data[0].split("\r\n");
              let name = util$f.getValue(lines, "name", ":") || "";
              if (name.indexOf("@") >= 0) {
                result.brand = name.split("@")[0].trim();
                result.speed = name.split("@")[1] ? parseFloat(name.split("@")[1].trim()) : 0;
                _cpu_speed = result.speed;
              } else {
                result.brand = name.trim();
                result.speed = 0;
              }
              result = cpuBrandManufacturer(result);
              result.revision = util$f.getValue(lines, "revision", ":");
              result.vendor = util$f.getValue(lines, "manufacturer", ":");
              result.speedMax = Math.round(parseFloat(util$f.getValue(lines, "maxclockspeed", ":").replace(/,/g, ".")) / 10) / 100 || result.speedMax;
              if (result.speed === 0 && (result.brand.indexOf("AMD") > -1 || result.brand.toLowerCase().indexOf("ryzen") > -1)) {
                result.speed = getAMDSpeed(result.brand);
              }
              if (result.speed === 0) {
                result.speed = result.speedMax;
              }
              result.speedMin = result.speed;
              let description = util$f.getValue(lines, "description", ":").split(" ");
              for (let i = 0; i < description.length; i++) {
                if (description[i].toLowerCase().startsWith("family") && i + 1 < description.length && description[i + 1]) {
                  result.family = description[i + 1];
                }
                if (description[i].toLowerCase().startsWith("model") && i + 1 < description.length && description[i + 1]) {
                  result.model = description[i + 1];
                }
                if (description[i].toLowerCase().startsWith("stepping") && i + 1 < description.length && description[i + 1]) {
                  result.stepping = description[i + 1];
                }
              }
              const socketId = util$f.getValue(lines, "UpgradeMethod", ":");
              if (socketTypes[socketId]) {
                result.socket = socketTypes[socketId];
              }
              const socketByName = getSocketTypesByName(name);
              if (socketByName) {
                result.socket = socketByName;
              }
              const countProcessors = util$f.countLines(lines, "Caption");
              const countThreads = util$f.getValue(lines, "NumberOfLogicalProcessors", ":");
              const countCores = util$f.getValue(lines, "NumberOfCores", ":");
              if (countProcessors) {
                result.processors = parseInt(countProcessors) || 1;
              }
              if (countCores && countThreads) {
                result.cores = parseInt(countThreads) || util$f.cores();
                result.physicalCores = parseInt(countCores) || util$f.cores();
              }
              if (countProcessors > 1) {
                result.cores = result.cores * countProcessors;
                result.physicalCores = result.physicalCores * countProcessors;
              }
              result.cache = parseWinCache(data[0], data[1]);
              const hyperv = data[2] ? data[2].toString().toLowerCase() : "";
              result.virtualization = hyperv.indexOf("true") !== -1;
              resolve(result);
            });
          } catch (e) {
            resolve(result);
          }
        }
      });
    });
  });
}
function cpu(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      getCpu().then((result) => {
        if (callback) {
          callback(result);
        }
        resolve(result);
      });
    });
  });
}
cpu$1.cpu = cpu;
function getCpuCurrentSpeedSync() {
  const cpus = os$5.cpus();
  let minFreq = 999999999;
  let maxFreq = 0;
  let avgFreq = 0;
  const cores2 = [];
  const speeds = [];
  if (cpus && cpus.length && Object.prototype.hasOwnProperty.call(cpus[0], "speed")) {
    for (let i in cpus) {
      speeds.push(cpus[i].speed > 100 ? (cpus[i].speed + 1) / 1e3 : cpus[i].speed / 10);
    }
  } else if (_linux$d) {
    try {
      const speedStrings = execSync$8('cat /proc/cpuinfo | grep "cpu MHz" | cut -d " " -f 3', util$f.execOptsLinux).toString().split("\n").filter((line) => line.length > 0);
      for (let i in speedStrings) {
        speeds.push(Math.floor(parseInt(speedStrings[i], 10) / 10) / 100);
      }
    } catch {
      util$f.noop();
    }
  }
  if (speeds && speeds.length) {
    try {
      for (const i in speeds) {
        avgFreq = avgFreq + speeds[i];
        if (speeds[i] > maxFreq) {
          maxFreq = speeds[i];
        }
        if (speeds[i] < minFreq) {
          minFreq = speeds[i];
        }
        cores2.push(parseFloat(speeds[i].toFixed(2)));
      }
      avgFreq = avgFreq / speeds.length;
      return {
        min: parseFloat(minFreq.toFixed(2)),
        max: parseFloat(maxFreq.toFixed(2)),
        avg: parseFloat(avgFreq.toFixed(2)),
        cores: cores2
      };
    } catch (e) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        cores: cores2
      };
    }
  } else {
    return {
      min: 0,
      max: 0,
      avg: 0,
      cores: cores2
    };
  }
}
function cpuCurrentSpeed(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = getCpuCurrentSpeedSync();
      if (result.avg === 0 && _cpu_speed !== 0) {
        const currCpuSpeed = parseFloat(_cpu_speed);
        result = {
          min: currCpuSpeed,
          max: currCpuSpeed,
          avg: currCpuSpeed,
          cores: []
        };
      }
      if (callback) {
        callback(result);
      }
      resolve(result);
    });
  });
}
cpu$1.cpuCurrentSpeed = cpuCurrentSpeed;
function cpuTemperature(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        main: null,
        cores: [],
        max: null,
        socket: [],
        chipset: null
      };
      if (_linux$d) {
        let cpuThermal = null;
        try {
          const cmd2 = 'cat /sys/class/thermal/thermal_zone*/type  2>/dev/null; echo "-----"; cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null;';
          const parts = execSync$8(cmd2, util$f.execOptsLinux).toString().split("-----\n");
          if (parts.length === 2) {
            const lines = parts[0].split("\n");
            const lines2 = parts[1].split("\n");
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.startsWith("acpi") && lines2[i]) {
                result.socket.push(Math.round(parseInt(lines2[i], 10) / 100) / 10);
              }
              if (line.startsWith("pch") && lines2[i]) {
                result.chipset = Math.round(parseInt(lines2[i], 10) / 100) / 10;
              }
              if (cpuThermal === null && line.indexOf("cpu") !== -1 && lines2[i]) {
                cpuThermal = Math.round(parseInt(lines2[i], 10) / 100) / 10;
              }
            }
          }
        } catch (e) {
          util$f.noop();
        }
        const cmd = 'for mon in /sys/class/hwmon/hwmon*; do for label in "$mon"/temp*_label; do if [ -f $label ]; then value=${label%_*}_input; echo $(cat "$label")___$(cat "$value"); fi; done; done;';
        try {
          exec$d(cmd, (error, stdout) => {
            stdout = stdout.toString();
            const tdiePos = stdout.toLowerCase().indexOf("tdie");
            if (tdiePos !== -1) {
              stdout = stdout.substring(tdiePos);
            }
            const lines = stdout.split("\n");
            let tctl = 0;
            lines.forEach((line) => {
              const parts = line.split("___");
              const label = parts[0];
              const value = parts.length > 1 && parts[1] ? parts[1] : "0";
              if (value && label && label.toLowerCase() === "tctl") {
                tctl = result.main = Math.round(parseInt(value, 10) / 100) / 10;
              }
              if (value && (label === void 0 || label && label.toLowerCase().startsWith("core"))) {
                result.cores.push(Math.round(parseInt(value, 10) / 100) / 10);
              } else if (value && label && result.main === null && (label.toLowerCase().indexOf("package") >= 0 || label.toLowerCase().indexOf("physical") >= 0 || label.toLowerCase() === "tccd1")) {
                result.main = Math.round(parseInt(value, 10) / 100) / 10;
              }
            });
            if (tctl && result.main === null) {
              result.main = tctl;
            }
            if (result.cores.length > 0) {
              if (result.main === null) {
                result.main = Math.round(result.cores.reduce((a, b) => a + b, 0) / result.cores.length);
              }
              let maxtmp = Math.max.apply(Math, result.cores);
              result.max = maxtmp > result.main ? maxtmp : result.main;
            }
            if (result.main !== null) {
              if (result.max === null) {
                result.max = result.main;
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
              return;
            }
            if (cpuThermal !== null) {
              result.main = cpuThermal;
              result.max = cpuThermal;
              if (callback) {
                callback(result);
              }
              resolve(result);
              return;
            }
            exec$d("sensors", (error2, stdout2) => {
              if (!error2) {
                const lines2 = stdout2.toString().split("\n");
                let tdieTemp = null;
                let cpuThermalTemp = null;
                let newSectionStarts = true;
                let section = "";
                lines2.forEach((line) => {
                  if (line.trim() === "") {
                    newSectionStarts = true;
                  } else if (newSectionStarts) {
                    const s = line.trim().toLowerCase();
                    if (s.startsWith("acpi")) section = "acpi";
                    else if (s.startsWith("pch")) section = "pch";
                    else if (s.startsWith("coretemp") || s.startsWith("core")) section = "core";
                    else if (s.startsWith("k10temp")) section = "coreAMD";
                    else if (s.startsWith("cpu_thermal") || s.startsWith("cpu-thermal") || s.startsWith("soc_thermal") || s.startsWith("cpu")) section = "cpuThermal";
                    else section = "other";
                    newSectionStarts = false;
                  }
                  const regex2 = /[+-]([^°]*)/g;
                  const temps = line.match(regex2);
                  const firstPart = line.split(":")[0].toUpperCase();
                  if (section === "acpi") {
                    if (firstPart.indexOf("TEMP") !== -1 && temps) {
                      result.socket.push(parseFloat(temps));
                    }
                  } else if (section === "pch") {
                    if (firstPart.indexOf("TEMP") !== -1 && !result.chipset && temps) {
                      result.chipset = parseFloat(temps);
                    }
                  }
                  if ((firstPart.indexOf("PHYSICAL") !== -1 || firstPart.indexOf("PACKAGE") !== -1 || section === "coreAMD" && firstPart.indexOf("TDIE") !== -1) && temps) {
                    result.main = parseFloat(temps);
                  }
                  if (firstPart.indexOf("CORE ") !== -1 && temps) {
                    result.cores.push(parseFloat(temps));
                  }
                  if (firstPart.indexOf("TDIE") !== -1 && tdieTemp === null && temps) {
                    tdieTemp = parseFloat(temps);
                  }
                  if (section === "cpuThermal" && firstPart.indexOf("TEMP") !== -1 && cpuThermalTemp === null && temps) {
                    cpuThermalTemp = parseFloat(temps);
                  }
                });
                if (result.cores.length > 0) {
                  result.main = Math.round(result.cores.reduce((a, b) => a + b, 0) / result.cores.length);
                  const maxtmp = Math.max.apply(Math, result.cores);
                  result.max = maxtmp > result.main ? maxtmp : result.main;
                } else {
                  if (result.main === null && cpuThermalTemp !== null) {
                    result.main = cpuThermalTemp;
                    result.max = cpuThermalTemp;
                  } else if (result.main === null && tdieTemp !== null) {
                    result.main = tdieTemp;
                    result.max = tdieTemp;
                  }
                }
                if (result.main !== null && result.max === null) {
                  result.max = result.main;
                }
                if (result.main !== null || result.max !== null) {
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                  return;
                }
              }
              fs$7.stat("/sys/class/thermal/thermal_zone0/temp", (err2) => {
                if (err2 === null) {
                  fs$7.readFile("/sys/class/thermal/thermal_zone0/temp", (error3, stdout3) => {
                    if (!error3) {
                      const lines2 = stdout3.toString().split("\n");
                      if (lines2.length > 0) {
                        result.main = parseFloat(lines2[0]) / 1e3;
                        result.max = result.main;
                      }
                    }
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                  });
                } else {
                  exec$d("/opt/vc/bin/vcgencmd measure_temp", (error3, stdout3) => {
                    if (!error3) {
                      const lines2 = stdout3.toString().split("\n");
                      if (lines2.length > 0 && lines2[0].indexOf("=") !== -1) {
                        result.main = parseFloat(lines2[0].split("=")[1]);
                        result.max = result.main;
                      }
                    }
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                  });
                }
              });
            });
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_freebsd$c || _openbsd$c || _netbsd$c) {
        exec$d("sysctl dev.cpu | grep temp", (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().split("\n");
            let sum = 0;
            lines.forEach((line) => {
              const parts = line.split(":");
              if (parts.length > 1) {
                const temp = parseFloat(parts[1].replace(",", "."));
                if (temp > result.max) {
                  result.max = temp;
                }
                sum = sum + temp;
                result.cores.push(temp);
              }
            });
            if (result.cores.length) {
              result.main = Math.round(sum / result.cores.length * 100) / 100;
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin$d) {
        try {
          const osxTemp = require("osx-temperature-sensor");
          result = osxTemp.cpuTemperature();
          if (result.main) {
            result.main = Math.round(result.main * 100) / 100;
          }
          if (result.max) {
            result.max = Math.round(result.max * 100) / 100;
          }
          if (result && result.cores && result.cores.length) {
            for (let i = 0; i < result.cores.length; i++) {
              result.cores[i] = Math.round(result.cores[i] * 100) / 100;
            }
          }
        } catch {
          util$f.noop();
        }
        try {
          const macosTemp = require("macos-temperature-sensor");
          const res = macosTemp.temperature();
          if (res.cpu) {
            result.main = Math.round(res.cpu * 100) / 100;
            result.max = result.main;
          }
          if (res.soc) {
            result.chipset = Math.round(res.soc * 100) / 100;
          }
          if (res && res.cpuDieTemps.length) {
            for (const temp of res.cpuDieTemps) {
              result.cores.push(Math.round(temp * 100) / 100);
            }
          }
        } catch {
          util$f.noop();
        }
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_sunos$c) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_windows$e) {
        try {
          util$f.powerShell('Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" | Select CurrentTemperature').then((stdout, error) => {
            if (!error) {
              let sum = 0;
              const lines = stdout.split("\r\n").filter((line) => line.trim() !== "").filter((line, idx) => idx > 0);
              lines.forEach((line) => {
                const value = (parseInt(line, 10) - 2732) / 10;
                if (!isNaN(value)) {
                  sum = sum + value;
                  if (value > result.max) {
                    result.max = value;
                  }
                  result.cores.push(value);
                }
              });
              if (result.cores.length) {
                result.main = sum / result.cores.length;
              }
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
cpu$1.cpuTemperature = cpuTemperature;
function cpuFlags(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = "";
      if (_windows$e) {
        try {
          exec$d('reg query "HKEY_LOCAL_MACHINE\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0" /v FeatureSet', util$f.execOptsWin, (error, stdout) => {
            if (!error) {
              let flag_hex = stdout.split("0x").pop().trim();
              let flag_bin_unpadded = parseInt(flag_hex, 16).toString(2);
              let flag_bin = "0".repeat(32 - flag_bin_unpadded.length) + flag_bin_unpadded;
              let all_flags = [
                "fpu",
                "vme",
                "de",
                "pse",
                "tsc",
                "msr",
                "pae",
                "mce",
                "cx8",
                "apic",
                "",
                "sep",
                "mtrr",
                "pge",
                "mca",
                "cmov",
                "pat",
                "pse-36",
                "psn",
                "clfsh",
                "",
                "ds",
                "acpi",
                "mmx",
                "fxsr",
                "sse",
                "sse2",
                "ss",
                "htt",
                "tm",
                "ia64",
                "pbe"
              ];
              for (let f = 0; f < all_flags.length; f++) {
                if (flag_bin[f] === "1" && all_flags[f] !== "") {
                  result += " " + all_flags[f];
                }
              }
              result = result.trim().toLowerCase();
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_linux$d) {
        try {
          exec$d("export LC_ALL=C; lscpu; unset LC_ALL", (error, stdout) => {
            if (!error) {
              let lines = stdout.toString().split("\n");
              lines.forEach((line) => {
                if (line.split(":")[0].toUpperCase().indexOf("FLAGS") !== -1) {
                  result = line.split(":")[1].trim().toLowerCase();
                }
              });
            }
            if (!result) {
              fs$7.readFile("/proc/cpuinfo", (error2, stdout2) => {
                if (!error2) {
                  let lines = stdout2.toString().split("\n");
                  result = util$f.getValue(lines, "features", ":", true).toLowerCase();
                }
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_freebsd$c || _openbsd$c || _netbsd$c) {
        exec$d("export LC_ALL=C; dmidecode -t 4 2>/dev/null; unset LC_ALL", (error, stdout) => {
          const flags = [];
          if (!error) {
            const parts = stdout.toString().split("	Flags:");
            const lines = parts.length > 1 ? parts[1].split("	Version:")[0].split("\n") : [];
            lines.forEach((line) => {
              const flag = (line.indexOf("(") ? line.split("(")[0].toLowerCase() : "").trim().replace(/\t/g, "");
              if (flag) {
                flags.push(flag);
              }
            });
          }
          result = flags.join(" ").trim().toLowerCase();
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin$d) {
        exec$d("sysctl machdep.cpu.features", (error, stdout) => {
          if (!error) {
            let lines = stdout.toString().split("\n");
            if (lines.length > 0 && lines[0].indexOf("machdep.cpu.features:") !== -1) {
              result = lines[0].split(":")[1].trim().toLowerCase();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$c) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
cpu$1.cpuFlags = cpuFlags;
function cpuCache(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        l1d: null,
        l1i: null,
        l2: null,
        l3: null
      };
      if (_linux$d) {
        try {
          exec$d("export LC_ALL=C; lscpu; unset LC_ALL", (error, stdout) => {
            if (!error) {
              const lines = stdout.toString().split("\n");
              lines.forEach((line) => {
                const parts = line.split(":");
                if (parts[0].toUpperCase().indexOf("L1D CACHE") !== -1) {
                  result.l1d = parseInt(parts[1].trim()) * (parts[1].indexOf("M") !== -1 ? 1024 * 1024 : parts[1].indexOf("K") !== -1 ? 1024 : 1);
                }
                if (parts[0].toUpperCase().indexOf("L1I CACHE") !== -1) {
                  result.l1i = parseInt(parts[1].trim()) * (parts[1].indexOf("M") !== -1 ? 1024 * 1024 : parts[1].indexOf("K") !== -1 ? 1024 : 1);
                }
                if (parts[0].toUpperCase().indexOf("L2 CACHE") !== -1) {
                  result.l2 = parseInt(parts[1].trim()) * (parts[1].indexOf("M") !== -1 ? 1024 * 1024 : parts[1].indexOf("K") !== -1 ? 1024 : 1);
                }
                if (parts[0].toUpperCase().indexOf("L3 CACHE") !== -1) {
                  result.l3 = parseInt(parts[1].trim()) * (parts[1].indexOf("M") !== -1 ? 1024 * 1024 : parts[1].indexOf("K") !== -1 ? 1024 : 1);
                }
              });
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_freebsd$c || _openbsd$c || _netbsd$c) {
        exec$d("export LC_ALL=C; dmidecode -t 7 2>/dev/null; unset LC_ALL", (error, stdout) => {
          let cache = [];
          if (!error) {
            const data = stdout.toString();
            cache = data.split("Cache Information");
            cache.shift();
          }
          for (let i = 0; i < cache.length; i++) {
            const lines = cache[i].split("\n");
            let cacheType = util$f.getValue(lines, "Socket Designation").toLowerCase().replace(" ", "-").split("-");
            cacheType = cacheType.length ? cacheType[0] : "";
            const sizeParts = util$f.getValue(lines, "Installed Size").split(" ");
            let size = parseInt(sizeParts[0], 10);
            const unit = sizeParts.length > 1 ? sizeParts[1] : "kb";
            size = size * (unit === "kb" ? 1024 : unit === "mb" ? 1024 * 1024 : unit === "gb" ? 1024 * 1024 * 1024 : 1);
            if (cacheType) {
              if (cacheType === "l1") {
                result[cacheType + "d"] = size / 2;
                result[cacheType + "i"] = size / 2;
              } else {
                result[cacheType] = size;
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin$d) {
        exec$d("sysctl hw.l1icachesize hw.l1dcachesize hw.l2cachesize hw.l3cachesize", (error, stdout) => {
          if (!error) {
            let lines = stdout.toString().split("\n");
            lines.forEach((line) => {
              let parts = line.split(":");
              if (parts[0].toLowerCase().indexOf("hw.l1icachesize") !== -1) {
                result.l1i = parseInt(parts[1].trim()) * (parts[1].indexOf("K") !== -1 ? 1024 : 1);
              }
              if (parts[0].toLowerCase().indexOf("hw.l1dcachesize") !== -1) {
                result.l1d = parseInt(parts[1].trim()) * (parts[1].indexOf("K") !== -1 ? 1024 : 1);
              }
              if (parts[0].toLowerCase().indexOf("hw.l2cachesize") !== -1) {
                result.l2 = parseInt(parts[1].trim()) * (parts[1].indexOf("K") !== -1 ? 1024 : 1);
              }
              if (parts[0].toLowerCase().indexOf("hw.l3cachesize") !== -1) {
                result.l3 = parseInt(parts[1].trim()) * (parts[1].indexOf("K") !== -1 ? 1024 : 1);
              }
            });
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$c) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_windows$e) {
        try {
          const workload = [];
          workload.push(util$f.powerShell("Get-CimInstance Win32_processor | select L2CacheSize, L3CacheSize | fl"));
          workload.push(util$f.powerShell("Get-CimInstance Win32_CacheMemory | select CacheType,InstalledSize,Level | fl"));
          Promise.all(workload).then((data) => {
            result = parseWinCache(data[0], data[1]);
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
function parseWinCache(linesProc, linesCache) {
  const result = {
    l1d: null,
    l1i: null,
    l2: null,
    l3: null
  };
  let lines = linesProc.split("\r\n");
  result.l1d = 0;
  result.l1i = 0;
  result.l2 = util$f.getValue(lines, "l2cachesize", ":");
  result.l3 = util$f.getValue(lines, "l3cachesize", ":");
  if (result.l2) {
    result.l2 = parseInt(result.l2, 10) * 1024;
  } else {
    result.l2 = 0;
  }
  if (result.l3) {
    result.l3 = parseInt(result.l3, 10) * 1024;
  } else {
    result.l3 = 0;
  }
  const parts = linesCache.split(/\n\s*\n/);
  let l1i = 0;
  let l1d = 0;
  let l2 = 0;
  parts.forEach((part) => {
    const lines2 = part.split("\r\n");
    const cacheType = util$f.getValue(lines2, "CacheType");
    const level = util$f.getValue(lines2, "Level");
    const installedSize = util$f.getValue(lines2, "InstalledSize");
    if (level === "3" && cacheType === "3") {
      result.l1i = result.l1i + parseInt(installedSize, 10) * 1024;
    }
    if (level === "3" && cacheType === "4") {
      result.l1d = result.l1d + parseInt(installedSize, 10) * 1024;
    }
    if (level === "3" && cacheType === "5") {
      l1i = parseInt(installedSize, 10) / 2;
      l1d = parseInt(installedSize, 10) / 2;
    }
    if (level === "4" && cacheType === "5") {
      l2 = l2 + parseInt(installedSize, 10) * 1024;
    }
  });
  if (!result.l1i && !result.l1d) {
    result.l1i = l1i;
    result.l1d = l1d;
  }
  if (l2) {
    result.l2 = l2;
  }
  return result;
}
cpu$1.cpuCache = cpuCache;
function getLoad() {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const loads = os$5.loadavg().map((x) => {
        return x / util$f.cores();
      });
      const avgLoad = parseFloat(Math.max.apply(Math, loads).toFixed(2));
      let result = {};
      const now = Date.now() - _current_cpu.ms;
      if (now >= 200) {
        _current_cpu.ms = Date.now();
        const cpus = os$5.cpus().map((cpu2) => {
          cpu2.times.steal = 0;
          cpu2.times.guest = 0;
          if (_windows$e) {
            cpu2.times.sys = Math.max(0, cpu2.times.sys - cpu2.times.irq);
          }
          return cpu2;
        });
        let totalUser = 0;
        let totalSystem = 0;
        let totalNice = 0;
        let totalIrq = 0;
        let totalIdle = 0;
        let totalSteal = 0;
        let totalGuest = 0;
        const cores2 = [];
        _corecount = cpus && cpus.length ? cpus.length : 0;
        if (_linux$d) {
          try {
            const lines = execSync$8("cat /proc/stat 2>/dev/null | grep cpu", util$f.execOptsLinux).toString().split("\n");
            if (lines.length > 1) {
              lines.shift();
              if (lines.length === cpus.length) {
                for (let i = 0; i < lines.length; i++) {
                  let parts = lines[i].split(" ");
                  if (parts.length >= 10) {
                    const steal = parseFloat(parts[8]) || 0;
                    const guest = parseFloat(parts[9]) || 0;
                    cpus[i].times.steal = steal;
                    cpus[i].times.guest = guest;
                  }
                }
              }
            }
          } catch {
            util$f.noop();
          }
        }
        for (let i = 0; i < _corecount; i++) {
          const cpu2 = cpus[i].times;
          totalUser += cpu2.user;
          totalSystem += cpu2.sys;
          totalNice += cpu2.nice;
          totalIdle += cpu2.idle;
          totalIrq += cpu2.irq;
          totalSteal += cpu2.steal || 0;
          totalGuest += cpu2.guest || 0;
          const tmpTick = _cpus && _cpus[i] && _cpus[i].totalTick ? _cpus[i].totalTick : 0;
          const tmpLoad = _cpus && _cpus[i] && _cpus[i].totalLoad ? _cpus[i].totalLoad : 0;
          const tmpUser = _cpus && _cpus[i] && _cpus[i].user ? _cpus[i].user : 0;
          const tmpSystem = _cpus && _cpus[i] && _cpus[i].sys ? _cpus[i].sys : 0;
          const tmpNice = _cpus && _cpus[i] && _cpus[i].nice ? _cpus[i].nice : 0;
          const tmpIdle = _cpus && _cpus[i] && _cpus[i].idle ? _cpus[i].idle : 0;
          const tmpIrq = _cpus && _cpus[i] && _cpus[i].irq ? _cpus[i].irq : 0;
          const tmpSteal = _cpus && _cpus[i] && _cpus[i].steal ? _cpus[i].steal : 0;
          const tmpGuest = _cpus && _cpus[i] && _cpus[i].guest ? _cpus[i].guest : 0;
          _cpus[i] = cpu2;
          _cpus[i].totalTick = _cpus[i].user + _cpus[i].sys + _cpus[i].nice + _cpus[i].irq + _cpus[i].steal + _cpus[i].guest + _cpus[i].idle;
          _cpus[i].totalLoad = _cpus[i].user + _cpus[i].sys + _cpus[i].nice + _cpus[i].irq + _cpus[i].steal + _cpus[i].guest;
          _cpus[i].currentTick = _cpus[i].totalTick - tmpTick;
          _cpus[i].load = _cpus[i].totalLoad - tmpLoad;
          _cpus[i].loadUser = _cpus[i].user - tmpUser;
          _cpus[i].loadSystem = _cpus[i].sys - tmpSystem;
          _cpus[i].loadNice = _cpus[i].nice - tmpNice;
          _cpus[i].loadIdle = _cpus[i].idle - tmpIdle;
          _cpus[i].loadIrq = _cpus[i].irq - tmpIrq;
          _cpus[i].loadSteal = _cpus[i].steal - tmpSteal;
          _cpus[i].loadGuest = _cpus[i].guest - tmpGuest;
          cores2[i] = {};
          const coreTick = _cpus[i].currentTick || 1;
          cores2[i].load = _cpus[i].load / coreTick * 100;
          cores2[i].loadUser = _cpus[i].loadUser / coreTick * 100;
          cores2[i].loadSystem = _cpus[i].loadSystem / coreTick * 100;
          cores2[i].loadNice = _cpus[i].loadNice / coreTick * 100;
          cores2[i].loadIdle = _cpus[i].loadIdle / coreTick * 100;
          cores2[i].loadIrq = _cpus[i].loadIrq / coreTick * 100;
          cores2[i].loadSteal = _cpus[i].loadSteal / coreTick * 100;
          cores2[i].loadGuest = _cpus[i].loadGuest / coreTick * 100;
          cores2[i].rawLoad = _cpus[i].load;
          cores2[i].rawLoadUser = _cpus[i].loadUser;
          cores2[i].rawLoadSystem = _cpus[i].loadSystem;
          cores2[i].rawLoadNice = _cpus[i].loadNice;
          cores2[i].rawLoadIdle = _cpus[i].loadIdle;
          cores2[i].rawLoadIrq = _cpus[i].loadIrq;
          cores2[i].rawLoadSteal = _cpus[i].loadSteal;
          cores2[i].rawLoadGuest = _cpus[i].loadGuest;
        }
        const totalTick = totalUser + totalSystem + totalNice + totalIrq + totalSteal + totalGuest + totalIdle;
        const totalLoad = totalUser + totalSystem + totalNice + totalIrq + totalSteal + totalGuest;
        const currentTick = totalTick - _current_cpu.tick || 1;
        result = {
          avgLoad,
          currentLoad: (totalLoad - _current_cpu.load) / currentTick * 100,
          currentLoadUser: (totalUser - _current_cpu.user) / currentTick * 100,
          currentLoadSystem: (totalSystem - _current_cpu.system) / currentTick * 100,
          currentLoadNice: (totalNice - _current_cpu.nice) / currentTick * 100,
          currentLoadIdle: (totalIdle - _current_cpu.idle) / currentTick * 100,
          currentLoadIrq: (totalIrq - _current_cpu.irq) / currentTick * 100,
          currentLoadSteal: (totalSteal - _current_cpu.steal) / currentTick * 100,
          currentLoadGuest: (totalGuest - _current_cpu.guest) / currentTick * 100,
          rawCurrentLoad: totalLoad - _current_cpu.load,
          rawCurrentLoadUser: totalUser - _current_cpu.user,
          rawCurrentLoadSystem: totalSystem - _current_cpu.system,
          rawCurrentLoadNice: totalNice - _current_cpu.nice,
          rawCurrentLoadIdle: totalIdle - _current_cpu.idle,
          rawCurrentLoadIrq: totalIrq - _current_cpu.irq,
          rawCurrentLoadSteal: totalSteal - _current_cpu.steal,
          rawCurrentLoadGuest: totalGuest - _current_cpu.guest,
          cpus: cores2
        };
        _current_cpu = {
          user: totalUser,
          nice: totalNice,
          system: totalSystem,
          idle: totalIdle,
          irq: totalIrq,
          steal: totalSteal,
          guest: totalGuest,
          tick: totalTick,
          load: totalLoad,
          ms: _current_cpu.ms,
          currentLoad: result.currentLoad,
          currentLoadUser: result.currentLoadUser,
          currentLoadSystem: result.currentLoadSystem,
          currentLoadNice: result.currentLoadNice,
          currentLoadIdle: result.currentLoadIdle,
          currentLoadIrq: result.currentLoadIrq,
          currentLoadSteal: result.currentLoadSteal,
          currentLoadGuest: result.currentLoadGuest,
          rawCurrentLoad: result.rawCurrentLoad,
          rawCurrentLoadUser: result.rawCurrentLoadUser,
          rawCurrentLoadSystem: result.rawCurrentLoadSystem,
          rawCurrentLoadNice: result.rawCurrentLoadNice,
          rawCurrentLoadIdle: result.rawCurrentLoadIdle,
          rawCurrentLoadIrq: result.rawCurrentLoadIrq,
          rawCurrentLoadSteal: result.rawCurrentLoadSteal,
          rawCurrentLoadGuest: result.rawCurrentLoadGuest
        };
      } else {
        const cores2 = [];
        for (let i = 0; i < _corecount; i++) {
          cores2[i] = {};
          const coreTick = _cpus[i].currentTick || 1;
          cores2[i].load = _cpus[i].load / coreTick * 100;
          cores2[i].loadUser = _cpus[i].loadUser / coreTick * 100;
          cores2[i].loadSystem = _cpus[i].loadSystem / coreTick * 100;
          cores2[i].loadNice = _cpus[i].loadNice / coreTick * 100;
          cores2[i].loadIdle = _cpus[i].loadIdle / coreTick * 100;
          cores2[i].loadIrq = _cpus[i].loadIrq / coreTick * 100;
          cores2[i].loadSteal = _cpus[i].loadSteal / coreTick * 100;
          cores2[i].loadGuest = _cpus[i].loadGuest / coreTick * 100;
          cores2[i].rawLoad = _cpus[i].load;
          cores2[i].rawLoadUser = _cpus[i].loadUser;
          cores2[i].rawLoadSystem = _cpus[i].loadSystem;
          cores2[i].rawLoadNice = _cpus[i].loadNice;
          cores2[i].rawLoadIdle = _cpus[i].loadIdle;
          cores2[i].rawLoadIrq = _cpus[i].loadIrq;
          cores2[i].rawLoadSteal = _cpus[i].loadSteal;
          cores2[i].rawLoadGuest = _cpus[i].loadGuest;
        }
        result = {
          avgLoad,
          currentLoad: _current_cpu.currentLoad,
          currentLoadUser: _current_cpu.currentLoadUser,
          currentLoadSystem: _current_cpu.currentLoadSystem,
          currentLoadNice: _current_cpu.currentLoadNice,
          currentLoadIdle: _current_cpu.currentLoadIdle,
          currentLoadIrq: _current_cpu.currentLoadIrq,
          currentLoadSteal: _current_cpu.currentLoadSteal,
          currentLoadGuest: _current_cpu.currentLoadGuest,
          rawCurrentLoad: _current_cpu.rawCurrentLoad,
          rawCurrentLoadUser: _current_cpu.rawCurrentLoadUser,
          rawCurrentLoadSystem: _current_cpu.rawCurrentLoadSystem,
          rawCurrentLoadNice: _current_cpu.rawCurrentLoadNice,
          rawCurrentLoadIdle: _current_cpu.rawCurrentLoadIdle,
          rawCurrentLoadIrq: _current_cpu.rawCurrentLoadIrq,
          rawCurrentLoadSteal: _current_cpu.rawCurrentLoadSteal,
          rawCurrentLoadGuest: _current_cpu.rawCurrentLoadGuest,
          cpus: cores2
        };
      }
      resolve(result);
    });
  });
}
function currentLoad(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (_current_cpu.ms === 0) {
        getLoad().then(() => {
          setTimeout(() => {
            getLoad().then((result) => {
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          }, 500);
        });
      } else {
        getLoad().then((result) => {
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
    });
  });
}
cpu$1.currentLoad = currentLoad;
function getFullLoad() {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const cpus = os$5.cpus();
      let totalUser = 0;
      let totalSystem = 0;
      let totalNice = 0;
      let totalIrq = 0;
      let totalIdle = 0;
      let result = 0;
      if (cpus && cpus.length) {
        for (let i = 0, len = cpus.length; i < len; i++) {
          const cpu2 = cpus[i].times;
          totalUser += cpu2.user;
          totalSystem += _windows$e ? Math.max(0, cpu2.sys - cpu2.irq) : cpu2.sys;
          totalNice += cpu2.nice;
          totalIrq += cpu2.irq;
          totalIdle += cpu2.idle;
        }
        const totalTicks = totalIdle + totalIrq + totalNice + totalSystem + totalUser;
        result = (totalTicks - totalIdle) / totalTicks * 100;
      }
      resolve(result);
    });
  });
}
function fullLoad(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      getFullLoad().then((result) => {
        if (callback) {
          callback(result);
        }
        resolve(result);
      });
    });
  });
}
cpu$1.fullLoad = fullLoad;
var memory = {};
const os$4 = require$$0$1;
const exec$c = require$$1$4.exec;
const execSync$7 = require$$1$4.execSync;
const util$e = util$i;
const fs$6 = require$$1$1;
let _platform$d = process.platform;
const _linux$c = _platform$d === "linux" || _platform$d === "android";
const _darwin$c = _platform$d === "darwin";
const _windows$d = _platform$d === "win32";
const _freebsd$b = _platform$d === "freebsd";
const _openbsd$b = _platform$d === "openbsd";
const _netbsd$b = _platform$d === "netbsd";
const _sunos$b = _platform$d === "sunos";
const RAM_manufacturers = {
  "00CE": "Samsung Electronics Inc",
  "014F": "Transcend Information Inc.",
  "017A": "Apacer Technology Inc.",
  "0198": "HyperX",
  "029E": "Corsair",
  "02FE": "Elpida",
  "04CB": "A-DATA",
  "04CD": "G.Skill International Enterprise",
  "059B": "Crucial",
  1315: "Crucial",
  "2C00": "Micron Technology Inc.",
  5105: "Qimonda AG i. In.",
  "802C": "Micron Technology Inc.",
  "80AD": "Hynix Semiconductor Inc.",
  "80CE": "Samsung Electronics Inc.",
  8551: "Qimonda AG i. In.",
  "859B": "Crucial",
  AD00: "Hynix Semiconductor Inc.",
  CE00: "Samsung Electronics Inc.",
  SAMSUNG: "Samsung Electronics Inc.",
  HYNIX: "Hynix Semiconductor Inc.",
  "G-SKILL": "G-Skill International Enterprise",
  "G.SKILL": "G-Skill International Enterprise",
  TRANSCEND: "Transcend Information",
  APACER: "Apacer Technology Inc",
  MICRON: "Micron Technology Inc.",
  QIMONDA: "Qimonda AG i. In."
};
function mem(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        total: os$4.totalmem(),
        free: os$4.freemem(),
        used: os$4.totalmem() - os$4.freemem(),
        active: os$4.totalmem() - os$4.freemem(),
        // temporarily (fallback)
        available: os$4.freemem(),
        // temporarily (fallback)
        buffers: 0,
        cached: 0,
        slab: 0,
        buffcache: 0,
        reclaimable: 0,
        swaptotal: 0,
        swapused: 0,
        swapfree: 0,
        writeback: null,
        dirty: null
      };
      if (_linux$c) {
        try {
          fs$6.readFile("/proc/meminfo", (error, stdout) => {
            if (!error) {
              const lines = stdout.toString().split("\n");
              result.total = parseInt(util$e.getValue(lines, "memtotal"), 10);
              result.total = result.total ? result.total * 1024 : os$4.totalmem();
              result.free = parseInt(util$e.getValue(lines, "memfree"), 10);
              result.free = result.free ? result.free * 1024 : os$4.freemem();
              result.used = result.total - result.free;
              result.buffers = parseInt(util$e.getValue(lines, "buffers"), 10);
              result.buffers = result.buffers ? result.buffers * 1024 : 0;
              result.cached = parseInt(util$e.getValue(lines, "cached"), 10);
              result.cached = result.cached ? result.cached * 1024 : 0;
              result.slab = parseInt(util$e.getValue(lines, "slab"), 10);
              result.slab = result.slab ? result.slab * 1024 : 0;
              result.buffcache = result.buffers + result.cached + result.slab;
              let available = parseInt(util$e.getValue(lines, "memavailable"), 10);
              result.available = available ? available * 1024 : result.free + result.buffcache;
              result.active = result.total - result.available;
              result.swaptotal = parseInt(util$e.getValue(lines, "swaptotal"), 10);
              result.swaptotal = result.swaptotal ? result.swaptotal * 1024 : 0;
              result.swapfree = parseInt(util$e.getValue(lines, "swapfree"), 10);
              result.swapfree = result.swapfree ? result.swapfree * 1024 : 0;
              result.swapused = result.swaptotal - result.swapfree;
              result.writeback = parseInt(util$e.getValue(lines, "writeback"), 10);
              result.writeback = result.writeback ? result.writeback * 1024 : 0;
              result.dirty = parseInt(util$e.getValue(lines, "dirty"), 10);
              result.dirty = result.dirty ? result.dirty * 1024 : 0;
              result.reclaimable = parseInt(util$e.getValue(lines, "sreclaimable"), 10);
              result.reclaimable = result.reclaimable ? result.reclaimable * 1024 : 0;
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_freebsd$b || _openbsd$b || _netbsd$b) {
        try {
          exec$c(
            "/sbin/sysctl hw.realmem hw.physmem vm.stats.vm.v_page_count vm.stats.vm.v_wire_count vm.stats.vm.v_active_count vm.stats.vm.v_inactive_count vm.stats.vm.v_cache_count vm.stats.vm.v_free_count vm.stats.vm.v_page_size",
            (error, stdout) => {
              if (!error) {
                const lines = stdout.toString().split("\n");
                const pagesize = parseInt(util$e.getValue(lines, "vm.stats.vm.v_page_size"), 10);
                const inactive = parseInt(util$e.getValue(lines, "vm.stats.vm.v_inactive_count"), 10) * pagesize;
                const cache = parseInt(util$e.getValue(lines, "vm.stats.vm.v_cache_count"), 10) * pagesize;
                result.total = parseInt(util$e.getValue(lines, "hw.realmem"), 10);
                if (isNaN(result.total)) {
                  result.total = parseInt(util$e.getValue(lines, "hw.physmem"), 10);
                }
                result.free = parseInt(util$e.getValue(lines, "vm.stats.vm.v_free_count"), 10) * pagesize;
                result.buffcache = inactive + cache;
                result.available = result.buffcache + result.free;
                result.active = result.total - result.free - result.buffcache;
                result.swaptotal = 0;
                result.swapfree = 0;
                result.swapused = 0;
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          );
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_sunos$b) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_darwin$c) {
        let pageSize = 4096;
        try {
          let sysPpageSize = util$e.toInt(execSync$7("sysctl -n vm.pagesize").toString());
          pageSize = sysPpageSize || pageSize;
        } catch {
          util$e.noop();
        }
        try {
          exec$c('vm_stat 2>/dev/null | egrep "Pages active|Pages inactive|Pages speculative|Pages wired down|Pages occupied by compressor|Pages purgeable|File-backed pages|Anonymous pages"', (error, stdout) => {
            if (!error) {
              let lines = stdout.toString().split("\n");
              const wired = (parseInt(util$e.getValue(lines, "Pages wired down"), 10) || 0) * pageSize;
              const compressed = (parseInt(util$e.getValue(lines, "Pages occupied by compressor"), 10) || 0) * pageSize;
              const purgeable = (parseInt(util$e.getValue(lines, "Pages purgeable"), 10) || 0) * pageSize;
              const anonymous = (parseInt(util$e.getValue(lines, "Anonymous pages"), 10) || 0) * pageSize;
              result.active = anonymous - purgeable + wired + compressed;
              result.reclaimable = (parseInt(util$e.getValue(lines, "Pages inactive"), 10) || 0) * pageSize;
              result.buffcache = result.used - result.active;
              result.available = result.free + result.buffcache;
            }
            exec$c("sysctl -n vm.swapusage 2>/dev/null", (error2, stdout2) => {
              if (!error2) {
                let lines = stdout2.toString().split("\n");
                if (lines.length > 0) {
                  let firstline = lines[0].replace(/,/g, ".").replace(/M/g, "");
                  let lineArray = firstline.trim().split("  ");
                  lineArray.forEach((line) => {
                    if (line.toLowerCase().indexOf("total") !== -1) {
                      result.swaptotal = parseFloat(line.split("=")[1].trim()) * 1024 * 1024;
                    }
                    if (line.toLowerCase().indexOf("used") !== -1) {
                      result.swapused = parseFloat(line.split("=")[1].trim()) * 1024 * 1024;
                    }
                    if (line.toLowerCase().indexOf("free") !== -1) {
                      result.swapfree = parseFloat(line.split("=")[1].trim()) * 1024 * 1024;
                    }
                  });
                }
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_windows$d) {
        let swaptotal = 0;
        let swapused = 0;
        try {
          util$e.powerShell("Get-CimInstance Win32_PageFileUsage | Select AllocatedBaseSize, CurrentUsage").then((stdout, error) => {
            if (!error) {
              let lines = stdout.split("\r\n").filter((line) => line.trim() !== "").filter((line, idx) => idx > 0);
              lines.forEach((line) => {
                if (line !== "") {
                  line = line.trim().split(/\s\s+/);
                  swaptotal = swaptotal + (parseInt(line[0], 10) || 0);
                  swapused = swapused + (parseInt(line[1], 10) || 0);
                }
              });
            }
            result.swaptotal = swaptotal * 1024 * 1024;
            result.swapused = swapused * 1024 * 1024;
            result.swapfree = result.swaptotal - result.swapused;
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
memory.mem = mem;
function memLayout(callback) {
  function getManufacturer(manId) {
    const manIdSearch = manId.replace("0x", "").toUpperCase();
    if (manIdSearch.length >= 4 && {}.hasOwnProperty.call(RAM_manufacturers, manIdSearch)) {
      return RAM_manufacturers[manIdSearch];
    }
    return manId;
  }
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux$c || _freebsd$b || _openbsd$b || _netbsd$b) {
        exec$c(
          'export LC_ALL=C; dmidecode -t memory 2>/dev/null | grep -iE "Size:|Type|Speed|Manufacturer|Form Factor|Locator|Memory Device|Serial Number|Voltage|Part Number"; unset LC_ALL',
          (error, stdout) => {
            if (!error) {
              const devices = stdout.toString().split("Memory Device");
              devices.shift();
              devices.forEach((device) => {
                const lines = device.split("\n");
                const sizeString = util$e.getValue(lines, "Size");
                const size = sizeString.indexOf("GB") >= 0 ? parseInt(sizeString, 10) * 1024 * 1024 * 1024 : parseInt(sizeString, 10) * 1024 * 1024;
                let bank = util$e.getValue(lines, "Bank Locator");
                if (bank.toLowerCase().indexOf("bad") >= 0) {
                  bank = "";
                }
                if (parseInt(util$e.getValue(lines, "Size"), 10) > 0) {
                  const totalWidth = util$e.toInt(util$e.getValue(lines, "Total Width"));
                  const dataWidth = util$e.toInt(util$e.getValue(lines, "Data Width"));
                  result.push({
                    size,
                    bank,
                    type: util$e.getValue(lines, "Type:"),
                    ecc: dataWidth && totalWidth ? totalWidth > dataWidth : false,
                    clockSpeed: util$e.getValue(lines, "Configured Clock Speed:") ? parseInt(util$e.getValue(lines, "Configured Clock Speed:"), 10) : util$e.getValue(lines, "Speed:") ? parseInt(util$e.getValue(lines, "Speed:"), 10) : null,
                    formFactor: util$e.getValue(lines, "Form Factor:"),
                    manufacturer: getManufacturer(util$e.getValue(lines, "Manufacturer:")),
                    partNum: util$e.getValue(lines, "Part Number:"),
                    serialNum: util$e.getValue(lines, "Serial Number:"),
                    voltageConfigured: parseFloat(util$e.getValue(lines, "Configured Voltage:")) || null,
                    voltageMin: parseFloat(util$e.getValue(lines, "Minimum Voltage:")) || null,
                    voltageMax: parseFloat(util$e.getValue(lines, "Maximum Voltage:")) || null
                  });
                } else {
                  result.push({
                    size: 0,
                    bank,
                    type: "Empty",
                    ecc: null,
                    clockSpeed: 0,
                    formFactor: util$e.getValue(lines, "Form Factor:"),
                    manufacturer: "",
                    partNum: "",
                    serialNum: "",
                    voltageConfigured: null,
                    voltageMin: null,
                    voltageMax: null
                  });
                }
              });
            }
            if (!result.length) {
              result.push({
                size: os$4.totalmem(),
                bank: "",
                type: "",
                ecc: null,
                clockSpeed: 0,
                formFactor: "",
                partNum: "",
                serialNum: "",
                voltageConfigured: null,
                voltageMin: null,
                voltageMax: null
              });
              try {
                let stdout2 = execSync$7("cat /proc/cpuinfo 2>/dev/null", util$e.execOptsLinux);
                let lines = stdout2.toString().split("\n");
                let version2 = util$e.getValue(lines, "revision", ":", true).toLowerCase();
                if (util$e.isRaspberry(lines)) {
                  const clockSpeed = {
                    0: 400,
                    1: 450,
                    2: 450,
                    3: 3200,
                    4: 4267
                  };
                  result[0].type = "LPDDR2";
                  result[0].type = version2 && version2[2] && version2[2] === "3" ? "LPDDR4" : result[0].type;
                  result[0].type = version2 && version2[2] && version2[2] === "4" ? "LPDDR4X" : result[0].type;
                  result[0].ecc = false;
                  result[0].clockSpeed = version2 && version2[2] && clockSpeed[version2[2]] || 400;
                  result[0].clockSpeed = version2 && version2[4] && version2[4] === "d" ? 500 : result[0].clockSpeed;
                  result[0].formFactor = "SoC";
                  stdout2 = execSync$7("vcgencmd get_config sdram_freq 2>/dev/null", util$e.execOptsLinux);
                  lines = stdout2.toString().split("\n");
                  let freq = parseInt(util$e.getValue(lines, "sdram_freq", "=", true), 10) || 0;
                  if (freq) {
                    result[0].clockSpeed = freq;
                  }
                  stdout2 = execSync$7("vcgencmd measure_volts sdram_p 2>/dev/null", util$e.execOptsLinux);
                  lines = stdout2.toString().split("\n");
                  let voltage = parseFloat(util$e.getValue(lines, "volt", "=", true)) || 0;
                  if (voltage) {
                    result[0].voltageConfigured = voltage;
                    result[0].voltageMin = voltage;
                    result[0].voltageMax = voltage;
                  }
                }
              } catch {
                util$e.noop();
              }
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        );
      }
      if (_darwin$c) {
        exec$c("system_profiler SPMemoryDataType", (error, stdout) => {
          if (!error) {
            const allLines = stdout.toString().split("\n");
            const eccStatus = util$e.getValue(allLines, "ecc", ":", true).toLowerCase();
            let devices = stdout.toString().split("        BANK ");
            let hasBank = true;
            if (devices.length === 1) {
              devices = stdout.toString().split("        DIMM");
              hasBank = false;
            }
            devices.shift();
            devices.forEach((device) => {
              const lines = device.split("\n");
              const bank = (hasBank ? "BANK " : "DIMM") + lines[0].trim().split("/")[0];
              const sizeString = util$e.getValue(lines, "          Size");
              const size = parseInt(sizeString);
              const sizeUnit = sizeString.toLowerCase().indexOf("mb") >= 0 ? 1024 * 1024 : sizeString.toLowerCase().indexOf("tb") >= 0 ? 1024 * 1024 * 1024 * 1024 : 1024 * 1024 * 1024;
              if (size) {
                result.push({
                  size: size * sizeUnit,
                  bank,
                  type: util$e.getValue(lines, "          Type:"),
                  ecc: eccStatus ? eccStatus === "enabled" : null,
                  clockSpeed: parseInt(util$e.getValue(lines, "          Speed:"), 10),
                  formFactor: "",
                  manufacturer: getManufacturer(util$e.getValue(lines, "          Manufacturer:")),
                  partNum: util$e.getValue(lines, "          Part Number:"),
                  serialNum: util$e.getValue(lines, "          Serial Number:"),
                  voltageConfigured: null,
                  voltageMin: null,
                  voltageMax: null
                });
              } else {
                result.push({
                  size: 0,
                  bank,
                  type: "Empty",
                  ecc: null,
                  clockSpeed: 0,
                  formFactor: "",
                  manufacturer: "",
                  partNum: "",
                  serialNum: "",
                  voltageConfigured: null,
                  voltageMin: null,
                  voltageMax: null
                });
              }
            });
          }
          if (!result.length) {
            const lines = stdout.toString().split("\n");
            const size = parseInt(util$e.getValue(lines, "      Memory:"));
            const type = util$e.getValue(lines, "      Type:");
            const manufacturerId = util$e.getValue(lines, "      Manufacturer:");
            if (size && type) {
              result.push({
                size: size * 1024 * 1024 * 1024,
                bank: "0",
                type,
                ecc: false,
                clockSpeed: null,
                formFactor: "SOC",
                manufacturer: getManufacturer(manufacturerId),
                partNum: "",
                serialNum: "",
                voltageConfigured: null,
                voltageMin: null,
                voltageMax: null
              });
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$b) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_windows$d) {
        const memoryTypes = "Unknown|Other|DRAM|Synchronous DRAM|Cache DRAM|EDO|EDRAM|VRAM|SRAM|RAM|ROM|FLASH|EEPROM|FEPROM|EPROM|CDRAM|3DRAM|SDRAM|SGRAM|RDRAM|DDR|DDR2|DDR2 FB-DIMM|Reserved|DDR3|FBD2|DDR4|LPDDR|LPDDR2|LPDDR3|LPDDR4|Logical non-volatile device|HBM|HBM2|DDR5|LPDDR5".split(
          "|"
        );
        const FormFactors = "Unknown|Other|SIP|DIP|ZIP|SOJ|Proprietary|SIMM|DIMM|TSOP|PGA|RIMM|SODIMM|SRIMM|SMD|SSMP|QFP|TQFP|SOIC|LCC|PLCC|BGA|FPBGA|LGA".split("|");
        try {
          util$e.powerShell(
            "Get-CimInstance Win32_PhysicalMemory | select DataWidth,TotalWidth,Capacity,BankLabel,MemoryType,SMBIOSMemoryType,ConfiguredClockSpeed,Speed,FormFactor,Manufacturer,PartNumber,SerialNumber,ConfiguredVoltage,MinVoltage,MaxVoltage,Tag | fl"
          ).then((stdout, error) => {
            if (!error) {
              const devices = stdout.toString().split(/\n\s*\n/);
              devices.shift();
              devices.forEach((device) => {
                const lines = device.split("\r\n");
                const dataWidth = util$e.toInt(util$e.getValue(lines, "DataWidth", ":"));
                const totalWidth = util$e.toInt(util$e.getValue(lines, "TotalWidth", ":"));
                const size = parseInt(util$e.getValue(lines, "Capacity", ":"), 10) || 0;
                const tag = util$e.getValue(lines, "Tag", ":");
                const tagInt = util$e.splitByNumber(tag);
                if (size) {
                  result.push({
                    size,
                    bank: util$e.getValue(lines, "BankLabel", ":") + (tagInt[1] ? "/" + tagInt[1] : ""),
                    // BankLabel
                    type: memoryTypes[parseInt(util$e.getValue(lines, "MemoryType", ":"), 10) || parseInt(util$e.getValue(lines, "SMBIOSMemoryType", ":"), 10) || 0],
                    ecc: dataWidth && totalWidth ? totalWidth > dataWidth : false,
                    clockSpeed: parseInt(util$e.getValue(lines, "ConfiguredClockSpeed", ":"), 10) || parseInt(util$e.getValue(lines, "Speed", ":"), 10) || 0,
                    formFactor: FormFactors[parseInt(util$e.getValue(lines, "FormFactor", ":"), 10) || 0],
                    manufacturer: getManufacturer(util$e.getValue(lines, "Manufacturer", ":")),
                    partNum: util$e.getValue(lines, "PartNumber", ":"),
                    serialNum: util$e.getValue(lines, "SerialNumber", ":"),
                    voltageConfigured: (parseInt(util$e.getValue(lines, "ConfiguredVoltage", ":"), 10) || 0) / 1e3,
                    voltageMin: (parseInt(util$e.getValue(lines, "MinVoltage", ":"), 10) || 0) / 1e3,
                    voltageMax: (parseInt(util$e.getValue(lines, "MaxVoltage", ":"), 10) || 0) / 1e3
                  });
                }
              });
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
memory.memLayout = memLayout;
const exec$b = require$$1$4.exec;
const fs$5 = require$$1$1;
const util$d = util$i;
const _platform$c = process.platform;
const _linux$b = _platform$c === "linux" || _platform$c === "android";
const _darwin$b = _platform$c === "darwin";
const _windows$c = _platform$c === "win32";
const _freebsd$a = _platform$c === "freebsd";
const _openbsd$a = _platform$c === "openbsd";
const _netbsd$a = _platform$c === "netbsd";
const _sunos$a = _platform$c === "sunos";
function parseWinBatteryPart(lines, designedCapacity, fullChargeCapacity) {
  const result = {};
  let status = parseInt(util$d.getValue(lines, "BatteryStatus", ":").trim(), 10) || 0;
  if (status >= 0) {
    const statusValue = status;
    result.status = statusValue;
    result.hasBattery = true;
    result.maxCapacity = fullChargeCapacity || parseInt(util$d.getValue(lines, "DesignCapacity", ":") || 0);
    result.designedCapacity = parseInt(util$d.getValue(lines, "DesignCapacity", ":") || designedCapacity);
    result.voltage = (parseInt(util$d.getValue(lines, "DesignVoltage", ":"), 10) || 0) / 1e3;
    result.capacityUnit = "mWh";
    result.percent = parseInt(util$d.getValue(lines, "EstimatedChargeRemaining", ":"), 10) || 0;
    result.currentCapacity = parseInt(result.maxCapacity * result.percent / 100);
    result.isCharging = statusValue >= 6 && statusValue <= 9 || statusValue === 11 || statusValue !== 3 && statusValue !== 1 && result.percent < 100;
    result.acConnected = result.isCharging || statusValue === 2;
    result.model = util$d.getValue(lines, "DeviceID", ":");
  } else {
    result.status = -1;
  }
  return result;
}
var battery = (callback) => new Promise((resolve) => {
  process.nextTick(() => {
    let result = {
      hasBattery: false,
      cycleCount: 0,
      isCharging: false,
      designedCapacity: 0,
      maxCapacity: 0,
      currentCapacity: 0,
      voltage: 0,
      capacityUnit: "",
      percent: 0,
      timeRemaining: null,
      acConnected: true,
      type: "",
      model: "",
      manufacturer: "",
      serial: ""
    };
    if (_linux$b) {
      let battery_path = "";
      if (fs$5.existsSync("/sys/class/power_supply/BAT1/uevent")) {
        battery_path = "/sys/class/power_supply/BAT1/";
      } else if (fs$5.existsSync("/sys/class/power_supply/BAT0/uevent")) {
        battery_path = "/sys/class/power_supply/BAT0/";
      }
      let acConnected = false;
      let acPath = "";
      if (fs$5.existsSync("/sys/class/power_supply/AC/online")) {
        acPath = "/sys/class/power_supply/AC/online";
      } else if (fs$5.existsSync("/sys/class/power_supply/AC0/online")) {
        acPath = "/sys/class/power_supply/AC0/online";
      }
      if (acPath) {
        try {
          const file = fs$5.readFileSync(acPath);
          acConnected = file.toString().trim() === "1";
        } catch {
          util$d.noop();
        }
      }
      if (battery_path) {
        fs$5.readFile(battery_path + "uevent", (error, stdout) => {
          if (!error) {
            let lines = stdout.toString().split("\n");
            result.isCharging = util$d.getValue(lines, "POWER_SUPPLY_STATUS", "=").toLowerCase() === "charging";
            result.acConnected = acConnected || result.isCharging;
            result.voltage = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_VOLTAGE_NOW", "="), 10) / 1e6;
            result.capacityUnit = result.voltage ? "mWh" : "mAh";
            result.cycleCount = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_CYCLE_COUNT", "="), 10);
            result.maxCapacity = Math.round(parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_CHARGE_FULL", "=", true, true), 10) / 1e3 * (result.voltage || 1));
            const desingedMinVoltage = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_VOLTAGE_MIN_DESIGN", "="), 10) / 1e6;
            result.designedCapacity = Math.round(
              parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_CHARGE_FULL_DESIGN", "=", true, true), 10) / 1e3 * (desingedMinVoltage || result.voltage || 1)
            );
            result.currentCapacity = Math.round(parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_CHARGE_NOW", "="), 10) / 1e3 * (result.voltage || 1));
            if (!result.maxCapacity) {
              result.maxCapacity = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_ENERGY_FULL", "=", true, true), 10) / 1e3;
              result.designedCapacity = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_ENERGY_FULL_DESIGN", "=", true, true), 10) / 1e3 | result.maxCapacity;
              result.currentCapacity = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_ENERGY_NOW", "="), 10) / 1e3;
            }
            const percent = util$d.getValue(lines, "POWER_SUPPLY_CAPACITY", "=");
            const energy = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_ENERGY_NOW", "="), 10);
            const power = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_POWER_NOW", "="), 10);
            const current = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_CURRENT_NOW", "="), 10);
            const charge = parseInt("0" + util$d.getValue(lines, "POWER_SUPPLY_CHARGE_NOW", "="), 10);
            result.percent = parseInt("0" + percent, 10);
            if (result.maxCapacity && result.currentCapacity) {
              result.hasBattery = true;
              if (!percent) {
                result.percent = 100 * result.currentCapacity / result.maxCapacity;
              }
            }
            if (result.isCharging) {
              result.hasBattery = true;
            }
            if (energy && power) {
              result.timeRemaining = Math.floor(energy / power * 60);
            } else if (current && charge) {
              result.timeRemaining = Math.floor(charge / current * 60);
            } else if (current && result.currentCapacity) {
              result.timeRemaining = Math.floor(result.currentCapacity / current * 60);
            }
            result.type = util$d.getValue(lines, "POWER_SUPPLY_TECHNOLOGY", "=");
            result.model = util$d.getValue(lines, "POWER_SUPPLY_MODEL_NAME", "=");
            result.manufacturer = util$d.getValue(lines, "POWER_SUPPLY_MANUFACTURER", "=");
            result.serial = util$d.getValue(lines, "POWER_SUPPLY_SERIAL_NUMBER", "=");
            if (callback) {
              callback(result);
            }
            resolve(result);
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        });
      } else {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    }
    if (_freebsd$a || _openbsd$a || _netbsd$a) {
      exec$b("sysctl -i hw.acpi.battery hw.acpi.acline", (error, stdout) => {
        let lines = stdout.toString().split("\n");
        const batteries = parseInt("0" + util$d.getValue(lines, "hw.acpi.battery.units"), 10);
        const percent = parseInt("0" + util$d.getValue(lines, "hw.acpi.battery.life"), 10);
        result.hasBattery = batteries > 0;
        result.cycleCount = null;
        result.isCharging = util$d.getValue(lines, "hw.acpi.acline") !== "1";
        result.acConnected = result.isCharging;
        result.maxCapacity = null;
        result.currentCapacity = null;
        result.capacityUnit = "unknown";
        result.percent = batteries ? percent : null;
        if (callback) {
          callback(result);
        }
        resolve(result);
      });
    }
    if (_darwin$b) {
      exec$b(
        'ioreg -n AppleSmartBattery -r | egrep "CycleCount|IsCharging|DesignCapacity|MaxCapacity|CurrentCapacity|DeviceName|BatterySerialNumber|Serial|TimeRemaining|Voltage"; pmset -g batt | grep %',
        (error, stdout) => {
          if (stdout) {
            let lines = stdout.toString().replace(/ +/g, "").replace(/"+/g, "").replace(/-/g, "").split("\n");
            result.cycleCount = parseInt("0" + util$d.getValue(lines, "cyclecount", "="), 10);
            result.voltage = parseInt("0" + util$d.getValue(lines, "voltage", "="), 10) / 1e3;
            result.capacityUnit = result.voltage ? "mWh" : "mAh";
            result.maxCapacity = Math.round(parseInt("0" + util$d.getValue(lines, "applerawmaxcapacity", "="), 10) * (result.voltage || 1));
            result.currentCapacity = Math.round(parseInt("0" + util$d.getValue(lines, "applerawcurrentcapacity", "="), 10) * (result.voltage || 1));
            result.designedCapacity = Math.round(parseInt("0" + util$d.getValue(lines, "DesignCapacity", "="), 10) * (result.voltage || 1));
            result.manufacturer = "Apple";
            result.serial = util$d.getValue(lines, "BatterySerialNumber", "=") || util$d.getValue(lines, "Serial", "=");
            result.model = util$d.getValue(lines, "DeviceName", "=");
            let percent = null;
            const line = util$d.getValue(lines, "internal", "Battery");
            let parts = line.split(";");
            if (parts && parts[0]) {
              let parts2 = parts[0].split("	");
              if (parts2 && parts2[1]) {
                percent = parseFloat(parts2[1].trim().replace(/%/g, ""));
              }
            }
            if (parts && parts[1]) {
              result.isCharging = parts[1].trim() === "charging";
              result.acConnected = parts[1].trim() !== "discharging";
            } else {
              result.isCharging = util$d.getValue(lines, "ischarging", "=").toLowerCase() === "yes";
              result.acConnected = result.isCharging;
            }
            if (result.maxCapacity && result.currentCapacity) {
              result.hasBattery = true;
              result.type = "Li-ion";
              result.percent = percent !== null ? percent : Math.round(100 * result.currentCapacity / result.maxCapacity);
              if (!result.isCharging) {
                result.timeRemaining = parseInt("0" + util$d.getValue(lines, "TimeRemaining", "="), 10);
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      );
    }
    if (_sunos$a) {
      if (callback) {
        callback(result);
      }
      resolve(result);
    }
    if (_windows$c) {
      try {
        const workload = [];
        workload.push(util$d.powerShell("Get-CimInstance Win32_Battery | select BatteryStatus, DesignCapacity, DesignVoltage, EstimatedChargeRemaining, DeviceID | fl"));
        workload.push(util$d.powerShell("(Get-WmiObject -Class BatteryStaticData -Namespace ROOT/WMI).DesignedCapacity"));
        workload.push(util$d.powerShell("(Get-CimInstance -Class BatteryFullChargedCapacity -Namespace ROOT/WMI).FullChargedCapacity"));
        util$d.promiseAll(workload).then((data) => {
          if (data) {
            const parts = data.results[0].split(/\n\s*\n/);
            const batteries = [];
            const hasValue = (value) => /\S/.test(value);
            for (let i = 0; i < parts.length; i++) {
              if (hasValue(parts[i])) {
                batteries.push(parts[i]);
              }
            }
            const designCapacities = data.results[1].split("\r\n").filter((e) => e);
            const fullChargeCapacities = data.results[2].split("\r\n").filter((e) => e);
            if (batteries.length) {
              let first = false;
              const additionalBatteries = [];
              for (let i = 0; i < batteries.length; i++) {
                const lines = batteries[i].split("\r\n");
                const designedCapacity = designCapacities && designCapacities.length >= i + 1 && designCapacities[i] ? util$d.toInt(designCapacities[i]) : 0;
                const fullChargeCapacity = fullChargeCapacities && fullChargeCapacities.length >= i + 1 && fullChargeCapacities[i] ? util$d.toInt(fullChargeCapacities[i]) : 0;
                const parsed = parseWinBatteryPart(lines, designedCapacity, fullChargeCapacity);
                if (!first && parsed.status > 0 && parsed.status !== 10) {
                  result.hasBattery = parsed.hasBattery;
                  result.maxCapacity = parsed.maxCapacity;
                  result.designedCapacity = parsed.designedCapacity;
                  result.voltage = parsed.voltage;
                  result.capacityUnit = parsed.capacityUnit;
                  result.percent = parsed.percent;
                  result.currentCapacity = parsed.currentCapacity;
                  result.isCharging = parsed.isCharging;
                  result.acConnected = parsed.acConnected;
                  result.model = parsed.model;
                  first = true;
                } else if (parsed.status !== -1) {
                  additionalBatteries.push({
                    hasBattery: parsed.hasBattery,
                    maxCapacity: parsed.maxCapacity,
                    designedCapacity: parsed.designedCapacity,
                    voltage: parsed.voltage,
                    capacityUnit: parsed.capacityUnit,
                    percent: parsed.percent,
                    currentCapacity: parsed.currentCapacity,
                    isCharging: parsed.isCharging,
                    timeRemaining: null,
                    acConnected: parsed.acConnected,
                    model: parsed.model,
                    type: "",
                    manufacturer: "",
                    serial: ""
                  });
                }
              }
              if (!first && additionalBatteries.length) {
                result = additionalBatteries[0];
                additionalBatteries.shift();
              }
              if (additionalBatteries.length) {
                result.additionalBatteries = additionalBatteries;
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } catch {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    }
  });
});
var graphics$1 = {};
const fs$4 = require$$1$1;
const path$2 = require$$1;
const exec$a = require$$1$4.exec;
const execSync$6 = require$$1$4.execSync;
const execFileSync$1 = require$$1$4.execFileSync;
const util$c = util$i;
const _platform$b = process.platform;
let _nvidiaSmiPath = "";
const _linux$a = _platform$b === "linux" || _platform$b === "android";
const _darwin$a = _platform$b === "darwin";
const _windows$b = _platform$b === "win32";
const _freebsd$9 = _platform$b === "freebsd";
const _openbsd$9 = _platform$b === "openbsd";
const _netbsd$9 = _platform$b === "netbsd";
const _sunos$9 = _platform$b === "sunos";
let _resolutionX = 0;
let _resolutionY = 0;
let _pixelDepth = 0;
let _refreshRate = 0;
const psCurrentModes = `Add-Type -AssemblyName System.Windows.Forms; if (-not ('SiDevMode' -as [Type])) { Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Ansi)]public struct SIDEVMODE{[MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)]public string dmDeviceName;public short dmSpecVersion;public short dmDriverVersion;public short dmSize;public short dmDriverExtra;public int dmFields;public int dmPositionX;public int dmPositionY;public int dmDisplayOrientation;public int dmDisplayFixedOutput;public short dmColor;public short dmDuplex;public short dmYResolution;public short dmTTOption;public short dmCollate;[MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)]public string dmFormName;public short dmLogPixels;public int dmBitsPerPel;public int dmPelsWidth;public int dmPelsHeight;public int dmDisplayFlags;public int dmDisplayFrequency;public int dmICMMethod;public int dmICMIntent;public int dmMediaType;public int dmDitherType;public int dmReserved1;public int dmReserved2;public int dmPanningWidth;public int dmPanningHeight;}public class SiDevMode{[DllImport("user32.dll",CharSet=CharSet.Ansi)]public static extern bool EnumDisplaySettings(string lpszDeviceName,int iModeNum,ref SIDEVMODE lpDevMode);}' }; [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { $dm = New-Object SIDEVMODE; $dm.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($dm); if ([SiDevMode]::EnumDisplaySettings($_.DeviceName, -1, [ref]$dm)) { $_.DeviceName + '|' + $dm.dmDisplayFrequency + '|' + $dm.dmBitsPerPel + '|' + $dm.dmPelsWidth + '|' + $dm.dmPelsHeight } }`;
const videoTypes = {
  "-2": "UNINITIALIZED",
  "-1": "OTHER",
  0: "HD15",
  1: "SVIDEO",
  2: "Composite video",
  3: "Component video",
  4: "DVI",
  5: "HDMI",
  6: "LVDS",
  8: "D_JPN",
  9: "SDI",
  10: "DP",
  11: "DP embedded",
  12: "UDI",
  13: "UDI embedded",
  14: "SDTVDONGLE",
  15: "MIRACAST",
  2147483648: "INTERNAL",
  4294967295: "RDP"
};
function getVendorFromModel(model) {
  const manufacturers = [
    { pattern: "^LG.+", manufacturer: "LG" },
    { pattern: "^BENQ.+", manufacturer: "BenQ" },
    { pattern: "^ASUS.+", manufacturer: "Asus" },
    { pattern: "^DELL.+", manufacturer: "Dell" },
    { pattern: "^SAMSUNG.+", manufacturer: "Samsung" },
    { pattern: "^VIEWSON.+", manufacturer: "ViewSonic" },
    { pattern: "^SONY.+", manufacturer: "Sony" },
    { pattern: "^ACER.+", manufacturer: "Acer" },
    { pattern: "^AOC.+", manufacturer: "AOC Monitors" },
    { pattern: "^HP.+", manufacturer: "HP" },
    { pattern: "^EIZO.?", manufacturer: "Eizo" },
    { pattern: "^PHILIPS.?", manufacturer: "Philips" },
    { pattern: "^IIYAMA.?", manufacturer: "Iiyama" },
    { pattern: "^SHARP.?", manufacturer: "Sharp" },
    { pattern: "^NEC.?", manufacturer: "NEC" },
    { pattern: "^LENOVO.?", manufacturer: "Lenovo" },
    { pattern: "COMPAQ.?", manufacturer: "Compaq" },
    { pattern: "APPLE.?", manufacturer: "Apple" },
    { pattern: "INTEL.?", manufacturer: "Intel" },
    { pattern: "AMD.?", manufacturer: "AMD" },
    { pattern: "NVIDIA.?", manufacturer: "NVIDIA" }
  ];
  let result = "";
  if (model) {
    model = model.toUpperCase();
    manufacturers.forEach((manufacturer) => {
      const re2 = RegExp(manufacturer.pattern);
      if (re2.test(model)) {
        result = manufacturer.manufacturer;
      }
    });
  }
  return result;
}
function getVendorFromId(id) {
  const vendors = {
    610: "Apple",
    "1e6d": "LG",
    "10ac": "DELL",
    "4dd9": "Sony",
    "38a3": "NEC"
  };
  return vendors[id] || "";
}
function vendorToId(str) {
  let result = "";
  str = (str || "").toLowerCase();
  if (str.indexOf("apple") >= 0) {
    result = "0x05ac";
  } else if (str.indexOf("nvidia") >= 0) {
    result = "0x10de";
  } else if (str.indexOf("intel") >= 0) {
    result = "0x8086";
  } else if (str.indexOf("ati") >= 0 || str.indexOf("amd") >= 0) {
    result = "0x1002";
  }
  return result;
}
function getMetalVersion(id) {
  const families = {
    spdisplays_mtlgpufamilymac1: "mac1",
    spdisplays_mtlgpufamilymac2: "mac2",
    spdisplays_mtlgpufamilyapple1: "apple1",
    spdisplays_mtlgpufamilyapple2: "apple2",
    spdisplays_mtlgpufamilyapple3: "apple3",
    spdisplays_mtlgpufamilyapple4: "apple4",
    spdisplays_mtlgpufamilyapple5: "apple5",
    spdisplays_mtlgpufamilyapple6: "apple6",
    spdisplays_mtlgpufamilyapple7: "apple7",
    spdisplays_metalfeaturesetfamily11: "family1_v1",
    spdisplays_metalfeaturesetfamily12: "family1_v2",
    spdisplays_metalfeaturesetfamily13: "family1_v3",
    spdisplays_metalfeaturesetfamily14: "family1_v4",
    spdisplays_metalfeaturesetfamily21: "family2_v1"
  };
  return families[id] || "";
}
function graphics(callback) {
  function parseLinesDarwin(graphicsArr) {
    const res = {
      controllers: [],
      displays: []
    };
    try {
      graphicsArr.forEach((item) => {
        const bus = (item.sppci_bus || "").indexOf("builtin") > -1 ? "Built-In" : (item.sppci_bus || "").indexOf("pcie") > -1 ? "PCIe" : "";
        const vram = (parseInt(item.spdisplays_vram || "", 10) || 0) * ((item.spdisplays_vram || "").indexOf("GB") > -1 ? 1024 : 1);
        const vramDyn = (parseInt(item.spdisplays_vram_shared || "", 10) || 0) * ((item.spdisplays_vram_shared || "").indexOf("GB") > -1 ? 1024 : 1);
        const metalVersion = getMetalVersion(item.spdisplays_metal || item.spdisplays_metalfamily || "");
        res.controllers.push({
          vendor: getVendorFromModel(item.spdisplays_vendor || "") || item.spdisplays_vendor || "",
          model: item.sppci_model || "",
          bus,
          vramDynamic: bus === "Built-In",
          vram: vram || vramDyn || null,
          deviceId: item["spdisplays_device-id"] || "",
          vendorId: item["spdisplays_vendor-id"] || vendorToId((item["spdisplays_vendor"] || "") + (item.sppci_model || "")),
          external: item.sppci_device_type === "spdisplays_egpu",
          cores: item["sppci_cores"] || null,
          metalVersion
        });
        if (item.spdisplays_ndrvs && item.spdisplays_ndrvs.length) {
          item.spdisplays_ndrvs.forEach((displayItem) => {
            const connectionType = displayItem["spdisplays_connection_type"] || "";
            const currentResolutionParts = (displayItem["_spdisplays_resolution"] || "").split("@");
            const currentResolution = currentResolutionParts[0].split("x");
            const pixelParts = (displayItem["_spdisplays_pixels"] || "").split("x");
            const pixelDepthString = displayItem["spdisplays_depth"] || "";
            const serial = displayItem["_spdisplays_display-serial-number"] || displayItem["_spdisplays_display-serial-number2"] || null;
            res.displays.push({
              vendor: getVendorFromId(displayItem["_spdisplays_display-vendor-id"] || "") || getVendorFromModel(displayItem["_name"] || ""),
              vendorId: displayItem["_spdisplays_display-vendor-id"] || "",
              model: displayItem["_name"] || "",
              productionYear: displayItem["_spdisplays_display-year"] || null,
              serial: serial !== "0" ? serial : null,
              displayId: displayItem["_spdisplays_displayID"] || null,
              main: displayItem["spdisplays_main"] ? displayItem["spdisplays_main"] === "spdisplays_yes" : false,
              builtin: (displayItem["spdisplays_display_type"] || "").indexOf("built-in") > -1,
              connection: connectionType.indexOf("_internal") > -1 ? "Internal" : connectionType.indexOf("_displayport") > -1 ? "Display Port" : connectionType.indexOf("_hdmi") > -1 ? "HDMI" : null,
              sizeX: null,
              sizeY: null,
              pixelDepth: pixelDepthString === "CGSThirtyBitColor" ? 30 : pixelDepthString === "CGSThirtytwoBitColor" ? 32 : pixelDepthString === "CGSTwentyfourBitColor" ? 24 : null,
              resolutionX: pixelParts.length > 1 ? parseInt(pixelParts[0], 10) : null,
              resolutionY: pixelParts.length > 1 ? parseInt(pixelParts[1], 10) : null,
              currentResX: currentResolution.length > 1 ? parseInt(currentResolution[0], 10) : null,
              currentResY: currentResolution.length > 1 ? parseInt(currentResolution[1], 10) : null,
              positionX: 0,
              positionY: 0,
              currentRefreshRate: currentResolutionParts.length > 1 ? parseInt(currentResolutionParts[1], 10) : null
            });
          });
        }
      });
      return res;
    } catch (e) {
      return res;
    }
  }
  function parseLinesLinuxControllers(lines) {
    const controllers = [];
    let currentController = {
      vendor: "",
      subVendor: "",
      model: "",
      bus: "",
      busAddress: "",
      vram: null,
      vramDynamic: false,
      pciID: ""
    };
    let isGraphicsController = false;
    let pciIDs = [];
    try {
      pciIDs = execSync$6('export LC_ALL=C; dmidecode -t 9 2>/dev/null; unset LC_ALL | grep "Bus Address: "', util$c.execOptsLinux).toString().split("\n");
      for (let i2 = 0; i2 < pciIDs.length; i2++) {
        pciIDs[i2] = pciIDs[i2].replace("Bus Address:", "").replace("0000:", "").trim();
      }
      pciIDs = pciIDs.filter((el) => el != null && el);
    } catch {
      util$c.noop();
    }
    let i = 1;
    lines.forEach((line) => {
      let subsystem = "";
      if (i < lines.length && lines[i]) {
        subsystem = lines[i];
        if (subsystem.indexOf(":") > 0) {
          subsystem = subsystem.split(":")[1];
        }
      }
      if ("" !== line.trim()) {
        if (" " !== line[0] && "	" !== line[0]) {
          const isExternal = pciIDs.indexOf(line.split(" ")[0]) >= 0;
          let vgapos = line.toLowerCase().indexOf(" vga ");
          const _3dcontrollerpos = line.toLowerCase().indexOf("3d controller");
          const _displaycontrollerpos = line.toLowerCase().indexOf("display controller");
          if (vgapos !== -1 || _3dcontrollerpos !== -1 || _displaycontrollerpos !== -1) {
            if (_3dcontrollerpos !== -1 && vgapos === -1) {
              vgapos = _3dcontrollerpos;
            }
            if (_displaycontrollerpos !== -1 && vgapos === -1) {
              vgapos = _displaycontrollerpos;
            }
            if (currentController.vendor || currentController.model || currentController.bus || currentController.vram !== null || currentController.vramDynamic) {
              controllers.push(currentController);
              currentController = {
                vendor: "",
                model: "",
                bus: "",
                busAddress: "",
                vram: null,
                vramDynamic: false
              };
            }
            const pciIDCandidate = line.split(" ")[0];
            if (/[\da-fA-F]{2}:[\da-fA-F]{2}\.[\da-fA-F]/.test(pciIDCandidate)) {
              currentController.busAddress = pciIDCandidate;
            }
            isGraphicsController = true;
            const endpos = line.search(/\[[0-9a-f]{4}:[0-9a-f]{4}]|$/);
            const parts = line.substr(vgapos, endpos - vgapos).split(":");
            currentController.busAddress = line.substr(0, vgapos).trim();
            if (parts.length > 1) {
              parts[1] = parts[1].trim();
              if (parts[1].toLowerCase().indexOf("corporation") >= 0) {
                currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf("corporation") + 11).trim();
                currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf("corporation") + 11, 200).split("(")[0].trim();
                currentController.bus = pciIDs.length > 0 && isExternal ? "PCIe" : "Onboard";
                currentController.vram = null;
                currentController.vramDynamic = false;
              } else if (parts[1].toLowerCase().indexOf(" inc.") >= 0) {
                if ((parts[1].match(/]/g) || []).length > 1) {
                  currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf("]") + 1).trim();
                  currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf("]") + 1, 200).trim().split("(")[0].trim();
                } else {
                  currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf(" inc.") + 5).trim();
                  currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf(" inc.") + 5, 200).trim().split("(")[0].trim();
                }
                currentController.bus = pciIDs.length > 0 && isExternal ? "PCIe" : "Onboard";
                currentController.vram = null;
                currentController.vramDynamic = false;
              } else if (parts[1].toLowerCase().indexOf(" ltd.") >= 0) {
                if ((parts[1].match(/]/g) || []).length > 1) {
                  currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf("]") + 1).trim();
                  currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf("]") + 1, 200).trim().split("(")[0].trim();
                } else {
                  currentController.vendor = parts[1].substr(0, parts[1].toLowerCase().indexOf(" ltd.") + 5).trim();
                  currentController.model = parts[1].substr(parts[1].toLowerCase().indexOf(" ltd.") + 5, 200).trim().split("(")[0].trim();
                }
              }
              if (currentController.model && subsystem.indexOf(currentController.model) !== -1) {
                const subVendor = subsystem.split(currentController.model)[0].trim();
                if (subVendor) {
                  currentController.subVendor = subVendor;
                }
              }
            }
          } else {
            isGraphicsController = false;
          }
        }
        if (isGraphicsController) {
          const parts = line.split(":");
          if (parts.length > 1 && parts[0].replace(/ +/g, "").toLowerCase().indexOf("devicename") !== -1 && parts[1].toLowerCase().indexOf("onboard") !== -1) {
            currentController.bus = "Onboard";
          }
          if (parts.length > 1 && parts[0].replace(/ +/g, "").toLowerCase().indexOf("region") !== -1 && parts[1].toLowerCase().indexOf("memory") !== -1) {
            const sizeMatch = parts[1].match(/size=(\d+)([KMG])?/i);
            if (sizeMatch) {
              let vram = parseInt(sizeMatch[1], 10);
              const unit = (sizeMatch[2] || "").toUpperCase();
              if (unit === "G") {
                vram *= 1024;
              } else if (unit === "K") {
                vram = Math.round(vram / 1024);
              } else if (unit === "") {
                vram = Math.round(vram / 1024 / 1024);
              }
              if (currentController.vram === null || vram > currentController.vram) {
                currentController.vram = vram;
              }
            }
          }
        }
      }
      i++;
    });
    if (currentController.vendor || currentController.model || currentController.bus || currentController.busAddress || currentController.vram !== null || currentController.vramDynamic) {
      controllers.push(currentController);
    }
    return controllers;
  }
  function parseLinesLinuxClinfo(controllers, lines) {
    const fieldPattern = /\[([^\]]+)\]\s+(\w+)\s+(.*)/;
    const devices = lines.reduce((devices2, line) => {
      const field = fieldPattern.exec(line.trim());
      if (field) {
        if (!devices2[field[1]]) {
          devices2[field[1]] = {};
        }
        devices2[field[1]][field[2]] = field[3];
      }
      return devices2;
    }, {});
    for (const deviceId in devices) {
      const device = devices[deviceId];
      if (device["CL_DEVICE_TYPE"] === "CL_DEVICE_TYPE_GPU") {
        let busAddress;
        if (device["CL_DEVICE_TOPOLOGY_AMD"]) {
          const bdf = device["CL_DEVICE_TOPOLOGY_AMD"].match(/[a-zA-Z0-9]+:\d+\.\d+/);
          if (bdf) {
            busAddress = bdf[0];
          }
        } else if (device["CL_DEVICE_PCI_BUS_ID_NV"] && device["CL_DEVICE_PCI_SLOT_ID_NV"]) {
          const bus = parseInt(device["CL_DEVICE_PCI_BUS_ID_NV"]);
          const slot = parseInt(device["CL_DEVICE_PCI_SLOT_ID_NV"]);
          if (!isNaN(bus) && !isNaN(slot)) {
            const b = bus & 255;
            const d = slot >> 3 & 255;
            const f = slot & 7;
            busAddress = `${b.toString().padStart(2, "0")}:${d.toString().padStart(2, "0")}.${f}`;
          }
        }
        if (busAddress) {
          let controller = controllers.find((controller2) => controller2.busAddress === busAddress);
          if (!controller) {
            controller = {
              vendor: "",
              model: "",
              bus: "",
              busAddress,
              vram: null,
              vramDynamic: false
            };
            controllers.push(controller);
          }
          controller.vendor = device["CL_DEVICE_VENDOR"];
          if (device["CL_DEVICE_BOARD_NAME_AMD"]) {
            controller.model = device["CL_DEVICE_BOARD_NAME_AMD"];
          } else {
            controller.model = device["CL_DEVICE_NAME"];
          }
          const memory2 = parseInt(device["CL_DEVICE_GLOBAL_MEM_SIZE"]);
          if (!isNaN(memory2)) {
            controller.vram = Math.round(memory2 / 1024 / 1024);
          }
        }
      }
    }
    return controllers;
  }
  function getNvidiaSmi() {
    if (_nvidiaSmiPath) {
      return _nvidiaSmiPath;
    }
    if (_windows$b) {
      try {
        const systemSmiPath = path$2.join(util$c.WINDIR, "System32", "nvidia-smi.exe");
        if (fs$4.existsSync(systemSmiPath)) {
          _nvidiaSmiPath = systemSmiPath;
        } else {
          const basePath = path$2.join(util$c.WINDIR, "System32", "DriverStore", "FileRepository");
          const candidates = fs$4.readdirSync(basePath, { withFileTypes: true }).filter((dir) => dir.isDirectory()).map((dir) => {
            const nvidiaSmiPath = path$2.join(basePath, dir.name, "nvidia-smi.exe");
            try {
              const stats = fs$4.statSync(nvidiaSmiPath);
              return { path: nvidiaSmiPath, ctime: stats.ctimeMs };
            } catch {
              return null;
            }
          }).filter(Boolean);
          if (candidates.length > 0) {
            _nvidiaSmiPath = candidates.reduce((prev, curr) => curr.ctime > prev.ctime ? curr : prev).path;
          }
        }
      } catch {
        util$c.noop();
      }
    } else if (_linux$a) {
      _nvidiaSmiPath = "nvidia-smi";
    }
    return _nvidiaSmiPath;
  }
  function nvidiaSmi(options2) {
    const nvidiaSmiExe = getNvidiaSmi();
    options2 = Object.assign({}, options2 || util$c.execOptsWin);
    if (nvidiaSmiExe) {
      const nvidiaSmiOpts = "--query-gpu=driver_version,pci.sub_device_id,name,pci.bus_id,fan.speed,memory.total,memory.used,memory.free,utilization.gpu,utilization.memory,temperature.gpu,temperature.memory,power.draw,power.limit,clocks.gr,clocks.mem --format=csv,noheader,nounits";
      options2.stdio = ["pipe", "pipe", "ignore"];
      try {
        return execFileSync$1(nvidiaSmiExe, nvidiaSmiOpts.split(" "), options2).toString();
      } catch {
        util$c.noop();
      }
    }
    return "";
  }
  function nvidiaDevices() {
    function safeParseNumber(value) {
      if ([null, void 0].includes(value)) {
        return value;
      }
      return parseFloat(value);
    }
    const stdout = nvidiaSmi();
    if (!stdout) {
      return [];
    }
    const gpus = stdout.split("\n").filter(Boolean);
    let results = gpus.map((gpu) => {
      const splittedData = gpu.split(", ").map((value) => value.includes("N/A") ? void 0 : value);
      if (splittedData.length === 16) {
        return {
          driverVersion: splittedData[0],
          subDeviceId: splittedData[1],
          name: splittedData[2],
          pciBus: splittedData[3],
          fanSpeed: safeParseNumber(splittedData[4]),
          memoryTotal: safeParseNumber(splittedData[5]),
          memoryUsed: safeParseNumber(splittedData[6]),
          memoryFree: safeParseNumber(splittedData[7]),
          utilizationGpu: safeParseNumber(splittedData[8]),
          utilizationMemory: safeParseNumber(splittedData[9]),
          temperatureGpu: safeParseNumber(splittedData[10]),
          temperatureMemory: safeParseNumber(splittedData[11]),
          powerDraw: safeParseNumber(splittedData[12]),
          powerLimit: safeParseNumber(splittedData[13]),
          clockCore: safeParseNumber(splittedData[14]),
          clockMemory: safeParseNumber(splittedData[15])
        };
      } else {
        return {};
      }
    });
    results = results.filter((item) => {
      return "pciBus" in item;
    });
    return results;
  }
  function mergeControllerNvidia(controller, nvidia) {
    if (nvidia.driverVersion) {
      controller.driverVersion = nvidia.driverVersion;
    }
    if (nvidia.subDeviceId) {
      controller.subDeviceId = nvidia.subDeviceId;
    }
    if (nvidia.name) {
      controller.name = nvidia.name;
    }
    if (nvidia.pciBus) {
      controller.pciBus = nvidia.pciBus;
    }
    if (nvidia.fanSpeed) {
      controller.fanSpeed = nvidia.fanSpeed;
    }
    if (nvidia.memoryTotal) {
      controller.memoryTotal = nvidia.memoryTotal;
      controller.vram = nvidia.memoryTotal;
      controller.vramDynamic = false;
    }
    if (nvidia.memoryUsed) {
      controller.memoryUsed = nvidia.memoryUsed;
    }
    if (nvidia.memoryFree) {
      controller.memoryFree = nvidia.memoryFree;
    }
    if (nvidia.utilizationGpu) {
      controller.utilizationGpu = nvidia.utilizationGpu;
    }
    if (nvidia.utilizationMemory) {
      controller.utilizationMemory = nvidia.utilizationMemory;
    }
    if (nvidia.temperatureGpu) {
      controller.temperatureGpu = nvidia.temperatureGpu;
    }
    if (nvidia.temperatureMemory) {
      controller.temperatureMemory = nvidia.temperatureMemory;
    }
    if (nvidia.powerDraw) {
      controller.powerDraw = nvidia.powerDraw;
    }
    if (nvidia.powerLimit) {
      controller.powerLimit = nvidia.powerLimit;
    }
    if (nvidia.clockCore) {
      controller.clockCore = nvidia.clockCore;
    }
    if (nvidia.clockMemory) {
      controller.clockMemory = nvidia.clockMemory;
    }
    return controller;
  }
  function parseLinesLinuxEdid(edid) {
    const result = {
      vendor: "",
      model: "",
      deviceName: "",
      main: false,
      builtin: false,
      connection: "",
      sizeX: null,
      sizeY: null,
      pixelDepth: null,
      resolutionX: null,
      resolutionY: null,
      currentResX: null,
      currentResY: null,
      positionX: 0,
      positionY: 0,
      currentRefreshRate: null
    };
    let start = 108;
    if (edid.substr(start, 6) === "000000") {
      start += 36;
    }
    if (edid.substr(start, 6) === "000000") {
      start += 36;
    }
    if (edid.substr(start, 6) === "000000") {
      start += 36;
    }
    if (edid.substr(start, 6) === "000000") {
      start += 36;
    }
    result.resolutionX = parseInt("0x0" + edid.substr(start + 8, 1) + edid.substr(start + 4, 2));
    result.resolutionY = parseInt("0x0" + edid.substr(start + 14, 1) + edid.substr(start + 10, 2));
    result.sizeX = parseInt("0x0" + edid.substr(start + 28, 1) + edid.substr(start + 24, 2));
    result.sizeY = parseInt("0x0" + edid.substr(start + 29, 1) + edid.substr(start + 26, 2));
    start = edid.indexOf("000000fc00");
    if (start >= 0) {
      let model_raw = edid.substr(start + 10, 26);
      if (model_raw.indexOf("0a") !== -1) {
        model_raw = model_raw.substr(0, model_raw.indexOf("0a"));
      }
      try {
        if (model_raw.length > 2) {
          result.model = model_raw.match(/.{1,2}/g).map((v) => String.fromCharCode(parseInt(v, 16))).join("");
        }
      } catch {
        util$c.noop();
      }
    } else {
      result.model = "";
    }
    return result;
  }
  function parseLinesLinuxDisplays(lines, depth) {
    const displays = [];
    let currentDisplay = {
      vendor: "",
      model: "",
      deviceName: "",
      main: false,
      builtin: false,
      connection: "",
      sizeX: null,
      sizeY: null,
      pixelDepth: null,
      resolutionX: null,
      resolutionY: null,
      currentResX: null,
      currentResY: null,
      positionX: 0,
      positionY: 0,
      currentRefreshRate: null
    };
    let is_edid = false;
    let is_current = false;
    let edid_raw = "";
    let start = 0;
    const applyEdid = () => {
      const edid_decoded = parseLinesLinuxEdid(edid_raw);
      currentDisplay.vendor = edid_decoded.vendor;
      currentDisplay.model = edid_decoded.model;
      currentDisplay.resolutionX = edid_decoded.resolutionX;
      currentDisplay.resolutionY = edid_decoded.resolutionY;
      currentDisplay.sizeX = edid_decoded.sizeX;
      currentDisplay.sizeY = edid_decoded.sizeY;
      currentDisplay.pixelDepth = depth;
      is_edid = false;
    };
    for (let i = 1; i < lines.length; i++) {
      if ("" !== lines[i].trim()) {
        if (" " !== lines[i][0] && "	" !== lines[i][0] && lines[i].toLowerCase().indexOf(" connected ") !== -1) {
          if (is_edid && edid_raw) {
            applyEdid();
          }
          if (currentDisplay.model || currentDisplay.main || currentDisplay.builtin || currentDisplay.connection || currentDisplay.sizeX !== null || currentDisplay.pixelDepth !== null || currentDisplay.resolutionX !== null) {
            displays.push(currentDisplay);
            currentDisplay = {
              vendor: "",
              model: "",
              main: false,
              builtin: false,
              connection: "",
              sizeX: null,
              sizeY: null,
              pixelDepth: null,
              resolutionX: null,
              resolutionY: null,
              currentResX: null,
              currentResY: null,
              positionX: 0,
              positionY: 0,
              currentRefreshRate: null
            };
          }
          const parts = lines[i].split(" ");
          currentDisplay.connection = parts[0];
          currentDisplay.main = lines[i].toLowerCase().indexOf(" primary ") >= 0;
          currentDisplay.builtin = parts[0].toLowerCase().indexOf("edp") >= 0;
          const geometry = lines[i].match(/\d+x\d+\+(-?\d+)\+(-?\d+)/);
          if (geometry) {
            currentDisplay.positionX = util$c.toInt(geometry[1]);
            currentDisplay.positionY = util$c.toInt(geometry[2]);
          }
        }
        if (is_edid) {
          if (lines[i].search(/\S|$/) > start) {
            edid_raw += lines[i].toLowerCase().trim();
          } else {
            applyEdid();
          }
        }
        if (lines[i].toLowerCase().indexOf("edid:") >= 0) {
          is_edid = true;
          edid_raw = "";
          start = lines[i].search(/\S|$/);
        }
        if (lines[i].toLowerCase().indexOf("*current") >= 0) {
          const parts1 = lines[i].split("(");
          if (parts1 && parts1.length > 1 && parts1[0].indexOf("x") >= 0) {
            const resParts = parts1[0].trim().split("x");
            currentDisplay.currentResX = util$c.toInt(resParts[0]);
            currentDisplay.currentResY = util$c.toInt(resParts[1]);
          }
          is_current = true;
        }
        if (is_current && lines[i].toLowerCase().indexOf("clock") >= 0 && lines[i].toLowerCase().indexOf("hz") >= 0 && lines[i].toLowerCase().indexOf("v: height") >= 0) {
          const parts1 = lines[i].split("clock");
          if (parts1 && parts1.length > 1 && parts1[1].toLowerCase().indexOf("hz") >= 0) {
            currentDisplay.currentRefreshRate = util$c.toInt(parts1[1]);
          }
          is_current = false;
        }
      }
    }
    if (is_edid && edid_raw) {
      applyEdid();
    }
    if (currentDisplay.model || currentDisplay.main || currentDisplay.builtin || currentDisplay.connection || currentDisplay.sizeX !== null || currentDisplay.pixelDepth !== null || currentDisplay.resolutionX !== null) {
      displays.push(currentDisplay);
    }
    return displays;
  }
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        controllers: [],
        displays: []
      };
      if (_darwin$a) {
        const cmd = "system_profiler -xml -detailLevel full SPDisplaysDataType";
        exec$a(cmd, (error, stdout) => {
          if (!error) {
            try {
              const output = stdout.toString();
              result = parseLinesDarwin(util$c.plistParser(output)[0]._items);
            } catch (e) {
              util$c.noop();
            }
            try {
              const macosTemp = require("macos-temperature-sensor");
              const temps = macosTemp.temperature();
              if (temps && temps.gpu) {
                result.controllers.forEach((controller) => {
                  if (controller.bus === "Built-In") {
                    controller.temperatureGpu = Math.round(temps.gpu * 100) / 100;
                  }
                });
              }
            } catch {
              util$c.noop();
            }
            try {
              stdout = execSync$6(
                'defaults read /Library/Preferences/com.apple.windowserver.plist 2>/dev/null;defaults read /Library/Preferences/com.apple.windowserver.displays.plist 2>/dev/null; echo ""',
                { maxBuffer: 1024 * 102400 }
              );
              const output = (stdout || "").toString();
              const obj = util$c.plistReader(output);
              if (obj["DisplayAnyUserSets"] && obj["DisplayAnyUserSets"]["Configs"] && obj["DisplayAnyUserSets"]["Configs"][0] && obj["DisplayAnyUserSets"]["Configs"][0]["DisplayConfig"]) {
                const current = obj["DisplayAnyUserSets"]["Configs"][0]["DisplayConfig"];
                let i = 0;
                current.forEach((o) => {
                  if (o["CurrentInfo"] && o["CurrentInfo"]["OriginX"] !== void 0 && result.displays && result.displays[i]) {
                    result.displays[i].positionX = o["CurrentInfo"]["OriginX"];
                  }
                  if (o["CurrentInfo"] && o["CurrentInfo"]["OriginY"] !== void 0 && result.displays && result.displays[i]) {
                    result.displays[i].positionY = o["CurrentInfo"]["OriginY"];
                  }
                  i++;
                });
              }
              if (obj["DisplayAnyUserSets"] && obj["DisplayAnyUserSets"].length > 0 && obj["DisplayAnyUserSets"][0].length > 0 && obj["DisplayAnyUserSets"][0][0]["DisplayID"]) {
                const current = obj["DisplayAnyUserSets"][0];
                let i = 0;
                current.forEach((o) => {
                  if ("OriginX" in o && result.displays && result.displays[i]) {
                    result.displays[i].positionX = o["OriginX"];
                  }
                  if ("OriginY" in o && result.displays && result.displays[i]) {
                    result.displays[i].positionY = o["OriginY"];
                  }
                  if (o["Mode"] && o["Mode"]["BitsPerPixel"] !== void 0 && result.displays && result.displays[i]) {
                    result.displays[i].pixelDepth = o["Mode"]["BitsPerPixel"];
                  }
                  i++;
                });
              }
            } catch {
              util$c.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_linux$a) {
        if (util$c.isRaspberry()) {
          const cmd2 = `fbset -s 2> /dev/null | grep 'mode "' ; vcgencmd get_mem gpu 2> /dev/null; tvservice -s 2> /dev/null; tvservice -n 2> /dev/null;`;
          exec$a(cmd2, (error, stdout) => {
            const lines = stdout.toString().split("\n");
            if (lines.length > 3 && lines[0].indexOf('mode "') >= 0 && lines[2].indexOf("0x12000a") > -1) {
              const parts = lines[0].replace("mode", "").replace(/"/g, "").trim().split("x");
              if (parts.length === 2) {
                result.displays.push({
                  vendor: "",
                  model: util$c.getValue(lines, "device_name", "="),
                  main: true,
                  builtin: false,
                  connection: "HDMI",
                  sizeX: null,
                  sizeY: null,
                  pixelDepth: null,
                  resolutionX: parseInt(parts[0], 10),
                  resolutionY: parseInt(parts[1], 10),
                  currentResX: null,
                  currentResY: null,
                  positionX: 0,
                  positionY: 0,
                  currentRefreshRate: null
                });
              }
            }
            if (lines.length >= 1 && stdout.toString().indexOf("gpu=") >= 0) {
              result.controllers.push({
                vendor: "Broadcom",
                model: util$c.getRpiGpu(),
                bus: "",
                vram: parseInt(util$c.getValue(lines, "gpu", "=").replace("M", ""), 10) || null,
                vramDynamic: true
              });
            }
          });
        }
        const cmd = "lspci -vvv  2>/dev/null";
        exec$a(cmd, (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().split("\n");
            if (result.controllers.length === 0) {
              result.controllers = parseLinesLinuxControllers(lines);
              const nvidiaData = nvidiaDevices();
              result.controllers = result.controllers.map((controller) => {
                return mergeControllerNvidia(controller, nvidiaData.find((contr) => contr.pciBus && controller.busAddress && contr.pciBus.toLowerCase().endsWith(controller.busAddress.toLowerCase())) || {});
              });
            }
          }
          const cmd2 = "clinfo --raw";
          exec$a(cmd2, (error2, stdout2) => {
            if (!error2) {
              const lines = stdout2.toString().split("\n");
              result.controllers = parseLinesLinuxClinfo(result.controllers, lines);
            }
            const cmd3 = "xdpyinfo 2>/dev/null | grep 'depth of root window' | awk '{ print $5 }'";
            exec$a(cmd3, (error3, stdout3) => {
              let depth = 0;
              if (!error3) {
                const lines = stdout3.toString().split("\n");
                depth = parseInt(lines[0]) || 0;
              }
              const cmd4 = "xrandr --verbose 2>/dev/null";
              exec$a(cmd4, (error4, stdout4) => {
                if (!error4) {
                  const lines = stdout4.toString().split("\n");
                  result.displays = parseLinesLinuxDisplays(lines, depth);
                }
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
            });
          });
        });
      }
      if (_freebsd$9 || _openbsd$9 || _netbsd$9) {
        if (callback) {
          callback(null);
        }
        resolve(null);
      }
      if (_sunos$9) {
        if (callback) {
          callback(null);
        }
        resolve(null);
      }
      if (_windows$b) {
        try {
          const workload = [];
          workload.push(util$c.powerShell("Get-CimInstance win32_VideoController | fl *"));
          workload.push(
            util$c.powerShell(
              'gp "HKLM:\\SYSTEM\\ControlSet001\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\*" -ErrorAction SilentlyContinue | where MatchingDeviceId $null -NE | select MatchingDeviceId,HardwareInformation.qwMemorySize | fl'
            )
          );
          workload.push(util$c.powerShell("Get-CimInstance win32_desktopmonitor | fl *"));
          workload.push(util$c.powerShell("Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorBasicDisplayParams | fl"));
          workload.push(util$c.powerShell("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens"));
          workload.push(util$c.powerShell("Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorConnectionParams | fl"));
          workload.push(
            util$c.powerShell(
              'gwmi WmiMonitorID -Namespace root\\wmi | ForEach-Object {(($_.ManufacturerName -notmatch 0 | foreach {[char]$_}) -join "") + "|" + (($_.ProductCodeID -notmatch 0 | foreach {[char]$_}) -join "") + "|" + (($_.UserFriendlyName -notmatch 0 | foreach {[char]$_}) -join "") + "|" + (($_.SerialNumberID -notmatch 0 | foreach {[char]$_}) -join "") + "|" + $_.YearOfManufacture + "|" + $_.InstanceName}'
            )
          );
          workload.push(util$c.powerShell(psCurrentModes));
          const nvidiaData = nvidiaDevices();
          Promise.all(workload).then((data) => {
            const csections = data[0].replace(/\r/g, "").split(/\n\s*\n/);
            const vsections = data[1].replace(/\r/g, "").split(/\n\s*\n/);
            result.controllers = parseLinesWindowsControllers(csections, vsections);
            result.controllers = result.controllers.map((controller) => {
              if (controller.vendor.toLowerCase() === "nvidia") {
                return mergeControllerNvidia(
                  controller,
                  nvidiaData.find((device) => {
                    let windowsSubDeviceId = (controller.subDeviceId || "").toLowerCase();
                    const nvidiaSubDeviceIdParts = (device.subDeviceId || "").split("x");
                    let nvidiaSubDeviceId = nvidiaSubDeviceIdParts.length > 1 ? nvidiaSubDeviceIdParts[1].toLowerCase() : nvidiaSubDeviceIdParts[0].toLowerCase();
                    const lengthDifference = Math.abs(windowsSubDeviceId.length - nvidiaSubDeviceId.length);
                    if (windowsSubDeviceId.length > nvidiaSubDeviceId.length) {
                      for (let i = 0; i < lengthDifference; i++) {
                        nvidiaSubDeviceId = "0" + nvidiaSubDeviceId;
                      }
                    } else if (windowsSubDeviceId.length < nvidiaSubDeviceId.length) {
                      for (let i = 0; i < lengthDifference; i++) {
                        windowsSubDeviceId = "0" + windowsSubDeviceId;
                      }
                    }
                    return windowsSubDeviceId === nvidiaSubDeviceId;
                  }) || {}
                );
              } else {
                return controller;
              }
            });
            const dsections = data[2].replace(/\r/g, "").split(/\n\s*\n/);
            if (dsections[0].trim() === "") {
              dsections.shift();
            }
            if (dsections.length && dsections[dsections.length - 1].trim() === "") {
              dsections.pop();
            }
            const monitors = [];
            data[3].replace(/\r/g, "").split(/\n\s*\n/).forEach((section) => {
              const lines = section.split("\n");
              const monitorInstanceName = util$c.getValue(lines, "InstanceName").toLowerCase();
              const monitorActive = util$c.getValue(lines, "Active").toLowerCase() !== "false";
              if (monitorInstanceName && monitorActive) {
                monitors.push({
                  instanceName: monitorInstanceName,
                  sizeX: util$c.getValue(lines, "MaxHorizontalImageSize"),
                  sizeY: util$c.getValue(lines, "MaxVerticalImageSize")
                });
              }
            });
            const ssections = data[4].replace(/\r/g, "").split("BitsPerPixel ");
            ssections.shift();
            const connections = /* @__PURE__ */ Object.create(null);
            data[5].replace(/\r/g, "").split(/\n\s*\n/).forEach((section) => {
              const lines = section.split("\n");
              const connectionInstanceName = util$c.getValue(lines, "InstanceName").toLowerCase();
              if (connectionInstanceName) {
                connections[connectionInstanceName] = util$c.getValue(lines, "VideoOutputTechnology");
              }
            });
            const res = data[6].replace(/\r/g, "").split(/\n/);
            const isections = [];
            res.forEach((element) => {
              const parts = element.split("|");
              if (parts.length === 6) {
                isections.push({
                  vendor: parts[0],
                  code: parts[1],
                  model: parts[2],
                  serial: parts[3],
                  productionYear: util$c.toInt(parts[4]) || null,
                  instanceId: parts[5]
                });
              }
            });
            const currentModes = /* @__PURE__ */ Object.create(null);
            (data[7] || "").replace(/\r/g, "").split(/\n/).forEach((element) => {
              const parts = element.split("|");
              const frequency = parts.length === 5 ? util$c.toInt(parts[1]) : 0;
              if (frequency > 1 && parts[0]) {
                currentModes[parts[0].trim().toLowerCase()] = frequency;
              }
            });
            result.displays = parseLinesWindowsDisplaysPowershell(ssections, monitors, dsections, connections, isections, currentModes);
            if (result.displays.length === 1) {
              if (_resolutionX) {
                result.displays[0].resolutionX = _resolutionX;
                if (!result.displays[0].currentResX) {
                  result.displays[0].currentResX = _resolutionX;
                }
              }
              if (_resolutionY) {
                result.displays[0].resolutionY = _resolutionY;
                if (result.displays[0].currentResY === 0) {
                  result.displays[0].currentResY = _resolutionY;
                }
              }
              if (_pixelDepth) {
                result.displays[0].pixelDepth = _pixelDepth;
              }
            }
            result.displays = result.displays.map((element) => {
              if (_refreshRate && !element.currentRefreshRate) {
                element.currentRefreshRate = _refreshRate;
              }
              return element;
            });
            if (callback) {
              callback(result);
            }
            resolve(result);
          }).catch(() => {
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch (e) {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
  function parseLinesWindowsControllers(sections, vections) {
    const memorySizes = {};
    for (const i in vections) {
      if ({}.hasOwnProperty.call(vections, i)) {
        if (vections[i].trim() !== "") {
          const lines = vections[i].trim().split("\n");
          const matchingDeviceId = util$c.getValue(lines, "MatchingDeviceId").match(/PCI\\(VEN_[0-9A-F]{4})&(DEV_[0-9A-F]{4})(?:&(SUBSYS_[0-9A-F]{8}))?(?:&(REV_[0-9A-F]{2}))?/i);
          if (matchingDeviceId) {
            const quadWordmemorySize = parseInt(util$c.getValue(lines, "HardwareInformation.qwMemorySize"));
            if (!isNaN(quadWordmemorySize)) {
              let deviceId = matchingDeviceId[1].toUpperCase() + "&" + matchingDeviceId[2].toUpperCase();
              if (matchingDeviceId[3]) {
                deviceId += "&" + matchingDeviceId[3].toUpperCase();
              }
              if (matchingDeviceId[4]) {
                deviceId += "&" + matchingDeviceId[4].toUpperCase();
              }
              memorySizes[deviceId] = quadWordmemorySize;
            }
          }
        }
      }
    }
    const controllers = [];
    for (const i in sections) {
      if ({}.hasOwnProperty.call(sections, i)) {
        if (sections[i].trim() !== "") {
          const lines = sections[i].trim().split("\n");
          const pnpDeviceId = util$c.getValue(lines, "PNPDeviceID", ":").match(/PCI\\(VEN_[0-9A-F]{4})&(DEV_[0-9A-F]{4})(?:&(SUBSYS_[0-9A-F]{8}))?(?:&(REV_[0-9A-F]{2}))?/i);
          let subDeviceId = null;
          let memorySize = null;
          if (pnpDeviceId) {
            subDeviceId = pnpDeviceId[3] || "";
            if (subDeviceId) {
              subDeviceId = subDeviceId.split("_")[1];
            }
            if (memorySize == null && pnpDeviceId[3] && pnpDeviceId[4]) {
              const deviceId = pnpDeviceId[1].toUpperCase() + "&" + pnpDeviceId[2].toUpperCase() + "&" + pnpDeviceId[3].toUpperCase() + "&" + pnpDeviceId[4].toUpperCase();
              if ({}.hasOwnProperty.call(memorySizes, deviceId)) {
                memorySize = memorySizes[deviceId];
              }
            }
            if (memorySize == null && pnpDeviceId[3]) {
              const deviceId = pnpDeviceId[1].toUpperCase() + "&" + pnpDeviceId[2].toUpperCase() + "&" + pnpDeviceId[3].toUpperCase();
              if ({}.hasOwnProperty.call(memorySizes, deviceId)) {
                memorySize = memorySizes[deviceId];
              }
            }
            if (memorySize == null && pnpDeviceId[4]) {
              const deviceId = pnpDeviceId[1].toUpperCase() + "&" + pnpDeviceId[2].toUpperCase() + "&" + pnpDeviceId[4].toUpperCase();
              if ({}.hasOwnProperty.call(memorySizes, deviceId)) {
                memorySize = memorySizes[deviceId];
              }
            }
            if (memorySize == null) {
              const deviceId = pnpDeviceId[1].toUpperCase() + "&" + pnpDeviceId[2].toUpperCase();
              if ({}.hasOwnProperty.call(memorySizes, deviceId)) {
                memorySize = memorySizes[deviceId];
              }
            }
          }
          controllers.push({
            vendor: util$c.getValue(lines, "AdapterCompatibility", ":"),
            model: util$c.getValue(lines, "name", ":"),
            bus: util$c.getValue(lines, "PNPDeviceID", ":").startsWith("PCI") ? "PCI" : "",
            vram: (memorySize == null ? util$c.toInt(util$c.getValue(lines, "AdapterRAM", ":")) : memorySize) / 1024 / 1024,
            vramDynamic: util$c.getValue(lines, "VideoMemoryType", ":") === "2",
            subDeviceId
          });
          _resolutionX = util$c.toInt(util$c.getValue(lines, "CurrentHorizontalResolution", ":")) || _resolutionX;
          _resolutionY = util$c.toInt(util$c.getValue(lines, "CurrentVerticalResolution", ":")) || _resolutionY;
          _refreshRate = util$c.toInt(util$c.getValue(lines, "CurrentRefreshRate", ":")) || _refreshRate;
          _pixelDepth = util$c.toInt(util$c.getValue(lines, "CurrentBitsPerPixel", ":")) || _pixelDepth;
        }
      }
    }
    return controllers;
  }
  function parseLinesWindowsDisplaysPowershell(ssections, monitors, dsections, connections, isections, currentModes) {
    const displays = [];
    let vendor = "";
    let model = "";
    let deviceID = "";
    let resolutionX = 0;
    let resolutionY = 0;
    if (dsections && dsections.length) {
      const linesDisplay = dsections[0].split("\n");
      vendor = util$c.getValue(linesDisplay, "MonitorManufacturer", ":");
      model = util$c.getValue(linesDisplay, "Name", ":");
      deviceID = util$c.getValue(linesDisplay, "PNPDeviceID", ":").replace(/&amp;/g, "&").toLowerCase();
      resolutionX = util$c.toInt(util$c.getValue(linesDisplay, "ScreenWidth", ":"));
      resolutionY = util$c.toInt(util$c.getValue(linesDisplay, "ScreenHeight", ":"));
    }
    const count = Math.max(ssections.length, monitors.length);
    for (let i = 0; i < count; i++) {
      const hasOwnScreen = i < ssections.length;
      const ssection = hasOwnScreen ? ssections[i] : ssections[0];
      if (ssection !== void 0 && ssection.trim() !== "") {
        const linesScreen = ("BitsPerPixel " + ssection).split("\n");
        const monitor = monitors[i];
        const instanceName = monitor ? monitor.instanceName : "";
        const bitsPerPixel = util$c.toInt(util$c.getValue(linesScreen, "BitsPerPixel")) || null;
        const bounds = util$c.getValue(linesScreen, "Bounds").replace("{", "").replace("}", "").replace(/=/g, ":").split(",");
        const primary = util$c.getValue(linesScreen, "Primary");
        const sizeX = monitor ? monitor.sizeX : "";
        const sizeY = monitor ? monitor.sizeY : "";
        const videoOutputTechnology = instanceName && connections[instanceName] !== void 0 ? connections[instanceName] : "";
        const deviceName = util$c.getValue(linesScreen, "DeviceName");
        const isection = instanceName ? isections.find((element) => element.instanceId.toLowerCase().startsWith(instanceName)) : void 0;
        displays.push({
          vendor: isection && isection.vendor || (instanceName.startsWith(deviceID) ? vendor : ""),
          model: isection && isection.model || (instanceName.startsWith(deviceID) ? model : ""),
          serial: isection && isection.serial || null,
          productionYear: isection ? isection.productionYear : null,
          displayId: instanceName || null,
          deviceName,
          main: hasOwnScreen ? primary.toLowerCase() === "true" : false,
          builtin: videoOutputTechnology === "2147483648",
          connection: videoOutputTechnology && videoTypes[videoOutputTechnology] ? videoTypes[videoOutputTechnology] : "",
          resolutionX: util$c.toInt(util$c.getValue(bounds, "Width", ":")),
          resolutionY: util$c.toInt(util$c.getValue(bounds, "Height", ":")),
          sizeX: sizeX ? parseInt(sizeX, 10) : null,
          sizeY: sizeY ? parseInt(sizeY, 10) : null,
          pixelDepth: bitsPerPixel,
          currentResX: util$c.toInt(util$c.getValue(bounds, "Width", ":")),
          currentResY: util$c.toInt(util$c.getValue(bounds, "Height", ":")),
          positionX: util$c.toInt(util$c.getValue(bounds, "X", ":")),
          positionY: util$c.toInt(util$c.getValue(bounds, "Y", ":")),
          currentRefreshRate: currentModes[deviceName.toLowerCase()] || null
        });
      }
    }
    if (ssections.length === 0) {
      displays.push({
        vendor,
        model,
        serial: null,
        productionYear: null,
        displayId: null,
        main: true,
        sizeX: null,
        sizeY: null,
        resolutionX,
        resolutionY,
        pixelDepth: null,
        currentResX: resolutionX,
        currentResY: resolutionY,
        positionX: 0,
        positionY: 0
      });
    }
    return displays;
  }
}
graphics$1.graphics = graphics;
var filesystem = {};
const util$b = util$i;
const fs$3 = require$$1$1;
const exec$9 = require$$1$4.exec;
const execSync$5 = require$$1$4.execSync;
const execPromiseSave = util$b.promisifySave(require$$1$4.exec);
const _platform$a = process.platform;
const _linux$9 = _platform$a === "linux" || _platform$a === "android";
const _darwin$9 = _platform$a === "darwin";
const _windows$a = _platform$a === "win32";
const _freebsd$8 = _platform$a === "freebsd";
const _openbsd$8 = _platform$a === "openbsd";
const _netbsd$8 = _platform$a === "netbsd";
const _sunos$8 = _platform$a === "sunos";
const _fs_speed = {};
const _disk_io = {};
function fsSize(drive, callback) {
  if (util$b.isFunction(drive)) {
    callback = drive;
    drive = "";
  }
  let macOsDisks = [];
  let osMounts = [];
  function getmacOsFsType(fs2) {
    if (!fs2.startsWith("/")) {
      return "NFS";
    }
    const parts = fs2.split("/");
    const fsShort = parts[parts.length - 1];
    const macOsDisksSingle = macOsDisks.filter((item) => item.indexOf(fsShort) >= 0);
    if (macOsDisksSingle.length === 1 && macOsDisksSingle[0].indexOf("APFS") >= 0) {
      return "APFS";
    }
    return "HFS";
  }
  function isLinuxTmpFs(fs2) {
    const linuxTmpFileSystems = ["rootfs", "unionfs", "squashfs", "cramfs", "initrd", "initramfs", "devtmpfs", "tmpfs", "udev", "devfs", "specfs", "type", "appimaged"];
    let result = false;
    linuxTmpFileSystems.forEach((linuxFs) => {
      if (fs2.toLowerCase().indexOf(linuxFs) >= 0) {
        result = true;
      }
    });
    return result;
  }
  function filterLines(stdout) {
    const lines = stdout.toString().split("\n");
    lines.shift();
    if (stdout.toString().toLowerCase().indexOf("filesystem") >= 0) {
      let removeLines = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] && lines[i].toLowerCase().startsWith("filesystem")) {
          removeLines = i;
        }
      }
      for (let i = 0; i < removeLines; i++) {
        lines.shift();
      }
    }
    return lines;
  }
  function parseDf(lines) {
    const data = [];
    const dfWithType = /^(.+?)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(?:\d+%|-)\s+(.+)$/;
    const dfNoType = /^(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(?:\d+%|-)\s+(.+)$/;
    const hasType = _linux$9 || _freebsd$8 || _openbsd$8 || _netbsd$8;
    lines.forEach((line) => {
      if (line !== "") {
        const parts = line.trim().match(hasType ? dfWithType : dfNoType);
        if (parts && (parts[1].startsWith("/") || parts[hasType ? 6 : 5] === "/" || parts[1].indexOf("/") > 0 || parts[1].indexOf(":") === 1 || !_darwin$9 && !isLinuxTmpFs(parts[2]))) {
          const fs2 = parts[1];
          const fsType = hasType ? parts[2] : getmacOsFsType(parts[1]);
          const size = parseInt(parts[hasType ? 3 : 2], 10) * 1024;
          const used = parseInt(parts[hasType ? 4 : 3], 10) * 1024;
          const available = parseInt(parts[hasType ? 5 : 4], 10) * 1024;
          const use = parseFloat((100 * (used / (used + available))).toFixed(2));
          const rw = osMounts && Object.keys(osMounts).length > 0 ? osMounts[fs2] || false : null;
          const mount = parts[hasType ? 6 : 5];
          if (!data.find((el) => el.fs === fs2 && el.type === fsType && el.mount === mount)) {
            data.push({
              fs: fs2,
              type: fsType,
              size,
              used,
              available,
              use,
              mount,
              rw
            });
          }
        }
      }
    });
    return data;
  }
  return new Promise((resolve) => {
    process.nextTick(() => {
      let data = [];
      if (_linux$9 || _freebsd$8 || _openbsd$8 || _netbsd$8 || _darwin$9) {
        let cmd = "";
        macOsDisks = [];
        osMounts = {};
        if (_darwin$9) {
          cmd = "df -kP";
          try {
            macOsDisks = execSync$5("diskutil list").toString().split("\n").filter((line) => {
              return !line.startsWith("/") && line.indexOf(":") > 0;
            });
            execSync$5("mount").toString().split("\n").filter((line) => {
              return line.startsWith("/");
            }).forEach((line) => {
              osMounts[line.split(" ")[0]] = line.toLowerCase().indexOf("read-only") === -1;
            });
          } catch {
            util$b.noop();
          }
        }
        if (_linux$9) {
          try {
            cmd = "export LC_ALL=C; df -kPTx squashfs; unset LC_ALL";
            execSync$5("cat /proc/mounts 2>/dev/null", util$b.execOptsLinux).toString().split("\n").filter((line) => {
              return line.startsWith("/");
            }).forEach((line) => {
              const fs2 = line.split(" ")[0].replace(/\\040/g, " ");
              osMounts[fs2] = osMounts[fs2] || false;
              if (line.toLowerCase().indexOf("/snap/") === -1) {
                osMounts[fs2] = line.toLowerCase().indexOf("rw,") >= 0 || line.toLowerCase().indexOf(" rw ") >= 0;
              }
            });
          } catch {
            util$b.noop();
          }
        }
        if (_freebsd$8 || _openbsd$8 || _netbsd$8) {
          try {
            cmd = "df -kPT";
            execSync$5("mount").toString().split("\n").forEach((line) => {
              osMounts[line.split(" ")[0]] = line.toLowerCase().indexOf("read-only") === -1;
            });
          } catch {
            util$b.noop();
          }
        }
        exec$9(cmd, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
          const lines = filterLines(stdout);
          data = parseDf(lines);
          if (drive) {
            data = data.filter((item) => {
              return item.fs.toLowerCase().indexOf(drive.toLowerCase()) >= 0 || item.mount.toLowerCase().indexOf(drive.toLowerCase()) >= 0;
            });
          }
          if ((!error || data.length) && stdout.toString().trim() !== "") {
            if (callback) {
              callback(data);
            }
            resolve(data);
          } else {
            exec$9("df -kPT 2>/dev/null", { maxBuffer: 1024 * 1024 }, (error2, stdout2) => {
              const lines2 = filterLines(stdout2);
              data = parseDf(lines2);
              if (callback) {
                callback(data);
              }
              resolve(data);
            });
          }
        });
      }
      if (_sunos$8) {
        if (callback) {
          callback(data);
        }
        resolve(data);
      }
      if (_windows$a) {
        try {
          const driveSanitized = drive ? util$b.sanitizeString(drive, true) : "";
          const cmd = `Get-WmiObject Win32_logicaldisk | select Access,Caption,FileSystem,FreeSpace,Size ${driveSanitized ? "| where -property Caption -eq " + driveSanitized : ""} | fl`;
          util$b.powerShell(cmd).then((stdout, error) => {
            if (!error) {
              const devices = stdout.toString().split(/\n\s*\n/);
              devices.forEach((device) => {
                const lines = device.split("\r\n");
                const size = util$b.toInt(util$b.getValue(lines, "size", ":"));
                const free = util$b.toInt(util$b.getValue(lines, "freespace", ":"));
                const caption = util$b.getValue(lines, "caption", ":");
                const rwValue = util$b.getValue(lines, "access", ":");
                const rw = rwValue ? util$b.toInt(rwValue) !== 1 : null;
                if (size) {
                  data.push({
                    fs: caption,
                    type: util$b.getValue(lines, "filesystem", ":"),
                    size,
                    used: size - free,
                    available: free,
                    use: parseFloat((100 * (size - free) / size).toFixed(2)),
                    mount: caption,
                    rw
                  });
                }
              });
            }
            if (callback) {
              callback(data);
            }
            resolve(data);
          });
        } catch {
          if (callback) {
            callback(data);
          }
          resolve(data);
        }
      }
    });
  });
}
filesystem.fsSize = fsSize;
function fsOpenFiles(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = {
        max: null,
        allocated: null,
        available: null
      };
      if (_freebsd$8 || _openbsd$8 || _netbsd$8 || _darwin$9) {
        const cmd = "sysctl -i kern.maxfiles kern.num_files kern.open_files";
        exec$9(cmd, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().split("\n");
            result.max = parseInt(util$b.getValue(lines, "kern.maxfiles", ":"), 10);
            result.allocated = parseInt(util$b.getValue(lines, "kern.num_files", ":"), 10) || parseInt(util$b.getValue(lines, "kern.open_files", ":"), 10);
            result.available = result.max - result.allocated;
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_linux$9) {
        fs$3.readFile("/proc/sys/fs/file-nr", (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().split("\n");
            if (lines[0]) {
              const parts = lines[0].replace(/\s+/g, " ").split(" ");
              if (parts.length === 3) {
                result.allocated = parseInt(parts[0], 10);
                result.available = parseInt(parts[1], 10);
                result.max = parseInt(parts[2], 10);
                if (!result.available) {
                  result.available = result.max - result.allocated;
                }
              }
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          } else {
            fs$3.readFile("/proc/sys/fs/file-max", (error2, stdout2) => {
              if (!error2) {
                const lines = stdout2.toString().split("\n");
                if (lines[0]) {
                  result.max = parseInt(lines[0], 10);
                }
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          }
        });
      }
      if (_sunos$8) {
        if (callback) {
          callback(null);
        }
        resolve(null);
      }
      if (_windows$a) {
        if (callback) {
          callback(null);
        }
        resolve(null);
      }
    });
  });
}
filesystem.fsOpenFiles = fsOpenFiles;
function parseBytes(s) {
  const start = s.indexOf(" (") + 2;
  const end = s.indexOf(" Bytes)");
  return parseInt(s.substr(start, end - start), 10);
}
function parseDevices(lines) {
  const devices = [];
  let i = 0;
  lines.forEach((line) => {
    if (line.length > 0) {
      if (line[0] === "*") {
        i++;
      } else {
        const parts = line.split(":");
        if (parts.length > 1) {
          if (!devices[i]) {
            devices[i] = {
              name: "",
              identifier: "",
              type: "disk",
              fsType: "",
              mount: "",
              size: 0,
              physical: "HDD",
              uuid: "",
              label: "",
              model: "",
              serial: "",
              removable: false,
              protocol: "",
              group: "",
              device: ""
            };
          }
          parts[0] = parts[0].trim().toUpperCase().replace(/ +/g, "");
          parts[1] = parts[1].trim();
          if ("DEVICEIDENTIFIER" === parts[0]) {
            devices[i].identifier = parts[1];
          }
          if ("DEVICENODE" === parts[0]) {
            devices[i].name = parts[1];
          }
          if ("VOLUMENAME" === parts[0]) {
            if (parts[1].indexOf("Not applicable") === -1) {
              devices[i].label = parts[1];
            }
          }
          if ("PROTOCOL" === parts[0]) {
            devices[i].protocol = parts[1];
          }
          if ("DISKSIZE" === parts[0]) {
            devices[i].size = parseBytes(parts[1]);
          }
          if ("FILESYSTEMPERSONALITY" === parts[0]) {
            devices[i].fsType = parts[1];
          }
          if ("MOUNTPOINT" === parts[0]) {
            devices[i].mount = parts[1];
          }
          if ("VOLUMEUUID" === parts[0]) {
            devices[i].uuid = parts[1];
          }
          if ("READ-ONLYMEDIA" === parts[0] && parts[1] === "Yes") {
            devices[i].physical = "CD/DVD";
          }
          if ("SOLIDSTATE" === parts[0] && parts[1] === "Yes") {
            devices[i].physical = "SSD";
          }
          if ("VIRTUAL" === parts[0]) {
            devices[i].type = "virtual";
          }
          if ("REMOVABLEMEDIA" === parts[0]) {
            devices[i].removable = parts[1] === "Removable";
          }
          if ("PARTITIONTYPE" === parts[0]) {
            devices[i].type = "part";
          }
          if ("DEVICE/MEDIANAME" === parts[0]) {
            devices[i].model = parts[1];
          }
        }
      }
    }
  });
  return devices;
}
function parseBlk(lines) {
  let data = [];
  lines.filter((line) => line !== "").forEach((line) => {
    try {
      line = decodeURIComponent(line.replace(/\\x/g, "%"));
      line = line.replace(/\\/g, "\\\\");
      const disk = JSON.parse(line);
      data.push({
        name: util$b.sanitizeShellString(disk.name),
        type: disk.type,
        fsType: disk.fsType,
        mount: disk.mountpoint,
        size: parseInt(disk.size, 10),
        physical: disk.type === "disk" ? disk.rota === "0" ? "SSD" : "HDD" : disk.type === "rom" ? "CD/DVD" : "",
        uuid: disk.uuid,
        label: disk.label,
        model: (disk.model || "").trim(),
        serial: disk.serial,
        removable: disk.rm === "1",
        protocol: disk.tran,
        group: disk.group || ""
      });
    } catch {
      util$b.noop();
    }
  });
  data = util$b.unique(data);
  data = util$b.sortByKey(data, ["type", "name"]);
  return data;
}
function decodeMdabmData(lines) {
  const raid = util$b.getValue(lines, "md_level", "=");
  const label = util$b.getValue(lines, "md_name", "=");
  const uuid2 = util$b.getValue(lines, "md_uuid", "=");
  const members = [];
  lines.forEach((line) => {
    if (line.toLowerCase().startsWith("md_device_dev") && line.toLowerCase().indexOf("/dev/") > 0) {
      members.push(line.split("/dev/")[1]);
    }
  });
  return {
    raid,
    label,
    uuid: uuid2,
    members
  };
}
function raidMatchLinux(data) {
  let result = data;
  try {
    data.forEach((element) => {
      if (element.type.startsWith("raid")) {
        const lines = execSync$5(`mdadm --export --detail /dev/${util$b.sanitizeString(element.name, true)}`, util$b.execOptsLinux).toString().split("\n");
        const mdData = decodeMdabmData(lines);
        element.label = mdData.label;
        element.uuid = mdData.uuid;
        if (mdData && mdData.members && mdData.members.length && mdData.raid === element.type) {
          result = result.map((blockdevice) => {
            if (blockdevice.fsType === "linux_raid_member" && mdData.members.indexOf(blockdevice.name) >= 0) {
              blockdevice.group = element.name;
            }
            return blockdevice;
          });
        }
      }
    });
  } catch {
    util$b.noop();
  }
  return result;
}
function getDevicesLinux(data) {
  const result = [];
  data.forEach((element) => {
    if (element.type.startsWith("disk")) {
      result.push(element.name);
    }
  });
  return result;
}
function matchDevicesLinux(data) {
  let result = data;
  try {
    const devices = getDevicesLinux(data);
    result = result.map((blockdevice) => {
      if (blockdevice.type.startsWith("part") || blockdevice.type.startsWith("disk")) {
        devices.forEach((element) => {
          if (blockdevice.name.startsWith(element)) {
            blockdevice.device = "/dev/" + element;
          }
        });
      }
      return blockdevice;
    });
  } catch {
    util$b.noop();
  }
  return result;
}
function getDevicesMac(data) {
  const result = [];
  data.forEach((element) => {
    if (element.type.startsWith("disk")) {
      result.push({ name: element.name, model: element.model, device: element.name });
    }
    if (element.type.startsWith("virtual")) {
      let device = "";
      result.forEach((e) => {
        if (e.model === element.model) {
          device = e.device;
        }
      });
      if (device) {
        result.push({ name: element.name, model: element.model, device });
      }
    }
  });
  return result;
}
function matchDevicesMac(data) {
  let result = data;
  try {
    const devices = getDevicesMac(data);
    result = result.map((blockdevice) => {
      if (blockdevice.type.startsWith("part") || blockdevice.type.startsWith("disk") || blockdevice.type.startsWith("virtual")) {
        devices.forEach((element) => {
          if (blockdevice.name.startsWith(element.name)) {
            blockdevice.device = element.device;
          }
        });
      }
      return blockdevice;
    });
  } catch {
    util$b.noop();
  }
  return result;
}
function getDevicesWin(diskDrives) {
  const result = [];
  diskDrives.forEach((element) => {
    const lines = element.split("\r\n");
    const device = util$b.getValue(lines, "DeviceID", ":");
    let partitions = element.split("@{DeviceID=");
    if (partitions.length > 1) {
      partitions = partitions.slice(1);
      partitions.forEach((partition) => {
        result.push({ name: partition.split(";")[0].toUpperCase(), device });
      });
    }
  });
  return result;
}
function matchDevicesWin(data, diskDrives) {
  const devices = getDevicesWin(diskDrives);
  data.map((element) => {
    const filteresDevices = devices.filter((e) => {
      return e.name === element.name.toUpperCase();
    });
    if (filteresDevices.length > 0) {
      element.device = filteresDevices[0].device;
    }
    return element;
  });
  return data;
}
function blkStdoutToObject(stdout) {
  return stdout.toString().replace(/NAME=/g, '{"name":').replace(/FSTYPE=/g, ',"fsType":').replace(/TYPE=/g, ',"type":').replace(/SIZE=/g, ',"size":').replace(/MOUNTPOINT=/g, ',"mountpoint":').replace(/UUID=/g, ',"uuid":').replace(/ROTA=/g, ',"rota":').replace(/RO=/g, ',"ro":').replace(/RM=/g, ',"rm":').replace(/TRAN=/g, ',"tran":').replace(/SERIAL=/g, ',"serial":').replace(/LABEL=/g, ',"label":').replace(/MODEL=/g, ',"model":').replace(/OWNER=/g, ',"owner":').replace(/GROUP=/g, ',"group":').replace(/\n/g, "}\n");
}
function blockDevices(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let data = [];
      if (_linux$9) {
        const procLsblk1 = exec$9("lsblk -bPo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,RM,TRAN,SERIAL,LABEL,MODEL,OWNER 2>/dev/null", { maxBuffer: 1024 * 1024 }, (error, stdout) => {
          if (!error) {
            const lines = blkStdoutToObject(stdout).split("\n");
            data = parseBlk(lines);
            data = raidMatchLinux(data);
            data = matchDevicesLinux(data);
            if (callback) {
              callback(data);
            }
            resolve(data);
          } else {
            const procLsblk2 = exec$9("lsblk -bPo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,RM,LABEL,MODEL,OWNER 2>/dev/null", { maxBuffer: 1024 * 1024 }, (error2, stdout2) => {
              if (!error2) {
                const lines = blkStdoutToObject(stdout2).split("\n");
                data = parseBlk(lines);
                data = raidMatchLinux(data);
              }
              if (callback) {
                callback(data);
              }
              resolve(data);
            });
            procLsblk2.on("error", () => {
              if (callback) {
                callback(data);
              }
              resolve(data);
            });
          }
        });
        procLsblk1.on("error", () => {
          if (callback) {
            callback(data);
          }
          resolve(data);
        });
      }
      if (_darwin$9) {
        const procDskutil = exec$9("diskutil info -all", { maxBuffer: 1024 * 1024 }, (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().split("\n");
            data = parseDevices(lines);
            data = matchDevicesMac(data);
          }
          if (callback) {
            callback(data);
          }
          resolve(data);
        });
        procDskutil.on("error", () => {
          if (callback) {
            callback(data);
          }
          resolve(data);
        });
      }
      if (_sunos$8) {
        if (callback) {
          callback(data);
        }
        resolve(data);
      }
      if (_windows$a) {
        const drivetypes = ["Unknown", "NoRoot", "Removable", "Local", "Network", "CD/DVD", "RAM"];
        try {
          const workload = [];
          workload.push(util$b.powerShell("Get-CimInstance -ClassName Win32_LogicalDisk | select Caption,DriveType,Name,FileSystem,Size,VolumeSerialNumber,VolumeName | fl"));
          workload.push(
            util$b.powerShell(
              "Get-WmiObject -Class Win32_diskdrive | Select-Object -Property PNPDeviceId,DeviceID, Model, Size, @{L='Partitions'; E={$_.GetRelated('Win32_DiskPartition').GetRelated('Win32_LogicalDisk') | Select-Object -Property DeviceID, VolumeName, Size, FreeSpace}} | fl"
            )
          );
          util$b.promiseAll(workload).then((res) => {
            const logicalDisks = res.results[0].toString().split(/\n\s*\n/);
            const diskDrives = res.results[1].toString().split(/\n\s*\n/);
            logicalDisks.forEach((device) => {
              const lines = device.split("\r\n");
              const drivetype = util$b.getValue(lines, "drivetype", ":");
              if (drivetype) {
                data.push({
                  name: util$b.getValue(lines, "name", ":"),
                  identifier: util$b.getValue(lines, "caption", ":"),
                  type: "disk",
                  fsType: util$b.getValue(lines, "filesystem", ":").toLowerCase(),
                  mount: util$b.getValue(lines, "caption", ":"),
                  size: util$b.getValue(lines, "size", ":"),
                  physical: drivetype >= 0 && drivetype <= 6 ? drivetypes[drivetype] : drivetypes[0],
                  uuid: util$b.getValue(lines, "volumeserialnumber", ":"),
                  label: util$b.getValue(lines, "volumename", ":"),
                  model: "",
                  serial: util$b.getValue(lines, "volumeserialnumber", ":"),
                  removable: drivetype === "2",
                  protocol: "",
                  group: "",
                  device: ""
                });
              }
            });
            data = matchDevicesWin(data, diskDrives);
            if (callback) {
              callback(data);
            }
            resolve(data);
          });
        } catch {
          if (callback) {
            callback(data);
          }
          resolve(data);
        }
      }
      if (_freebsd$8 || _openbsd$8 || _netbsd$8) {
        if (callback) {
          callback(null);
        }
        resolve(null);
      }
    });
  });
}
filesystem.blockDevices = blockDevices;
function calcFsSpeed(rx, wx) {
  const result = {
    rx: 0,
    wx: 0,
    tx: 0,
    rx_sec: null,
    wx_sec: null,
    tx_sec: null,
    ms: 0
  };
  if (_fs_speed && _fs_speed.ms) {
    result.rx = rx;
    result.wx = wx;
    result.tx = result.rx + result.wx;
    result.ms = Date.now() - _fs_speed.ms;
    result.rx_sec = (result.rx - _fs_speed.bytes_read) / (result.ms / 1e3);
    result.wx_sec = (result.wx - _fs_speed.bytes_write) / (result.ms / 1e3);
    result.tx_sec = result.rx_sec + result.wx_sec;
    _fs_speed.rx_sec = result.rx_sec;
    _fs_speed.wx_sec = result.wx_sec;
    _fs_speed.tx_sec = result.tx_sec;
    _fs_speed.bytes_read = result.rx;
    _fs_speed.bytes_write = result.wx;
    _fs_speed.bytes_overall = result.rx + result.wx;
    _fs_speed.ms = Date.now();
    _fs_speed.last_ms = result.ms;
  } else {
    result.rx = rx;
    result.wx = wx;
    result.tx = result.rx + result.wx;
    _fs_speed.rx_sec = null;
    _fs_speed.wx_sec = null;
    _fs_speed.tx_sec = null;
    _fs_speed.bytes_read = result.rx;
    _fs_speed.bytes_write = result.wx;
    _fs_speed.bytes_overall = result.rx + result.wx;
    _fs_speed.ms = Date.now();
    _fs_speed.last_ms = 0;
  }
  return result;
}
function fsStats(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (_windows$a || _freebsd$8 || _openbsd$8 || _netbsd$8 || _sunos$8) {
        return resolve(null);
      }
      let result = {
        rx: 0,
        wx: 0,
        tx: 0,
        rx_sec: null,
        wx_sec: null,
        tx_sec: null,
        ms: 0
      };
      let rx = 0;
      let wx = 0;
      if (_fs_speed && !_fs_speed.ms || _fs_speed && _fs_speed.ms && Date.now() - _fs_speed.ms >= 500) {
        if (_linux$9) {
          const procLsblk = exec$9("lsblk -r 2>/dev/null | grep /", { maxBuffer: 1024 * 1024 }, (error, stdout) => {
            if (!error) {
              const lines = stdout.toString().split("\n");
              const fs_filter = [];
              lines.forEach((line) => {
                if (line !== "") {
                  line = line.trim().split(" ");
                  const dev = util$b.sanitizeShellString(line[0], true);
                  if (dev && fs_filter.indexOf(dev) === -1) {
                    fs_filter.push(dev);
                  }
                }
              });
              const output = fs_filter.join("|");
              const procCat = exec$9('cat /proc/diskstats | egrep "' + output + '"', { maxBuffer: 1024 * 1024 }, (error2, stdout2) => {
                if (!error2) {
                  const lines2 = stdout2.toString().split("\n");
                  lines2.forEach((line) => {
                    line = line.trim();
                    if (line !== "") {
                      line = line.replace(/ +/g, " ").split(" ");
                      rx += parseInt(line[5], 10) * 512;
                      wx += parseInt(line[9], 10) * 512;
                    }
                  });
                  result = calcFsSpeed(rx, wx);
                }
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
              procCat.on("error", () => {
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
          procLsblk.on("error", () => {
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        }
        if (_darwin$9) {
          const procIoreg = exec$9(
            'ioreg -c IOBlockStorageDriver -k Statistics -r -w0 | sed -n "/IOBlockStorageDriver/,/Statistics/p" | grep "Statistics" | tr -cd "01234567890,\n"',
            { maxBuffer: 1024 * 1024 },
            (error, stdout) => {
              if (!error) {
                const lines = stdout.toString().split("\n");
                lines.forEach((line) => {
                  line = line.trim();
                  if (line !== "") {
                    line = line.split(",");
                    rx += parseInt(line[2], 10);
                    wx += parseInt(line[9], 10);
                  }
                });
                result = calcFsSpeed(rx, wx);
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          );
          procIoreg.on("error", () => {
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        }
      } else {
        result.ms = _fs_speed.last_ms;
        result.rx = _fs_speed.bytes_read;
        result.wx = _fs_speed.bytes_write;
        result.tx = _fs_speed.bytes_read + _fs_speed.bytes_write;
        result.rx_sec = _fs_speed.rx_sec;
        result.wx_sec = _fs_speed.wx_sec;
        result.tx_sec = _fs_speed.tx_sec;
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
filesystem.fsStats = fsStats;
function calcDiskIO(rIO, wIO, rWaitTime, wWaitTime, tWaitTime) {
  const result = {
    rIO: 0,
    wIO: 0,
    tIO: 0,
    rIO_sec: null,
    wIO_sec: null,
    tIO_sec: null,
    rWaitTime: 0,
    wWaitTime: 0,
    tWaitTime: 0,
    rWaitPercent: null,
    wWaitPercent: null,
    tWaitPercent: null,
    ms: 0
  };
  if (_disk_io && _disk_io.ms) {
    result.rIO = rIO;
    result.wIO = wIO;
    result.tIO = rIO + wIO;
    result.ms = Date.now() - _disk_io.ms;
    result.rIO_sec = (result.rIO - _disk_io.rIO) / (result.ms / 1e3);
    result.wIO_sec = (result.wIO - _disk_io.wIO) / (result.ms / 1e3);
    result.tIO_sec = result.rIO_sec + result.wIO_sec;
    result.rWaitTime = rWaitTime;
    result.wWaitTime = wWaitTime;
    result.tWaitTime = tWaitTime;
    result.rWaitPercent = (result.rWaitTime - _disk_io.rWaitTime) * 100 / result.ms;
    result.wWaitPercent = (result.wWaitTime - _disk_io.wWaitTime) * 100 / result.ms;
    result.tWaitPercent = (result.tWaitTime - _disk_io.tWaitTime) * 100 / result.ms;
    _disk_io.rIO = rIO;
    _disk_io.wIO = wIO;
    _disk_io.rIO_sec = result.rIO_sec;
    _disk_io.wIO_sec = result.wIO_sec;
    _disk_io.tIO_sec = result.tIO_sec;
    _disk_io.rWaitTime = rWaitTime;
    _disk_io.wWaitTime = wWaitTime;
    _disk_io.tWaitTime = tWaitTime;
    _disk_io.rWaitPercent = result.rWaitPercent;
    _disk_io.wWaitPercent = result.wWaitPercent;
    _disk_io.tWaitPercent = result.tWaitPercent;
    _disk_io.last_ms = result.ms;
    _disk_io.ms = Date.now();
  } else {
    result.rIO = rIO;
    result.wIO = wIO;
    result.tIO = rIO + wIO;
    result.rWaitTime = rWaitTime;
    result.wWaitTime = wWaitTime;
    result.tWaitTime = tWaitTime;
    _disk_io.rIO = rIO;
    _disk_io.wIO = wIO;
    _disk_io.rIO_sec = null;
    _disk_io.wIO_sec = null;
    _disk_io.tIO_sec = null;
    _disk_io.rWaitTime = rWaitTime;
    _disk_io.wWaitTime = wWaitTime;
    _disk_io.tWaitTime = tWaitTime;
    _disk_io.rWaitPercent = null;
    _disk_io.wWaitPercent = null;
    _disk_io.tWaitPercent = null;
    _disk_io.last_ms = 0;
    _disk_io.ms = Date.now();
  }
  return result;
}
function disksIO(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (_windows$a) {
        return resolve(null);
      }
      if (_sunos$8) {
        return resolve(null);
      }
      let result = {
        rIO: 0,
        wIO: 0,
        tIO: 0,
        rIO_sec: null,
        wIO_sec: null,
        tIO_sec: null,
        rWaitTime: 0,
        wWaitTime: 0,
        tWaitTime: 0,
        rWaitPercent: null,
        wWaitPercent: null,
        tWaitPercent: null,
        ms: 0
      };
      let rIO = 0;
      let wIO = 0;
      let rWaitTime = 0;
      let wWaitTime = 0;
      let tWaitTime = 0;
      if (_disk_io && !_disk_io.ms || _disk_io && _disk_io.ms && Date.now() - _disk_io.ms >= 500) {
        if (_linux$9 || _freebsd$8 || _openbsd$8 || _netbsd$8) {
          const cmd = 'for mount in `lsblk 2>/dev/null | grep " disk " | sed "s/[│└─├]//g" | awk \'{$1=$1};1\' | cut -d " " -f 1 | sort -u`; do cat /sys/block/$mount/stat | sed -r "s/ +/;/g" | sed -r "s/^;//"; done';
          exec$9(cmd, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
            if (!error) {
              const lines = stdout.split("\n");
              lines.forEach((line) => {
                if (!line) {
                  return;
                }
                const stats = line.split(";");
                rIO += parseInt(stats[0], 10);
                wIO += parseInt(stats[4], 10);
                rWaitTime += parseInt(stats[3], 10);
                wWaitTime += parseInt(stats[7], 10);
                tWaitTime += parseInt(stats[10], 10);
              });
              result = calcDiskIO(rIO, wIO, rWaitTime, wWaitTime, tWaitTime);
              if (callback) {
                callback(result);
              }
              resolve(result);
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        }
        if (_darwin$9) {
          exec$9(
            'ioreg -c IOBlockStorageDriver -k Statistics -r -w0 | sed -n "/IOBlockStorageDriver/,/Statistics/p" | grep "Statistics" | tr -cd "01234567890,\n"',
            { maxBuffer: 1024 * 1024 },
            (error, stdout) => {
              if (!error) {
                const lines = stdout.toString().split("\n");
                lines.forEach((line) => {
                  line = line.trim();
                  if (line !== "") {
                    line = line.split(",");
                    rIO += parseInt(line[10], 10);
                    wIO += parseInt(line[0], 10);
                  }
                });
                result = calcDiskIO(rIO, wIO, rWaitTime, wWaitTime, tWaitTime);
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          );
        }
      } else {
        result.rIO = _disk_io.rIO;
        result.wIO = _disk_io.wIO;
        result.tIO = _disk_io.rIO + _disk_io.wIO;
        result.ms = _disk_io.last_ms;
        result.rIO_sec = _disk_io.rIO_sec;
        result.wIO_sec = _disk_io.wIO_sec;
        result.tIO_sec = _disk_io.tIO_sec;
        result.rWaitTime = _disk_io.rWaitTime;
        result.wWaitTime = _disk_io.wWaitTime;
        result.tWaitTime = _disk_io.tWaitTime;
        result.rWaitPercent = _disk_io.rWaitPercent;
        result.wWaitPercent = _disk_io.wWaitPercent;
        result.tWaitPercent = _disk_io.tWaitPercent;
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
filesystem.disksIO = disksIO;
function diskLayout(callback) {
  function getVendorFromModel2(model) {
    const diskManufacturers = [
      { pattern: "WESTERN.*", manufacturer: "Western Digital" },
      { pattern: "^WDC.*", manufacturer: "Western Digital" },
      { pattern: "WD.*", manufacturer: "Western Digital" },
      { pattern: "TOSHIBA.*", manufacturer: "Toshiba" },
      { pattern: "HITACHI.*", manufacturer: "Hitachi" },
      { pattern: "^IC.*", manufacturer: "Hitachi" },
      { pattern: "^HTS.*", manufacturer: "Hitachi" },
      { pattern: "SANDISK.*", manufacturer: "SanDisk" },
      { pattern: "KINGSTON.*", manufacturer: "Kingston Technology" },
      { pattern: "^SONY.*", manufacturer: "Sony" },
      { pattern: "TRANSCEND.*", manufacturer: "Transcend" },
      { pattern: "SAMSUNG.*", manufacturer: "Samsung" },
      { pattern: "^ST(?!I\\ ).*", manufacturer: "Seagate" },
      { pattern: "^STI\\ .*", manufacturer: "SimpleTech" },
      { pattern: "^D...-.*", manufacturer: "IBM" },
      { pattern: "^IBM.*", manufacturer: "IBM" },
      { pattern: "^FUJITSU.*", manufacturer: "Fujitsu" },
      { pattern: "^MP.*", manufacturer: "Fujitsu" },
      { pattern: "^MK.*", manufacturer: "Toshiba" },
      { pattern: "MAXTO.*", manufacturer: "Maxtor" },
      { pattern: "PIONEER.*", manufacturer: "Pioneer" },
      { pattern: "PHILIPS.*", manufacturer: "Philips" },
      { pattern: "QUANTUM.*", manufacturer: "Quantum Technology" },
      { pattern: "FIREBALL.*", manufacturer: "Quantum Technology" },
      { pattern: "^VBOX.*", manufacturer: "VirtualBox" },
      { pattern: "CORSAIR.*", manufacturer: "Corsair Components" },
      { pattern: "CRUCIAL.*", manufacturer: "Crucial" },
      { pattern: "ECM.*", manufacturer: "ECM" },
      { pattern: "INTEL.*", manufacturer: "INTEL" },
      { pattern: "EVO.*", manufacturer: "Samsung" },
      { pattern: "APPLE.*", manufacturer: "Apple" }
    ];
    let result = "";
    if (model) {
      model = model.toUpperCase();
      diskManufacturers.forEach((manufacturer) => {
        const re2 = RegExp(manufacturer.pattern);
        if (re2.test(model)) {
          result = manufacturer.manufacturer;
        }
      });
    }
    return result;
  }
  return new Promise((resolve) => {
    process.nextTick(() => {
      const commitResult = (res) => {
        for (let i = 0; i < res.length; i++) {
          delete res[i].BSDName;
        }
        if (callback) {
          callback(res);
        }
        resolve(res);
      };
      const result = [];
      let cmd = "";
      if (_linux$9) {
        let cmdFullSmart = "";
        exec$9("export LC_ALL=C; lsblk -ablJO 2>/dev/null; unset LC_ALL", { maxBuffer: 1024 * 1024 }, (error, stdout) => {
          if (!error) {
            try {
              const out = stdout.toString().trim();
              let devices = [];
              try {
                const outJSON = JSON.parse(out);
                if (outJSON && {}.hasOwnProperty.call(outJSON, "blockdevices")) {
                  devices = outJSON.blockdevices.filter((item) => {
                    return item.type === "disk" && item.size > 0 && (item.model !== null || item.mountpoint === null && item.label === null && item.fstype === null && item.parttype === null && item.path && item.path.indexOf("/ram") !== 0 && item.path.indexOf("/loop") !== 0 && item["disc-max"] && item["disc-max"] !== 0);
                  });
                }
              } catch {
                try {
                  const out2 = execSync$5(
                    "export LC_ALL=C; lsblk -bPo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,RM,LABEL,MODEL,OWNER,GROUP 2>/dev/null; unset LC_ALL",
                    util$b.execOptsLinux
                  ).toString();
                  const lines = blkStdoutToObject(out2).split("\n");
                  const data = parseBlk(lines);
                  devices = data.filter((item) => {
                    return item.type === "disk" && item.size > 0 && (item.model !== null && item.model !== "" || item.mount === "" && item.label === "" && item.fsType === "");
                  });
                } catch {
                  util$b.noop();
                }
              }
              devices.forEach((device) => {
                let mediumType = "";
                const logical = util$b.sanitizeShellString(device.name, true);
                const BSDName = "/dev/" + logical;
                try {
                  mediumType = execSync$5("cat /sys/block/" + logical + "/queue/rotational 2>/dev/null", util$b.execOptsLinux).toString().split("\n")[0];
                } catch {
                  util$b.noop();
                }
                let interfaceType = device.tran ? device.tran.toUpperCase().trim() : "";
                if (interfaceType === "NVME") {
                  mediumType = "2";
                  interfaceType = "PCIe";
                }
                result.push({
                  device: BSDName,
                  type: mediumType === "0" ? "SSD" : mediumType === "1" ? "HD" : mediumType === "2" ? "NVMe" : device.model && device.model.indexOf("SSD") > -1 ? "SSD" : device.model && device.model.indexOf("NVM") > -1 ? "NVMe" : "HD",
                  name: device.model || "",
                  vendor: getVendorFromModel2(device.model) || (device.vendor ? device.vendor.trim() : ""),
                  size: device.size || 0,
                  bytesPerSector: null,
                  totalCylinders: null,
                  totalHeads: null,
                  totalSectors: null,
                  totalTracks: null,
                  tracksPerCylinder: null,
                  sectorsPerTrack: null,
                  firmwareRevision: device.rev ? device.rev.trim() : "",
                  serialNum: device.serial ? device.serial.trim() : "",
                  interfaceType,
                  smartStatus: "unknown",
                  temperature: null,
                  BSDName
                });
                cmd += `printf "
${BSDName}|"; smartctl -H ${BSDName} | grep overall;`;
                cmdFullSmart += `${cmdFullSmart ? 'printf ",";' : ""}smartctl -a -j ${BSDName};`;
              });
            } catch {
              util$b.noop();
            }
          }
          if (cmdFullSmart) {
            exec$9(cmdFullSmart, { maxBuffer: 1024 * 1024 }, (error2, stdout2) => {
              try {
                const data = JSON.parse(`[${stdout2}]`);
                data.forEach((disk) => {
                  const diskBSDName = disk.smartctl.argv[disk.smartctl.argv.length - 1];
                  for (let i = 0; i < result.length; i++) {
                    if (result[i].BSDName === diskBSDName) {
                      result[i].smartStatus = disk.smart_status.passed ? "Ok" : disk.smart_status.passed === false ? "Predicted Failure" : "unknown";
                      if (disk.temperature && disk.temperature.current) {
                        result[i].temperature = disk.temperature.current;
                      }
                      result[i].smartData = disk;
                    }
                  }
                });
                commitResult(result);
              } catch {
                if (cmd) {
                  cmd = cmd + 'printf "\n"';
                  exec$9(cmd, { maxBuffer: 1024 * 1024 }, (error3, stdout3) => {
                    const lines = stdout3.toString().split("\n");
                    lines.forEach((line) => {
                      if (line) {
                        const parts = line.split("|");
                        if (parts.length === 2) {
                          const BSDName = parts[0];
                          parts[1] = parts[1].trim();
                          const parts2 = parts[1].split(":");
                          if (parts2.length === 2) {
                            parts2[1] = parts2[1].trim();
                            const status = parts2[1].toLowerCase();
                            for (let i = 0; i < result.length; i++) {
                              if (result[i].BSDName === BSDName) {
                                result[i].smartStatus = status === "passed" ? "Ok" : status === "failed!" ? "Predicted Failure" : "unknown";
                              }
                            }
                          }
                        }
                      }
                    });
                    commitResult(result);
                  });
                } else {
                  commitResult(result);
                }
              }
            });
          } else {
            commitResult(result);
          }
        });
      }
      if (_freebsd$8 || _openbsd$8 || _netbsd$8) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_sunos$8) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_darwin$9) {
        let cmdFullSmart = "";
        exec$9(`system_profiler SPSerialATADataType SPNVMeDataType SPUSBDataType SPStorageDataType`, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().split("\n");
            const linesSATA = [];
            const linesNVMe = [];
            const linesStorage = [];
            const linesUSB = [];
            let dataType = "SATA";
            lines.forEach((line) => {
              if (line === "NVMExpress:") {
                dataType = "NVMe";
              } else if (line === "Storage:") {
                dataType = "Storage";
              } else if (line === "USB:") {
                dataType = "USB";
              } else if (line === "SATA/SATA Express:") {
                dataType = "SATA";
              } else if (dataType === "SATA") {
                linesSATA.push(line);
              } else if (dataType === "NVMe") {
                linesNVMe.push(line);
              } else if (dataType === "Storage") {
                linesStorage.push(line);
              } else if (dataType === "USB") {
                linesUSB.push(line);
              }
            });
            try {
              const devices = linesSATA.join("\n").split(" Physical Interconnect: ");
              devices.shift();
              devices.forEach((device) => {
                device = "InterfaceType: " + device;
                const lines2 = device.split("\n");
                const mediumType = util$b.getValue(lines2, "Medium Type", ":", true).trim();
                const sizeStr = util$b.getValue(lines2, "capacity", ":", true).trim();
                const BSDName = util$b.sanitizeShellString(util$b.getValue(lines2, "BSD Name", ":", true).trim(), true);
                if (sizeStr) {
                  let sizeValue = 0;
                  if (sizeStr.indexOf("(") >= 0) {
                    sizeValue = parseInt(
                      sizeStr.match(/\(([^)]+)\)/)[1].replace(/\./g, "").replace(/,/g, "").replace(/\s/g, ""),
                      10
                    );
                  }
                  if (!sizeValue) {
                    sizeValue = parseInt(sizeStr, 10);
                  }
                  if (sizeValue) {
                    const smartStatusString = util$b.getValue(lines2, "S.M.A.R.T. status", ":", true).trim().toLowerCase();
                    result.push({
                      device: BSDName,
                      type: mediumType.startsWith("Solid") ? "SSD" : "HD",
                      name: util$b.getValue(lines2, "Model", ":", true).trim(),
                      vendor: getVendorFromModel2(util$b.getValue(lines2, "Model", ":", true).trim()) || util$b.getValue(lines2, "Manufacturer", ":", true),
                      size: sizeValue,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: util$b.getValue(lines2, "Revision", ":", true).trim(),
                      serialNum: util$b.getValue(lines2, "Serial Number", ":", true).trim(),
                      interfaceType: util$b.getValue(lines2, "InterfaceType", ":", true).trim(),
                      smartStatus: smartStatusString === "verified" ? "OK" : smartStatusString || "unknown",
                      temperature: null,
                      BSDName
                    });
                    cmd = cmd + 'printf "\n' + BSDName + '|"; diskutil info /dev/' + BSDName + " | grep SMART;";
                    cmdFullSmart += `${cmdFullSmart ? 'printf ",";' : ""}smartctl -a -j ${BSDName};`;
                  }
                }
              });
            } catch {
              util$b.noop();
            }
            try {
              const devices = linesNVMe.join("\n").split("\n\n          Capacity:");
              devices.shift();
              devices.forEach((device) => {
                device = `!Capacity: ${device}`;
                const lines2 = device.split("\n");
                const linkWidth = util$b.getValue(lines2, "link width", ":", true).trim();
                const sizeStr = util$b.getValue(lines2, "!capacity", ":", true).trim();
                const BSDName = util$b.sanitizeShellString(util$b.getValue(lines2, "BSD Name", ":", true).trim(), true);
                if (sizeStr) {
                  let sizeValue = 0;
                  if (sizeStr.indexOf("(") >= 0) {
                    sizeValue = parseInt(
                      sizeStr.match(/\(([^)]+)\)/)[1].replace(/\./g, "").replace(/,/g, "").replace(/\s/g, ""),
                      10
                    );
                  }
                  if (!sizeValue) {
                    sizeValue = parseInt(sizeStr, 10);
                  }
                  if (sizeValue) {
                    const smartStatusString = util$b.getValue(lines2, "S.M.A.R.T. status", ":", true).trim().toLowerCase();
                    result.push({
                      device: BSDName,
                      type: "NVMe",
                      name: util$b.getValue(lines2, "Model", ":", true).trim(),
                      vendor: getVendorFromModel2(util$b.getValue(lines2, "Model", ":", true).trim()),
                      size: sizeValue,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: util$b.getValue(lines2, "Revision", ":", true).trim(),
                      serialNum: util$b.getValue(lines2, "Serial Number", ":", true).trim(),
                      interfaceType: ("PCIe " + linkWidth).trim(),
                      smartStatus: smartStatusString === "verified" ? "OK" : smartStatusString || "unknown",
                      temperature: null,
                      BSDName
                    });
                    cmd = `${cmd}printf "
${BSDName}|"; diskutil info /dev/${BSDName} | grep SMART;`;
                    cmdFullSmart += `${cmdFullSmart ? 'printf ",";' : ""}smartctl -a -j ${BSDName};`;
                  }
                }
              });
            } catch {
              util$b.noop();
            }
            try {
              const devices = linesUSB.join("\n").replace(/Media:\n /g, "Model:").split("\n\n          Product ID:");
              devices.shift();
              devices.forEach((device) => {
                const lines2 = device.split("\n");
                const sizeStr = util$b.getValue(lines2, "Capacity", ":", true).trim();
                const BSDName = util$b.sanitizeShellString(util$b.getValue(lines2, "BSD Name", ":", true).trim(), true);
                if (sizeStr) {
                  let sizeValue = 0;
                  if (sizeStr.indexOf("(") >= 0) {
                    sizeValue = parseInt(
                      sizeStr.match(/\(([^)]+)\)/)[1].replace(/\./g, "").replace(/,/g, "").replace(/\s/g, ""),
                      10
                    );
                  }
                  if (!sizeValue) {
                    sizeValue = parseInt(sizeStr, 10);
                  }
                  if (sizeValue) {
                    const smartStatusString = util$b.getValue(lines2, "S.M.A.R.T. status", ":", true).trim().toLowerCase();
                    result.push({
                      device: BSDName,
                      type: "USB",
                      name: util$b.getValue(lines2, "Model", ":", true).trim().replace(/:/g, ""),
                      vendor: getVendorFromModel2(util$b.getValue(lines2, "Model", ":", true).trim()),
                      size: sizeValue,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: util$b.getValue(lines2, "Revision", ":", true).trim(),
                      serialNum: util$b.getValue(lines2, "Serial Number", ":", true).trim(),
                      interfaceType: "USB",
                      smartStatus: smartStatusString === "verified" ? "OK" : smartStatusString || "unknown",
                      temperature: null,
                      BSDName
                    });
                    cmd = cmd + 'printf "\n' + BSDName + '|"; diskutil info /dev/' + BSDName + " | grep SMART;";
                    cmdFullSmart += `${cmdFullSmart ? 'printf ",";' : ""}smartctl -a -j ${BSDName};`;
                  }
                }
              });
            } catch {
              util$b.noop();
            }
            try {
              const seen = {};
              result.forEach((d) => {
                const m = (d.BSDName || "").match(/disk\d+/);
                if (m) {
                  seen[m[0]] = true;
                }
              });
              const devices = linesStorage.join("\n").split("      Free:");
              devices.shift();
              devices.forEach((device) => {
                const lines2 = device.split("\n");
                const internal = util$b.getValue(lines2, "Internal", ":", true).trim().toLowerCase();
                if (internal !== "no") {
                  return;
                }
                const bsdMatch = util$b.getValue(lines2, "BSD Name", ":", true).trim().match(/disk\d+/);
                const BSDName = bsdMatch ? bsdMatch[0] : "";
                if (!BSDName || seen[BSDName]) {
                  return;
                }
                const sizeStr = util$b.getValue(lines2, "Capacity", ":", true).trim();
                if (sizeStr) {
                  let sizeValue = 0;
                  if (sizeStr.indexOf("(") >= 0) {
                    sizeValue = parseInt(
                      sizeStr.match(/\(([^)]+)\)/)[1].replace(/\./g, "").replace(/,/g, "").replace(/\s/g, ""),
                      10
                    );
                  }
                  if (!sizeValue) {
                    sizeValue = parseInt(sizeStr, 10);
                  }
                  if (sizeValue) {
                    seen[BSDName] = true;
                    const protocol = util$b.getValue(lines2, "Protocol", ":", true).trim();
                    const model = util$b.getValue(lines2, "Device Name", ":", true).trim();
                    result.push({
                      device: BSDName,
                      type: protocol && protocol !== "USB" ? protocol : "USB",
                      name: model,
                      vendor: getVendorFromModel2(model),
                      size: sizeValue,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: "",
                      serialNum: "",
                      interfaceType: protocol || "USB",
                      smartStatus: "unknown",
                      temperature: null,
                      BSDName
                    });
                    cmd = cmd + 'printf "\n' + BSDName + '|"; diskutil info /dev/' + BSDName + " | grep SMART;";
                    cmdFullSmart += `${cmdFullSmart ? 'printf ",";' : ""}smartctl -a -j ${BSDName};`;
                  }
                }
              });
            } catch {
              util$b.noop();
            }
            if (cmdFullSmart) {
              exec$9(cmdFullSmart, { maxBuffer: 1024 * 1024 }, (error2, stdout2) => {
                try {
                  const data = JSON.parse(`[${stdout2}]`);
                  data.forEach((disk) => {
                    const diskBSDName = disk.smartctl.argv[disk.smartctl.argv.length - 1];
                    for (let i = 0; i < result.length; i++) {
                      if (result[i].BSDName === diskBSDName) {
                        result[i].smartStatus = disk.smart_status.passed ? "Ok" : disk.smart_status.passed === false ? "Predicted Failure" : "unknown";
                        if (disk.temperature && disk.temperature.current) {
                          result[i].temperature = disk.temperature.current;
                        }
                        result[i].smartData = disk;
                      }
                    }
                  });
                  commitResult(result);
                } catch (e) {
                  if (cmd) {
                    cmd = cmd + 'printf "\n"';
                    exec$9(cmd, { maxBuffer: 1024 * 1024 }, (error3, stdout3) => {
                      const lines2 = stdout3.toString().split("\n");
                      lines2.forEach((line) => {
                        if (line) {
                          const parts = line.split("|");
                          if (parts.length === 2) {
                            const BSDName = parts[0];
                            parts[1] = parts[1].trim();
                            const parts2 = parts[1].split(":");
                            if (parts2.length === 2) {
                              parts2[1] = parts2[1].trim();
                              const status = parts2[1].toLowerCase();
                              for (let i = 0; i < result.length; i++) {
                                if (result[i].BSDName === BSDName) {
                                  result[i].smartStatus = status === "passed" ? "Ok" : status === "failed!" ? "Predicted Failure" : "unknown";
                                }
                              }
                            }
                          }
                        }
                      });
                      commitResult(result);
                    });
                  } else {
                    commitResult(result);
                  }
                }
              });
            } else if (cmd) {
              cmd = cmd + 'printf "\n"';
              exec$9(cmd, { maxBuffer: 1024 * 1024 }, (error2, stdout2) => {
                const lines2 = stdout2.toString().split("\n");
                lines2.forEach((line) => {
                  if (line) {
                    const parts = line.split("|");
                    if (parts.length === 2) {
                      const BSDName = parts[0];
                      parts[1] = parts[1].trim();
                      const parts2 = parts[1].split(":");
                      if (parts2.length === 2) {
                        parts2[1] = parts2[1].trim();
                        const status = parts2[1].toLowerCase();
                        for (let i = 0; i < result.length; i++) {
                          if (result[i].BSDName === BSDName) {
                            result[i].smartStatus = status === "not supported" ? "not supported" : status === "verified" ? "Ok" : status === "failing" ? "Predicted Failure" : "unknown";
                          }
                        }
                      }
                    }
                  }
                });
                commitResult(result);
              });
            } else {
              commitResult(result);
            }
          } else {
            commitResult(result);
          }
        });
      }
      if (_windows$a) {
        try {
          let hasControlCharacters = function(str) {
            return new RegExp("\\p{Cc}", "u").test(str);
          };
          const workload = [];
          workload.push(
            util$b.powerShell(
              "Get-CimInstance Win32_DiskDrive | select Caption,Size,Status,PNPDeviceId,DeviceId,BytesPerSector,TotalCylinders,TotalHeads,TotalSectors,TotalTracks,TracksPerCylinder,SectorsPerTrack,FirmwareRevision,SerialNumber,InterfaceType | fl"
            )
          );
          workload.push(util$b.powerShell("Get-PhysicalDisk | select BusType,MediaType,FriendlyName,Model,SerialNumber,Size | fl"));
          if (util$b.smartMonToolsInstalled()) {
            try {
              const smartDev = JSON.parse(execSync$5("smartctl --scan -j").toString());
              if (smartDev && smartDev.devices && smartDev.devices.length > 0) {
                smartDev.devices.forEach((dev) => {
                  if (!/^[\w/.,:\\-]+$/.test(String(dev.name || ""))) {
                    return;
                  }
                  workload.push(execPromiseSave(`smartctl -j -a ${dev.name}`, util$b.execOptsWin));
                });
              }
            } catch {
              util$b.noop();
            }
          }
          util$b.promiseAll(workload).then((data) => {
            let devices = data.results[0].toString().split(/\n\s*\n/);
            devices.forEach((device) => {
              const lines = device.split("\r\n");
              const size = util$b.getValue(lines, "Size", ":").trim();
              const status = util$b.getValue(lines, "Status", ":").trim().toLowerCase();
              let serialNum = util$b.getValue(lines, "SerialNumber", ":").trim();
              if (hasControlCharacters(serialNum)) {
                const instanceId = util$b.getValue(lines, "PNPDeviceId", ":").trim().split("\\")[2];
                if (instanceId) {
                  const parts = instanceId.split("&");
                  if (parts.length == 2 && parts[1] === "0") {
                    serialNum = parts[0];
                  }
                }
              }
              if (size) {
                result.push({
                  device: util$b.getValue(lines, "DeviceId", ":"),
                  // changed from PNPDeviceId to DeviceID (be be able to match devices)
                  type: device.indexOf("SSD") > -1 ? "SSD" : "HD",
                  // just a starting point ... better: MSFT_PhysicalDisk - Media Type ... see below
                  name: util$b.getValue(lines, "Caption", ":"),
                  vendor: getVendorFromModel2(util$b.getValue(lines, "Caption", ":", true).trim()),
                  size: parseInt(size, 10),
                  bytesPerSector: parseInt(util$b.getValue(lines, "BytesPerSector", ":"), 10),
                  totalCylinders: parseInt(util$b.getValue(lines, "TotalCylinders", ":"), 10),
                  totalHeads: parseInt(util$b.getValue(lines, "TotalHeads", ":"), 10),
                  totalSectors: parseInt(util$b.getValue(lines, "TotalSectors", ":"), 10),
                  totalTracks: parseInt(util$b.getValue(lines, "TotalTracks", ":"), 10),
                  tracksPerCylinder: parseInt(util$b.getValue(lines, "TracksPerCylinder", ":"), 10),
                  sectorsPerTrack: parseInt(util$b.getValue(lines, "SectorsPerTrack", ":"), 10),
                  firmwareRevision: util$b.getValue(lines, "FirmwareRevision", ":").trim(),
                  serialNum,
                  interfaceType: util$b.getValue(lines, "InterfaceType", ":").trim(),
                  smartStatus: status === "ok" ? "Ok" : status === "degraded" ? "Degraded" : status === "pred fail" ? "Predicted Failure" : "Unknown",
                  temperature: null
                });
              }
            });
            devices = data.results[1].split(/\n\s*\n/);
            devices.forEach((device) => {
              const lines = device.split("\r\n");
              const serialNum = util$b.getValue(lines, "SerialNumber", ":").trim();
              const name = util$b.getValue(lines, "FriendlyName", ":").trim().replace("Msft ", "Microsoft");
              const size = util$b.getValue(lines, "Size", ":").trim();
              const model = util$b.getValue(lines, "Model", ":").trim();
              const interfaceType = util$b.getValue(lines, "BusType", ":").trim();
              let mediaType = util$b.getValue(lines, "MediaType", ":").trim();
              if (mediaType === "3" || mediaType === "HDD") {
                mediaType = "HD";
              }
              if (mediaType === "4") {
                mediaType = "SSD";
              }
              if (mediaType === "5") {
                mediaType = "SCM";
              }
              if (mediaType === "Unspecified" && (model.toLowerCase().indexOf("virtual") > -1 || model.toLowerCase().indexOf("vbox") > -1)) {
                mediaType = "Virtual";
              }
              if (size) {
                let i = util$b.findObjectByKey(result, "serialNum", serialNum);
                if (i === -1 || serialNum === "") {
                  i = util$b.findObjectByKey(result, "name", name);
                }
                if (i !== -1) {
                  result[i].type = mediaType;
                  result[i].interfaceType = interfaceType;
                }
              }
            });
            data.results.shift();
            data.results.shift();
            if (data.results.length) {
              data.results.forEach((smartStr) => {
                try {
                  const smartData = JSON.parse(smartStr);
                  if (smartData.serial_number) {
                    const serialNum = smartData.serial_number;
                    const i = util$b.findObjectByKey(result, "serialNum", serialNum);
                    if (i !== -1) {
                      result[i].smartStatus = smartData.smart_status && smartData.smart_status.passed ? "Ok" : smartData.smart_status && smartData.smart_status.passed === false ? "Predicted Failure" : "unknown";
                      if (smartData.temperature && smartData.temperature.current) {
                        result[i].temperature = smartData.temperature.current;
                      }
                      result[i].smartData = smartData;
                    }
                  }
                } catch {
                  util$b.noop();
                }
              });
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
filesystem.diskLayout = diskLayout;
var network = {};
const os$3 = require$$0$1;
const exec$8 = require$$1$4.exec;
const execSync$4 = require$$1$4.execSync;
const execFileSync = require$$1$4.execFileSync;
const readFileSync = require$$1$1.readFileSync;
const fs$2 = require$$1$1;
const util$a = util$i;
const _platform$9 = process.platform;
const _linux$8 = _platform$9 === "linux" || _platform$9 === "android";
const _darwin$8 = _platform$9 === "darwin";
const _windows$9 = _platform$9 === "win32";
const _freebsd$7 = _platform$9 === "freebsd";
const _openbsd$7 = _platform$9 === "openbsd";
const _netbsd$7 = _platform$9 === "netbsd";
const _sunos$7 = _platform$9 === "sunos";
const _network = {};
let _default_iface = "";
let _ifaces = {};
let _dhcpNics = [];
let _networkInterfaces = [];
let _mac = {};
let pathToIp;
function getDefaultNetworkInterface() {
  let ifacename = "";
  let ifacenameFirst = "";
  try {
    const ifaces = os$3.networkInterfaces();
    let scopeid = 9999;
    for (let dev in ifaces) {
      if ({}.hasOwnProperty.call(ifaces, dev)) {
        ifaces[dev].forEach((details) => {
          if (details && details.internal === false) {
            ifacenameFirst = ifacenameFirst || dev;
            if (details.scopeid && details.scopeid < scopeid) {
              ifacename = dev;
              scopeid = details.scopeid;
            }
          }
        });
      }
    }
    ifacename = ifacename || ifacenameFirst || "";
    if (_windows$9) {
      let defaultIp = "";
      const cmd = "netstat -r";
      const result = execSync$4(cmd, util$a.execOptsWin);
      const lines = result.toString().split(os$3.EOL);
      lines.forEach((line) => {
        line = line.replace(/\s+/g, " ").trim();
        if (line.indexOf("0.0.0.0 0.0.0.0") > -1 && !/[a-zA-Z]/.test(line)) {
          const parts = line.split(" ");
          if (parts.length >= 5) {
            defaultIp = parts[parts.length - 2];
          }
        }
      });
      if (defaultIp) {
        for (let dev in ifaces) {
          if ({}.hasOwnProperty.call(ifaces, dev)) {
            ifaces[dev].forEach((details) => {
              if (details && details.address && details.address === defaultIp) {
                ifacename = dev;
              }
            });
          }
        }
      }
    }
    if (_linux$8) {
      const cmd = "ip route 2> /dev/null | grep default";
      const result = execSync$4(cmd, util$a.execOptsLinux);
      const parts = result.toString().split("\n")[0].split(/\s+/);
      if (parts[0] === "none" && parts[5]) {
        ifacename = parts[5];
      } else if (parts[4]) {
        ifacename = parts[4];
      }
      if (ifacename.indexOf(":") > -1) {
        ifacename = ifacename.split(":")[1].trim();
      }
    }
    if (_darwin$8 || _freebsd$7 || _openbsd$7 || _netbsd$7 || _sunos$7) {
      let cmd = "";
      if (_linux$8) {
        cmd = "ip route 2> /dev/null | grep default | awk '{print $5}'";
      }
      if (_darwin$8) {
        cmd = "route -n get default 2>/dev/null | grep interface: | awk '{print $2}'";
      }
      if (_freebsd$7 || _openbsd$7 || _netbsd$7 || _sunos$7) {
        cmd = "route get 0.0.0.0 | grep interface:";
      }
      const result = execSync$4(cmd);
      ifacename = result.toString().split("\n")[0];
      if (ifacename.indexOf(":") > -1) {
        ifacename = ifacename.split(":")[1].trim();
      }
    }
  } catch {
    util$a.noop();
  }
  if (ifacename) {
    _default_iface = ifacename;
  }
  return _default_iface;
}
network.getDefaultNetworkInterface = getDefaultNetworkInterface;
function getMacAddresses() {
  let iface = "";
  let mac = "";
  const result = {};
  if (_linux$8 || _freebsd$7 || _openbsd$7 || _netbsd$7) {
    if (typeof pathToIp === "undefined") {
      try {
        const lines = execSync$4("which ip", util$a.execOptsLinux).toString().split("\n");
        if (lines.length && lines[0].indexOf(":") === -1 && lines[0].indexOf("/") === 0) {
          pathToIp = lines[0];
        } else {
          pathToIp = "";
        }
      } catch {
        pathToIp = "";
      }
    }
    try {
      const cmd = "export LC_ALL=C; " + (pathToIp ? pathToIp + " link show up" : "/sbin/ifconfig") + "; unset LC_ALL";
      const res = execSync$4(cmd, util$a.execOptsLinux);
      const lines = res.toString().split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] && lines[i][0] !== " ") {
          if (pathToIp) {
            const nextline = lines[i + 1].trim().split(" ");
            if (nextline[0] === "link/ether") {
              iface = lines[i].split(" ")[1];
              iface = iface.slice(0, iface.length - 1);
              mac = nextline[1];
            }
          } else {
            iface = lines[i].split(" ")[0];
            mac = lines[i].split("HWaddr ")[1];
          }
          if (iface && mac) {
            result[iface] = mac.trim();
            iface = "";
            mac = "";
          }
        }
      }
    } catch {
      util$a.noop();
    }
  }
  if (_darwin$8) {
    try {
      const cmd = "/sbin/ifconfig";
      const res = execSync$4(cmd);
      const lines = res.toString().split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] && lines[i][0] !== "	" && lines[i].indexOf(":") > 0) {
          iface = lines[i].split(":")[0];
        } else if (lines[i].indexOf("	ether ") === 0) {
          mac = lines[i].split("	ether ")[1];
          if (iface && mac) {
            result[iface] = mac.trim();
            iface = "";
            mac = "";
          }
        }
      }
    } catch {
      util$a.noop();
    }
  }
  return result;
}
function networkInterfaceDefault(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = getDefaultNetworkInterface();
      if (callback) {
        callback(result);
      }
      resolve(result);
    });
  });
}
network.networkInterfaceDefault = networkInterfaceDefault;
function parseLinesWindowsNics(sections, nconfigsections) {
  const nics = [];
  for (let i in sections) {
    try {
      if ({}.hasOwnProperty.call(sections, i)) {
        if (sections[i].trim() !== "") {
          const lines = sections[i].trim().split("\r\n");
          let linesNicConfig = null;
          try {
            linesNicConfig = nconfigsections && nconfigsections[i] ? nconfigsections[i].trim().split("\r\n") : [];
          } catch {
            util$a.noop();
          }
          const netEnabled = util$a.getValue(lines, "NetEnabled", ":");
          let adapterType = util$a.getValue(lines, "AdapterTypeID", ":") === "9" ? "wireless" : "wired";
          const ifacename = util$a.getValue(lines, "Name", ":").replace(/\]/g, ")").replace(/\[/g, "(");
          const iface = util$a.getValue(lines, "NetConnectionID", ":").replace(/\]/g, ")").replace(/\[/g, "(");
          if (ifacename.toLowerCase().indexOf("wi-fi") >= 0 || ifacename.toLowerCase().indexOf("wireless") >= 0) {
            adapterType = "wireless";
          }
          if (netEnabled !== "") {
            const speed = parseInt(util$a.getValue(lines, "speed", ":").trim(), 10) / 1e6;
            nics.push({
              mac: util$a.getValue(lines, "MACAddress", ":").toLowerCase(),
              dhcp: util$a.getValue(linesNicConfig, "dhcpEnabled", ":").toLowerCase() === "true",
              name: ifacename,
              iface,
              netEnabled: netEnabled === "TRUE",
              speed: isNaN(speed) ? null : speed,
              operstate: util$a.getValue(lines, "NetConnectionStatus", ":") === "2" ? "up" : "down",
              type: adapterType
            });
          }
        }
      }
    } catch {
      util$a.noop();
    }
  }
  return nics;
}
function getWindowsNics() {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let cmd = "Get-CimInstance Win32_NetworkAdapter | fl *; echo '#-#-#-#';";
      cmd += "Get-CimInstance Win32_NetworkAdapterConfiguration | fl DHCPEnabled";
      try {
        util$a.powerShell(cmd).then((data) => {
          data = data.split("#-#-#-#");
          const nsections = (data[0] || "").split(/\n\s*\n/);
          const nconfigsections = (data[1] || "").split(/\n\s*\n/);
          resolve(parseLinesWindowsNics(nsections, nconfigsections));
        });
      } catch {
        resolve([]);
      }
    });
  });
}
function getWindowsDNSsuffixes() {
  let iface = {};
  const dnsSuffixes = {
    primaryDNS: "",
    exitCode: 0,
    ifaces: []
  };
  try {
    const ipconfig = execSync$4("ipconfig /all", util$a.execOptsWin);
    const ipconfigArray = ipconfig.split("\r\n\r\n");
    ipconfigArray.forEach((element, index) => {
      if (index === 1) {
        const longPrimaryDNS = element.split("\r\n").filter((element2) => {
          return element2.toUpperCase().includes("DNS");
        });
        const primaryDNS = longPrimaryDNS[0].substring(longPrimaryDNS[0].lastIndexOf(":") + 1);
        dnsSuffixes.primaryDNS = primaryDNS.trim();
        if (!dnsSuffixes.primaryDNS) {
          dnsSuffixes.primaryDNS = "Not defined";
        }
      }
      if (index > 1) {
        if (index % 2 === 0) {
          const name = element.substring(element.lastIndexOf(" ") + 1).replace(":", "");
          iface.name = name;
        } else {
          const connectionSpecificDNS = element.split("\r\n").filter((element2) => {
            return element2.toUpperCase().includes("DNS");
          });
          const dnsSuffix = connectionSpecificDNS[0].substring(connectionSpecificDNS[0].lastIndexOf(":") + 1);
          iface.dnsSuffix = dnsSuffix.trim();
          dnsSuffixes.ifaces.push(iface);
          iface = {};
        }
      }
    });
    return dnsSuffixes;
  } catch {
    return {
      primaryDNS: "",
      exitCode: 0,
      ifaces: []
    };
  }
}
function getWindowsIfaceDNSsuffix(ifaces, ifacename) {
  let dnsSuffix = "";
  const interfaceName = ifacename + ".";
  try {
    const connectionDnsSuffix = ifaces.filter((iface) => {
      return interfaceName.includes(iface.name + ".");
    }).map((iface) => iface.dnsSuffix);
    if (connectionDnsSuffix[0]) {
      dnsSuffix = connectionDnsSuffix[0];
    }
    if (!dnsSuffix) {
      dnsSuffix = "";
    }
    return dnsSuffix;
  } catch {
    return "Unknown";
  }
}
function getWindowsWiredProfilesInformation() {
  try {
    const result = execSync$4("netsh lan show profiles", util$a.execOptsWin);
    const profileList = result.split("\r\nProfile on interface");
    return profileList;
  } catch (error) {
    if (error.status === 1 && error.stdout.includes("AutoConfig")) {
      return "Disabled";
    }
    return [];
  }
}
function getWindowsWirelessIfaceSSID(interfaceName) {
  try {
    const result = execFileSync("netsh", ["wlan", "show", "interface", `name=${util$a.sanitizeString(interfaceName)}`], util$a.execOptsWin).toString();
    const SSID = result.split("\r\n").find((l) => l.includes("SSID")) || "";
    const parseSSID = SSID.split(":").pop().trim();
    return parseSSID;
  } catch {
    return "Unknown";
  }
}
function getWindowsIEEE8021x(connectionType, iface, ifaces) {
  const i8021x = {
    state: "Unknown",
    protocol: "Unknown"
  };
  if (ifaces === "Disabled") {
    i8021x.state = "Disabled";
    i8021x.protocol = "Not defined";
    return i8021x;
  }
  if (connectionType === "wired" && ifaces.length > 0) {
    try {
      const iface8021xInfo = ifaces.find((element) => {
        return element.includes(iface + "\r\n");
      });
      const arrayIface8021xInfo = iface8021xInfo.split("\r\n");
      const state8021x = arrayIface8021xInfo.find((element) => {
        return element.includes("802.1x");
      });
      if (state8021x.includes("Disabled")) {
        i8021x.state = "Disabled";
        i8021x.protocol = "Not defined";
      } else if (state8021x.includes("Enabled")) {
        const protocol8021x = arrayIface8021xInfo.find((element) => {
          return element.includes("EAP");
        });
        i8021x.protocol = protocol8021x.split(":").pop();
        i8021x.state = "Enabled";
      }
    } catch {
      return i8021x;
    }
  } else if (connectionType === "wireless") {
    let i8021xState = "";
    let i8021xProtocol = "";
    try {
      const SSID = getWindowsWirelessIfaceSSID(iface);
      if (SSID !== "Unknown") {
        const ifaceSanitized = util$a.sanitizeString(SSID);
        const profiles = execFileSync("netsh", ["wlan", "show", "profiles", ifaceSanitized], util$a.execOptsWin).toString().split("\r\n");
        i8021xState = (profiles.find((l) => l.indexOf("802.1X") >= 0) || "").trim();
        i8021xProtocol = (profiles.find((l) => l.indexOf("EAP") >= 0) || "").trim();
      }
      if (i8021xState.includes(":") && i8021xProtocol.includes(":")) {
        i8021x.state = i8021xState.split(":").pop();
        i8021x.protocol = i8021xProtocol.split(":").pop();
      }
    } catch (error) {
      if (error.status === 1 && error.stdout.includes("AutoConfig")) {
        i8021x.state = "Disabled";
        i8021x.protocol = "Not defined";
      }
      return i8021x;
    }
  }
  return i8021x;
}
function splitSectionsNics(lines) {
  const result = [];
  let section = [];
  lines.forEach((line) => {
    if (!line.startsWith("	") && !line.startsWith(" ")) {
      if (section.length) {
        result.push(section);
        section = [];
      }
    }
    section.push(line);
  });
  if (section.length) {
    result.push(section);
  }
  return result;
}
function parseLinesDarwinNics(sections) {
  const nics = [];
  sections.forEach((section) => {
    const nic = {
      iface: "",
      mtu: null,
      mac: "",
      ip6: "",
      ip4: "",
      speed: null,
      type: "",
      operstate: "",
      duplex: "",
      internal: false
    };
    const first = section[0];
    nic.iface = first.split(":")[0].trim();
    const parts = first.split("> mtu");
    nic.mtu = parts.length > 1 ? parseInt(parts[1], 10) : null;
    if (isNaN(nic.mtu)) {
      nic.mtu = null;
    }
    nic.internal = parts[0].toLowerCase().indexOf("loopback") > -1;
    section.forEach((line) => {
      if (line.trim().startsWith("ether ")) {
        nic.mac = line.split("ether ")[1].toLowerCase().trim();
      }
      if (line.trim().startsWith("inet6 ") && !nic.ip6) {
        nic.ip6 = line.split("inet6 ")[1].toLowerCase().split("%")[0].split(" ")[0];
      }
      if (line.trim().startsWith("inet ") && !nic.ip4) {
        nic.ip4 = line.split("inet ")[1].toLowerCase().split(" ")[0];
      }
    });
    let speed = util$a.getValue(section, "link rate");
    nic.speed = speed ? parseFloat(speed) : null;
    if (nic.speed === null) {
      speed = util$a.getValue(section, "uplink rate");
      nic.speed = speed ? parseFloat(speed) : null;
      if (nic.speed !== null && speed.toLowerCase().indexOf("gbps") >= 0) {
        nic.speed = nic.speed * 1e3;
      }
    } else {
      if (speed.toLowerCase().indexOf("gbps") >= 0) {
        nic.speed = nic.speed * 1e3;
      }
    }
    nic.type = util$a.getValue(section, "type").toLowerCase().indexOf("wi-fi") > -1 ? "wireless" : "wired";
    const operstate = util$a.getValue(section, "status").toLowerCase();
    nic.operstate = operstate === "active" ? "up" : operstate === "inactive" ? "down" : "unknown";
    nic.duplex = util$a.getValue(section, "media").toLowerCase().indexOf("half-duplex") > -1 ? "half" : "full";
    if (nic.ip6 || nic.ip4 || nic.mac) {
      nics.push(nic);
    }
  });
  return nics;
}
function getDarwinNics() {
  const cmd = "/sbin/ifconfig -v";
  try {
    const lines = execSync$4(cmd, { maxBuffer: 1024 * 102400 }).toString().split("\n");
    const nsections = splitSectionsNics(lines);
    return parseLinesDarwinNics(nsections);
  } catch {
    return [];
  }
}
function getLinuxIfaceConnectionName(interfaceName) {
  try {
    const output = execFileSync("nmcli", ["device", "status"], { ...util$a.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString();
    const result = util$a.grep(output, interfaceName);
    const resultFormat = result.replace(/\s+/g, " ").trim();
    const connectionNameLines = resultFormat.split(" ").slice(3);
    const connectionName = connectionNameLines.join(" ");
    const connectionNameSanitized = util$a.sanitizeString(connectionName, false);
    return connectionNameSanitized !== "--" ? connectionNameSanitized : "";
  } catch {
    return "";
  }
}
function checkLinuxDCHPInterfaces(file, depth) {
  let result = [];
  depth = depth || 0;
  if (depth > 10) {
    return result;
  }
  try {
    const content = readFileSync(file, { encoding: "utf8" });
    const lines = content.split("\n").filter((l) => /iface|source/.test(l));
    lines.forEach((line) => {
      const parts = line.replace(/\s+/g, " ").trim().split(" ");
      if (parts.length >= 4) {
        if (line.toLowerCase().indexOf(" inet ") >= 0 && line.toLowerCase().indexOf("dhcp") >= 0) {
          result.push(parts[1]);
        }
      }
      if (line.toLowerCase().includes("source")) {
        const file2 = line.split(" ")[1];
        result = result.concat(checkLinuxDCHPInterfaces(file2, depth + 1));
      }
    });
  } catch {
    util$a.noop();
  }
  return result;
}
function getLinuxDHCPNics() {
  const cmd = "ip a 2> /dev/null";
  let result = [];
  try {
    const lines = execSync$4(cmd, util$a.execOptsLinux).toString().split("\n");
    const nsections = splitSectionsNics(lines);
    result = parseLinuxDHCPNics(nsections);
  } catch {
    util$a.noop();
  }
  try {
    result = checkLinuxDCHPInterfaces("/etc/network/interfaces");
  } catch {
    util$a.noop();
  }
  return result;
}
function parseLinuxDHCPNics(sections) {
  const result = [];
  if (sections && sections.length) {
    sections.forEach((lines) => {
      if (lines && lines.length) {
        const parts = lines[0].split(":");
        if (parts.length > 2) {
          for (let line of lines) {
            if (line.indexOf(" inet ") >= 0 && line.indexOf(" dynamic ") >= 0) {
              const parts2 = line.split(" ");
              const nic = parts2[parts2.length - 1].trim();
              result.push(nic);
              break;
            }
          }
        }
      }
    });
  }
  return result;
}
function getLinuxIfaceDHCPstatus(iface, connectionName, DHCPNics) {
  let result = false;
  if (connectionName) {
    try {
      const output = execFileSync("nmcli", ["connection", "show", connectionName], { ...util$a.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString();
      const lines = util$a.grep(output, "ipv4.method");
      const resultFormat = lines.replace(/\s+/g, " ").trim();
      const dhcStatus = resultFormat.split(" ").slice(1).toString();
      switch (dhcStatus) {
        case "auto":
          result = true;
          break;
        default:
          result = false;
          break;
      }
      return result;
    } catch {
      return DHCPNics.indexOf(iface) >= 0;
    }
  } else {
    return DHCPNics.indexOf(iface) >= 0;
  }
}
function getDarwinIfaceDHCPstatus(iface) {
  let result = false;
  try {
    const output = execFileSync("ipconfig", ["getpacket", iface], { ...util$a.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString();
    const lines = util$a.grep(output, "lease_time");
    if (lines.length && lines[0].startsWith("lease_time")) {
      result = true;
    }
  } catch {
    util$a.noop();
  }
  return result;
}
function getLinuxIfaceDNSsuffix(connectionName) {
  if (connectionName) {
    try {
      const output = execFileSync("nmcli", ["connection", "show", connectionName], { ...util$a.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString();
      const result = util$a.grep(output, "ipv4.dns-search");
      const resultFormat = result.replace(/\s+/g, " ").trim();
      const dnsSuffix = resultFormat.split(" ").slice(1).toString();
      return dnsSuffix === "--" ? "Not defined" : dnsSuffix;
    } catch {
      return "Unknown";
    }
  } else {
    return "Unknown";
  }
}
function getLinuxIfaceIEEE8021xAuth(connectionName) {
  if (connectionName) {
    try {
      const output = execFileSync("nmcli", ["connection", "show", connectionName], { ...util$a.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString();
      const result = util$a.grep(output, "802-1x.eap");
      const resultFormat = result.replace(/\s+/g, " ").trim();
      const authenticationProtocol = resultFormat.split(" ").slice(1).toString();
      return authenticationProtocol === "--" ? "" : authenticationProtocol;
    } catch {
      return "Not defined";
    }
  } else {
    return "Not defined";
  }
}
function getLinuxIfaceIEEE8021xState(authenticationProtocol) {
  if (authenticationProtocol) {
    if (authenticationProtocol === "Not defined") {
      return "Disabled";
    }
    return "Enabled";
  } else {
    return "Unknown";
  }
}
function testVirtualNic(iface, ifaceName, mac) {
  const virtualMacs = [
    "00:00:00:00:00:00",
    "00:03:FF",
    "00:05:69",
    "00:0C:29",
    "00:0F:4B",
    "00:13:07",
    "00:13:BE",
    "00:15:5d",
    "00:16:3E",
    "00:1C:42",
    "00:21:F6",
    "00:24:0B",
    "00:50:56",
    "00:A0:B1",
    "00:E0:C8",
    "08:00:27",
    "0A:00:27",
    "18:92:2C",
    "16:DF:49",
    "3C:F3:92",
    "54:52:00",
    "FC:15:97"
  ];
  if (mac) {
    return virtualMacs.filter((item) => {
      return mac.toUpperCase().toUpperCase().startsWith(item.substring(0, mac.length));
    }).length > 0 || iface.toLowerCase().indexOf(" virtual ") > -1 || ifaceName.toLowerCase().indexOf(" virtual ") > -1 || iface.toLowerCase().indexOf("vethernet ") > -1 || ifaceName.toLowerCase().indexOf("vethernet ") > -1 || iface.toLowerCase().startsWith("veth") || ifaceName.toLowerCase().startsWith("veth") || iface.toLowerCase().startsWith("vboxnet") || ifaceName.toLowerCase().startsWith("vboxnet");
  } else {
    return false;
  }
}
function networkInterfaces(callback, rescan, defaultString) {
  if (typeof callback === "string") {
    defaultString = callback;
    rescan = true;
    callback = null;
  }
  if (typeof callback === "boolean") {
    rescan = callback;
    callback = null;
    defaultString = "";
  }
  if (typeof rescan === "undefined") {
    rescan = true;
  }
  defaultString = defaultString || "";
  defaultString = "" + defaultString;
  return new Promise((resolve) => {
    process.nextTick(() => {
      const ifaces = os$3.networkInterfaces();
      let result = [];
      let nics = [];
      let dnsSuffixes = [];
      let nics8021xInfo = [];
      if (_darwin$8 || _freebsd$7 || _openbsd$7 || _netbsd$7) {
        if (JSON.stringify(ifaces) === JSON.stringify(_ifaces) && !rescan) {
          result = _networkInterfaces;
          if (callback) {
            callback(result);
          }
          resolve(result);
        } else {
          const defaultInterface = getDefaultNetworkInterface();
          _ifaces = JSON.parse(JSON.stringify(ifaces));
          nics = getDarwinNics();
          nics.forEach((nic) => {
            let ip4link = "";
            let ip4linksubnet = "";
            let ip6link = "";
            let ip6linksubnet = "";
            nic.ip4 = "";
            nic.ip6 = "";
            if ({}.hasOwnProperty.call(ifaces, nic.iface)) {
              ifaces[nic.iface].forEach((details) => {
                if (details.family === "IPv4" || details.family === 4) {
                  if (!nic.ip4 && !nic.ip4.match(/^169.254/i)) {
                    nic.ip4 = details.address;
                    nic.ip4subnet = details.netmask;
                  }
                  if (nic.ip4.match(/^169.254/i)) {
                    ip4link = details.address;
                    ip4linksubnet = details.netmask;
                  }
                }
                if (details.family === "IPv6" || details.family === 6) {
                  if (!nic.ip6 && !nic.ip6.match(/^fe80::/i)) {
                    nic.ip6 = details.address;
                    nic.ip6subnet = details.netmask;
                  }
                  if (nic.ip6.match(/^fe80::/i)) {
                    ip6link = details.address;
                    ip6linksubnet = details.netmask;
                  }
                }
              });
            }
            if (!nic.ip4 && ip4link) {
              nic.ip4 = ip4link;
              nic.ip4subnet = ip4linksubnet;
            }
            if (!nic.ip6 && ip6link) {
              nic.ip6 = ip6link;
              nic.ip6subnet = ip6linksubnet;
            }
            const ifaceSanitized = util$a.sanitizeString(nic.iface);
            result.push({
              iface: nic.iface,
              ifaceName: nic.iface,
              default: nic.iface === defaultInterface,
              ip4: nic.ip4,
              ip4subnet: nic.ip4subnet || "",
              ip6: nic.ip6,
              ip6subnet: nic.ip6subnet || "",
              mac: nic.mac,
              internal: nic.internal,
              virtual: nic.internal ? false : testVirtualNic(nic.iface, nic.iface, nic.mac),
              operstate: nic.operstate,
              type: nic.type,
              duplex: nic.duplex,
              mtu: nic.mtu,
              speed: nic.speed,
              dhcp: getDarwinIfaceDHCPstatus(ifaceSanitized),
              dnsSuffix: "",
              ieee8021xAuth: "",
              ieee8021xState: "",
              carrierChanges: 0
            });
          });
          _networkInterfaces = result;
          if (defaultString.toLowerCase().indexOf("default") >= 0) {
            result = result.filter((item) => item.default);
            if (result.length > 0) {
              result = result[0];
            } else {
              result = [];
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_linux$8) {
        if (JSON.stringify(ifaces) === JSON.stringify(_ifaces) && !rescan) {
          result = _networkInterfaces;
          if (callback) {
            callback(result);
          }
          resolve(result);
        } else {
          _ifaces = JSON.parse(JSON.stringify(ifaces));
          _dhcpNics = getLinuxDHCPNics();
          const defaultInterface = getDefaultNetworkInterface();
          for (let dev in ifaces) {
            let ip4 = "";
            let ip4subnet = "";
            let ip6 = "";
            let ip6subnet = "";
            let mac = "";
            let duplex = "";
            let mtu = "";
            let speed = null;
            let carrierChanges = 0;
            let dhcp = false;
            let dnsSuffix = "";
            let ieee8021xAuth = "";
            let ieee8021xState = "";
            let type = "";
            let ip4link = "";
            let ip4linksubnet = "";
            let ip6link = "";
            let ip6linksubnet = "";
            if ({}.hasOwnProperty.call(ifaces, dev)) {
              const ifaceName = dev;
              ifaces[dev].forEach((details) => {
                if (details.family === "IPv4" || details.family === 4) {
                  if (!ip4 && !ip4.match(/^169.254/i)) {
                    ip4 = details.address;
                    ip4subnet = details.netmask;
                  }
                  if (ip4.match(/^169.254/i)) {
                    ip4link = details.address;
                    ip4linksubnet = details.netmask;
                  }
                }
                if (details.family === "IPv6" || details.family === 6) {
                  if (!ip6 && !ip6.match(/^fe80::/i)) {
                    ip6 = details.address;
                    ip6subnet = details.netmask;
                  }
                  if (ip6.match(/^fe80::/i)) {
                    ip6link = details.address;
                    ip6linksubnet = details.netmask;
                  }
                }
                mac = details.mac;
                const nodeMainVersion = parseInt(process.versions.node.split("."), 10);
                if (mac.indexOf("00:00:0") > -1 && (_linux$8 || _darwin$8) && !details.internal && nodeMainVersion >= 8 && nodeMainVersion <= 11) {
                  if (Object.keys(_mac).length === 0) {
                    _mac = getMacAddresses();
                  }
                  mac = _mac[dev] || "";
                }
              });
              if (!ip4 && ip4link) {
                ip4 = ip4link;
                ip4subnet = ip4linksubnet;
              }
              if (!ip6 && ip6link) {
                ip6 = ip6link;
                ip6subnet = ip6linksubnet;
              }
              const iface = dev.split(":")[0].trim();
              const ifaceSanitized = util$a.sanitizeString(iface, true);
              const cmd = `echo -n "addr_assign_type: "; cat /sys/class/net/${ifaceSanitized}/addr_assign_type 2>/dev/null; echo;
            echo -n "address: "; cat /sys/class/net/${ifaceSanitized}/address 2>/dev/null; echo;
            echo -n "addr_len: "; cat /sys/class/net/${ifaceSanitized}/addr_len 2>/dev/null; echo;
            echo -n "broadcast: "; cat /sys/class/net/${ifaceSanitized}/broadcast 2>/dev/null; echo;
            echo -n "carrier: "; cat /sys/class/net/${ifaceSanitized}/carrier 2>/dev/null; echo;
            echo -n "carrier_changes: "; cat /sys/class/net/${ifaceSanitized}/carrier_changes 2>/dev/null; echo;
            echo -n "dev_id: "; cat /sys/class/net/${ifaceSanitized}/dev_id 2>/dev/null; echo;
            echo -n "dev_port: "; cat /sys/class/net/${ifaceSanitized}/dev_port 2>/dev/null; echo;
            echo -n "dormant: "; cat /sys/class/net/${ifaceSanitized}/dormant 2>/dev/null; echo;
            echo -n "duplex: "; cat /sys/class/net/${ifaceSanitized}/duplex 2>/dev/null; echo;
            echo -n "flags: "; cat /sys/class/net/${ifaceSanitized}/flags 2>/dev/null; echo;
            echo -n "gro_flush_timeout: "; cat /sys/class/net/${ifaceSanitized}/gro_flush_timeout 2>/dev/null; echo;
            echo -n "ifalias: "; cat /sys/class/net/${ifaceSanitized}/ifalias 2>/dev/null; echo;
            echo -n "ifindex: "; cat /sys/class/net/${ifaceSanitized}/ifindex 2>/dev/null; echo;
            echo -n "iflink: "; cat /sys/class/net/${ifaceSanitized}/iflink 2>/dev/null; echo;
            echo -n "link_mode: "; cat /sys/class/net/${ifaceSanitized}/link_mode 2>/dev/null; echo;
            echo -n "mtu: "; cat /sys/class/net/${ifaceSanitized}/mtu 2>/dev/null; echo;
            echo -n "netdev_group: "; cat /sys/class/net/${ifaceSanitized}/netdev_group 2>/dev/null; echo;
            echo -n "operstate: "; cat /sys/class/net/${ifaceSanitized}/operstate 2>/dev/null; echo;
            echo -n "proto_down: "; cat /sys/class/net/${ifaceSanitized}/proto_down 2>/dev/null; echo;
            echo -n "speed: "; cat /sys/class/net/${ifaceSanitized}/speed 2>/dev/null; echo;
            echo -n "tx_queue_len: "; cat /sys/class/net/${ifaceSanitized}/tx_queue_len 2>/dev/null; echo;
            echo -n "type: "; cat /sys/class/net/${ifaceSanitized}/type 2>/dev/null; echo;
            echo -n "wireless: "; cat /proc/net/wireless 2>/dev/null | grep ${ifaceSanitized}; echo;
            echo -n "wirelessspeed: "; iw dev ${ifaceSanitized} link 2>&1 | grep bitrate; echo;`;
              let lines = [];
              try {
                lines = execSync$4(cmd, util$a.execOptsLinux).toString().split("\n");
                const connectionName = getLinuxIfaceConnectionName(ifaceSanitized);
                dhcp = getLinuxIfaceDHCPstatus(ifaceSanitized, connectionName, _dhcpNics);
                dnsSuffix = getLinuxIfaceDNSsuffix(connectionName);
                ieee8021xAuth = getLinuxIfaceIEEE8021xAuth(connectionName);
                ieee8021xState = getLinuxIfaceIEEE8021xState(ieee8021xAuth);
              } catch {
                util$a.noop();
              }
              duplex = util$a.getValue(lines, "duplex");
              duplex = duplex.startsWith("cat") ? "" : duplex;
              mtu = parseInt(util$a.getValue(lines, "mtu"), 10);
              let myspeed = parseInt(util$a.getValue(lines, "speed"), 10);
              speed = isNaN(myspeed) ? null : myspeed;
              const wirelessspeed = util$a.getValue(lines, "tx bitrate");
              if (speed === null && wirelessspeed) {
                myspeed = parseFloat(wirelessspeed);
                speed = isNaN(myspeed) ? null : myspeed;
              }
              carrierChanges = parseInt(util$a.getValue(lines, "carrier_changes"), 10);
              const operstate = util$a.getValue(lines, "operstate");
              type = operstate === "up" ? util$a.getValue(lines, "wireless").trim() ? "wireless" : "wired" : "unknown";
              if (ifaceSanitized === "lo" || ifaceSanitized.startsWith("bond")) {
                type = "virtual";
              }
              let internal = ifaces[dev] && ifaces[dev][0] ? ifaces[dev][0].internal : false;
              if (dev.toLowerCase().indexOf("loopback") > -1 || ifaceName.toLowerCase().indexOf("loopback") > -1) {
                internal = true;
              }
              const virtual = internal ? false : testVirtualNic(dev, ifaceName, mac);
              result.push({
                iface: ifaceSanitized,
                ifaceName,
                default: iface === defaultInterface,
                ip4,
                ip4subnet,
                ip6,
                ip6subnet,
                mac,
                internal,
                virtual,
                operstate,
                type,
                duplex,
                mtu,
                speed,
                dhcp,
                dnsSuffix,
                ieee8021xAuth,
                ieee8021xState,
                carrierChanges
              });
            }
          }
          _networkInterfaces = result;
          if (defaultString.toLowerCase().indexOf("default") >= 0) {
            result = result.filter((item) => item.default);
            if (result.length > 0) {
              result = result[0];
            } else {
              result = [];
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_windows$9) {
        if (JSON.stringify(ifaces) === JSON.stringify(_ifaces) && !rescan) {
          result = _networkInterfaces;
          if (callback) {
            callback(result);
          }
          resolve(result);
        } else {
          _ifaces = JSON.parse(JSON.stringify(ifaces));
          const defaultInterface = getDefaultNetworkInterface();
          getWindowsNics().then((nics2) => {
            nics2.forEach((nic) => {
              let found = false;
              Object.keys(ifaces).forEach((key) => {
                if (!found) {
                  ifaces[key].forEach((value) => {
                    if (Object.keys(value).indexOf("mac") >= 0) {
                      found = value["mac"] === nic.mac;
                    }
                  });
                }
              });
              if (!found) {
                ifaces[nic.name] = [{ mac: nic.mac }];
              }
            });
            nics8021xInfo = getWindowsWiredProfilesInformation();
            dnsSuffixes = getWindowsDNSsuffixes();
            for (let dev in ifaces) {
              const ifaceSanitized = util$a.sanitizeString(dev);
              let iface = dev;
              let ip4 = "";
              let ip4subnet = "";
              let ip6 = "";
              let ip6subnet = "";
              let mac = "";
              let duplex = "";
              let mtu = "";
              let speed = null;
              let carrierChanges = 0;
              let operstate = "down";
              let dhcp = false;
              let dnsSuffix = "";
              let ieee8021xAuth = "";
              let ieee8021xState = "";
              let type = "";
              if ({}.hasOwnProperty.call(ifaces, dev)) {
                let ifaceName = dev;
                ifaces[dev].forEach((details) => {
                  if (details.family === "IPv4" || details.family === 4) {
                    ip4 = details.address;
                    ip4subnet = details.netmask;
                  }
                  if (details.family === "IPv6" || details.family === 6) {
                    if (!ip6 || ip6.match(/^fe80::/i)) {
                      ip6 = details.address;
                      ip6subnet = details.netmask;
                    }
                  }
                  mac = details.mac;
                  const nodeMainVersion = parseInt(process.versions.node.split("."), 10);
                  if (mac.indexOf("00:00:0") > -1 && (_linux$8 || _darwin$8) && !details.internal && nodeMainVersion >= 8 && nodeMainVersion <= 11) {
                    if (Object.keys(_mac).length === 0) {
                      _mac = getMacAddresses();
                    }
                    mac = _mac[dev] || "";
                  }
                });
                dnsSuffix = getWindowsIfaceDNSsuffix(dnsSuffixes.ifaces, ifaceSanitized);
                let foundFirst = false;
                nics2.forEach((detail) => {
                  if (detail.mac === mac && !foundFirst) {
                    iface = detail.iface || iface;
                    ifaceName = detail.name;
                    dhcp = detail.dhcp;
                    operstate = detail.operstate;
                    speed = operstate === "up" ? detail.speed : 0;
                    type = detail.type;
                    foundFirst = true;
                  }
                });
                if (dev.toLowerCase().indexOf("wlan") >= 0 || ifaceName.toLowerCase().indexOf("wlan") >= 0 || ifaceName.toLowerCase().indexOf("802.11n") >= 0 || ifaceName.toLowerCase().indexOf("wireless") >= 0 || ifaceName.toLowerCase().indexOf("wi-fi") >= 0 || ifaceName.toLowerCase().indexOf("wifi") >= 0) {
                  type = "wireless";
                }
                const IEEE8021x = getWindowsIEEE8021x(type, ifaceSanitized, nics8021xInfo);
                ieee8021xAuth = IEEE8021x.protocol;
                ieee8021xState = IEEE8021x.state;
                let internal = ifaces[dev] && ifaces[dev][0] ? ifaces[dev][0].internal : false;
                if (dev.toLowerCase().indexOf("loopback") > -1 || ifaceName.toLowerCase().indexOf("loopback") > -1) {
                  internal = true;
                }
                const virtual = internal ? false : testVirtualNic(dev, ifaceName, mac);
                result.push({
                  iface,
                  ifaceName,
                  default: iface === defaultInterface,
                  ip4,
                  ip4subnet,
                  ip6,
                  ip6subnet,
                  mac,
                  internal,
                  virtual,
                  operstate,
                  type,
                  duplex,
                  mtu,
                  speed,
                  dhcp,
                  dnsSuffix,
                  ieee8021xAuth,
                  ieee8021xState,
                  carrierChanges
                });
              }
            }
            _networkInterfaces = result;
            if (defaultString.toLowerCase().indexOf("default") >= 0) {
              result = result.filter((item) => item.default);
              if (result.length > 0) {
                result = result[0];
              } else {
                result = [];
              }
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        }
      }
    });
  });
}
network.networkInterfaces = networkInterfaces;
function calcNetworkSpeed(iface, rx_bytes, tx_bytes, operstate, rx_dropped, rx_errors, tx_dropped, tx_errors) {
  const result = {
    iface,
    operstate,
    rx_bytes,
    rx_dropped,
    rx_errors,
    tx_bytes,
    tx_dropped,
    tx_errors,
    rx_sec: null,
    tx_sec: null,
    ms: 0
  };
  if (_network[iface] && _network[iface].ms) {
    result.ms = Date.now() - _network[iface].ms;
    result.rx_sec = rx_bytes - _network[iface].rx_bytes >= 0 ? (rx_bytes - _network[iface].rx_bytes) / (result.ms / 1e3) : 0;
    result.tx_sec = tx_bytes - _network[iface].tx_bytes >= 0 ? (tx_bytes - _network[iface].tx_bytes) / (result.ms / 1e3) : 0;
    _network[iface].rx_bytes = rx_bytes;
    _network[iface].tx_bytes = tx_bytes;
    _network[iface].rx_sec = result.rx_sec;
    _network[iface].tx_sec = result.tx_sec;
    _network[iface].ms = Date.now();
    _network[iface].last_ms = result.ms;
    _network[iface].operstate = operstate;
  } else {
    if (!_network[iface]) {
      _network[iface] = {};
    }
    _network[iface].rx_bytes = rx_bytes;
    _network[iface].tx_bytes = tx_bytes;
    _network[iface].rx_sec = null;
    _network[iface].tx_sec = null;
    _network[iface].ms = Date.now();
    _network[iface].last_ms = 0;
    _network[iface].operstate = operstate;
  }
  return result;
}
function networkStats(ifaces, callback) {
  let ifacesArray = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (util$a.isFunction(ifaces) && !callback) {
        callback = ifaces;
        ifacesArray = [getDefaultNetworkInterface()];
      } else {
        if (typeof ifaces !== "string" && ifaces !== void 0) {
          if (callback) {
            callback([]);
          }
          return resolve([]);
        }
        ifaces = ifaces || getDefaultNetworkInterface();
        try {
          ifaces.__proto__.toLowerCase = util$a.stringToLower;
          ifaces.__proto__.replace = util$a.stringReplace;
          ifaces.__proto__.toString = util$a.stringToString;
          ifaces.__proto__.substr = util$a.stringSubstr;
          ifaces.__proto__.substring = util$a.stringSubstring;
          ifaces.__proto__.trim = util$a.stringTrim;
          ifaces.__proto__.startsWith = util$a.stringStartWith;
        } catch {
          Object.setPrototypeOf(ifaces, util$a.stringObj);
        }
        ifaces = ifaces.trim().replace(/,+/g, "|");
        ifacesArray = ifaces.split("|");
      }
      const result = [];
      const workload = [];
      if (ifacesArray.length && ifacesArray[0].trim() === "*") {
        ifacesArray = [];
        networkInterfaces(false).then((allIFaces) => {
          for (let iface of allIFaces) {
            ifacesArray.push(iface.iface);
          }
          networkStats(ifacesArray.join(",")).then((result2) => {
            if (callback) {
              callback(result2);
            }
            resolve(result2);
          });
        });
      } else {
        for (let iface of ifacesArray) {
          workload.push(networkStatsSingle(iface.trim()));
        }
        if (workload.length) {
          Promise.all(workload).then((data) => {
            if (callback) {
              callback(data);
            }
            resolve(data);
          });
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
function networkStatsSingle(iface) {
  function parseLinesWindowsPerfData(sections) {
    const perfData = [];
    for (let i in sections) {
      if ({}.hasOwnProperty.call(sections, i)) {
        if (sections[i].trim() !== "") {
          const lines = sections[i].trim().split("\r\n");
          perfData.push({
            name: util$a.getValue(lines, "Name", ":").toLowerCase(),
            desc: util$a.getValue(lines, "InterfaceDescription", ":").replace(/[()[\] ]+/g, "").replace(/#|\//g, "_").toLowerCase(),
            rx_bytes: parseInt(util$a.getValue(lines, "ReceivedBytes", ":"), 10),
            rx_errors: parseInt(util$a.getValue(lines, "ReceivedPacketErrors", ":"), 10),
            rx_dropped: parseInt(util$a.getValue(lines, "ReceivedDiscardedPackets", ":"), 10),
            tx_bytes: parseInt(util$a.getValue(lines, "SentBytes", ":"), 10),
            tx_errors: parseInt(util$a.getValue(lines, "OutboundPacketErrors", ":"), 10),
            tx_dropped: parseInt(util$a.getValue(lines, "OutboundDiscardedPackets", ":"), 10)
          });
        }
      }
    }
    return perfData;
  }
  return new Promise((resolve) => {
    process.nextTick(() => {
      const ifaceSanitized = util$a.sanitizeString(iface, true);
      let result = {
        iface: ifaceSanitized,
        operstate: "unknown",
        rx_bytes: 0,
        rx_dropped: 0,
        rx_errors: 0,
        tx_bytes: 0,
        tx_dropped: 0,
        tx_errors: 0,
        rx_sec: null,
        tx_sec: null,
        ms: 0
      };
      let operstate = "unknown";
      let rx_bytes = 0;
      let tx_bytes = 0;
      let rx_dropped = 0;
      let rx_errors = 0;
      let tx_dropped = 0;
      let tx_errors = 0;
      let cmd, lines, stats;
      if (!_network[ifaceSanitized] || _network[ifaceSanitized] && !_network[ifaceSanitized].ms || _network[ifaceSanitized] && _network[ifaceSanitized].ms && Date.now() - _network[ifaceSanitized].ms >= 500) {
        if (_linux$8) {
          if (fs$2.existsSync("/sys/class/net/" + ifaceSanitized)) {
            cmd = "cat /sys/class/net/" + ifaceSanitized + "/operstate; cat /sys/class/net/" + ifaceSanitized + "/statistics/rx_bytes; cat /sys/class/net/" + ifaceSanitized + "/statistics/tx_bytes; cat /sys/class/net/" + ifaceSanitized + "/statistics/rx_dropped; cat /sys/class/net/" + ifaceSanitized + "/statistics/rx_errors; cat /sys/class/net/" + ifaceSanitized + "/statistics/tx_dropped; cat /sys/class/net/" + ifaceSanitized + "/statistics/tx_errors; ";
            exec$8(cmd, (error, stdout) => {
              if (!error) {
                lines = stdout.toString().split("\n");
                operstate = lines[0].trim();
                rx_bytes = parseInt(lines[1], 10);
                tx_bytes = parseInt(lines[2], 10);
                rx_dropped = parseInt(lines[3], 10);
                rx_errors = parseInt(lines[4], 10);
                tx_dropped = parseInt(lines[5], 10);
                tx_errors = parseInt(lines[6], 10);
                result = calcNetworkSpeed(ifaceSanitized, rx_bytes, tx_bytes, operstate, rx_dropped, rx_errors, tx_dropped, tx_errors);
              }
              resolve(result);
            });
          } else {
            resolve(result);
          }
        }
        if (_freebsd$7 || _openbsd$7 || _netbsd$7) {
          cmd = "netstat -ibndI " + ifaceSanitized;
          exec$8(cmd, (error, stdout) => {
            if (!error) {
              lines = stdout.toString().split("\n");
              for (let i = 1; i < lines.length; i++) {
                const line = lines[i].replace(/ +/g, " ").split(" ");
                if (line && line[0] && line[7] && line[10]) {
                  rx_bytes = rx_bytes + parseInt(line[7]);
                  if (line[6].trim() !== "-") {
                    rx_dropped = rx_dropped + parseInt(line[6]);
                  }
                  if (line[5].trim() !== "-") {
                    rx_errors = rx_errors + parseInt(line[5]);
                  }
                  tx_bytes = tx_bytes + parseInt(line[10]);
                  if (line[12] && line[12].trim() !== "-") {
                    tx_dropped = tx_dropped + parseInt(line[12]);
                  }
                  if (line[9].trim() !== "-") {
                    tx_errors = tx_errors + parseInt(line[9]);
                  }
                  operstate = "up";
                }
              }
              result = calcNetworkSpeed(ifaceSanitized, rx_bytes, tx_bytes, operstate, rx_dropped, rx_errors, tx_dropped, tx_errors);
            }
            resolve(result);
          });
        }
        if (_darwin$8) {
          cmd = "ifconfig " + ifaceSanitized + ' | grep "status"';
          exec$8(cmd, (error, stdout) => {
            result.operstate = (stdout.toString().split(":")[1] || "").trim();
            result.operstate = (result.operstate || "").toLowerCase();
            result.operstate = result.operstate === "active" ? "up" : result.operstate === "inactive" ? "down" : "unknown";
            cmd = "netstat -bdnI " + ifaceSanitized;
            exec$8(cmd, (error2, stdout2) => {
              if (!error2) {
                lines = stdout2.toString().split("\n");
                if (lines.length > 1 && lines[1].trim() !== "") {
                  stats = lines[1].replace(/ +/g, " ").split(" ");
                  const offset = stats.length > 11 ? 1 : 0;
                  rx_bytes = parseInt(stats[offset + 5]);
                  rx_dropped = parseInt(stats[offset + 10]);
                  rx_errors = parseInt(stats[offset + 4]);
                  tx_bytes = parseInt(stats[offset + 8]);
                  tx_dropped = parseInt(stats[offset + 10]);
                  tx_errors = parseInt(stats[offset + 7]);
                  result = calcNetworkSpeed(ifaceSanitized, rx_bytes, tx_bytes, result.operstate, rx_dropped, rx_errors, tx_dropped, tx_errors);
                }
              }
              resolve(result);
            });
          });
        }
        if (_windows$9) {
          let perfData = [];
          let ifaceName = ifaceSanitized;
          util$a.powerShell(
            "Get-NetAdapterStatistics | select Name,InterfaceDescription,ReceivedBytes,ReceivedPacketErrors,ReceivedDiscardedPackets,SentBytes,OutboundPacketErrors,OutboundDiscardedPackets | fl"
          ).then((stdout, error) => {
            if (!error) {
              const psections = stdout.toString().split(/\n\s*\n/);
              perfData = parseLinesWindowsPerfData(psections);
            }
            networkInterfaces(false).then((interfaces) => {
              rx_bytes = 0;
              tx_bytes = 0;
              perfData.forEach((detail) => {
                interfaces.forEach((det) => {
                  if ((det.iface.toLowerCase() === ifaceSanitized.toLowerCase() || det.mac.toLowerCase() === ifaceSanitized.toLowerCase() || det.ip4.toLowerCase() === ifaceSanitized.toLowerCase() || det.ip6.toLowerCase() === ifaceSanitized.toLowerCase() || det.ifaceName.replace(/[()[\] ]+/g, "").replace(/#|\//g, "_").toLowerCase() === ifaceSanitized.replace(/[()[\] ]+/g, "").replace("#", "_").toLowerCase()) && (det.iface.toLowerCase() === detail.name || det.ifaceName.replace(/[()[\] ]+/g, "").replace(/#|\//g, "_").toLowerCase() === detail.desc)) {
                    ifaceName = det.iface;
                    rx_bytes = detail.rx_bytes;
                    rx_dropped = detail.rx_dropped;
                    rx_errors = detail.rx_errors;
                    tx_bytes = detail.tx_bytes;
                    tx_dropped = detail.tx_dropped;
                    tx_errors = detail.tx_errors;
                    operstate = det.operstate;
                  }
                });
              });
              if (rx_bytes && tx_bytes) {
                result = calcNetworkSpeed(ifaceName, parseInt(rx_bytes), parseInt(tx_bytes), operstate, rx_dropped, rx_errors, tx_dropped, tx_errors);
              }
              resolve(result);
            });
          });
        }
      } else {
        result.rx_bytes = _network[ifaceSanitized].rx_bytes;
        result.tx_bytes = _network[ifaceSanitized].tx_bytes;
        result.rx_sec = _network[ifaceSanitized].rx_sec;
        result.tx_sec = _network[ifaceSanitized].tx_sec;
        result.ms = _network[ifaceSanitized].last_ms;
        result.operstate = _network[ifaceSanitized].operstate;
        resolve(result);
      }
    });
  });
}
network.networkStats = networkStats;
function getProcessName(processes2, pid) {
  let cmd = "";
  processes2.forEach((line) => {
    const parts = line.split(" ");
    const id = parseInt(parts[0], 10) || -1;
    if (id === pid) {
      parts.shift();
      cmd = parts.join(" ").split(":")[0];
    }
  });
  cmd = cmd.split(" -")[0];
  cmd = cmd.split(" /")[0];
  return cmd;
}
function networkConnections(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = [];
      if (_linux$8 || _freebsd$7 || _openbsd$7 || _netbsd$7) {
        let cmd = 'export LC_ALL=C; netstat -tunap | grep "ESTABLISHED\\|SYN_SENT\\|SYN_RECV\\|FIN_WAIT1\\|FIN_WAIT2\\|TIME_WAIT\\|CLOSE\\|CLOSE_WAIT\\|LAST_ACK\\|LISTEN\\|CLOSING\\|UNKNOWN"; unset LC_ALL';
        if (_freebsd$7 || _openbsd$7 || _netbsd$7) {
          cmd = 'export LC_ALL=C; netstat -na | grep "ESTABLISHED\\|SYN_SENT\\|SYN_RECV\\|FIN_WAIT1\\|FIN_WAIT2\\|TIME_WAIT\\|CLOSE\\|CLOSE_WAIT\\|LAST_ACK\\|LISTEN\\|CLOSING\\|UNKNOWN"; unset LC_ALL';
        }
        exec$8(cmd, { maxBuffer: 1024 * 102400 }, (error, stdout) => {
          let lines = stdout.toString().split("\n");
          if (!error && (lines.length > 1 || lines[0] !== "")) {
            lines.forEach((line) => {
              line = line.replace(/ +/g, " ").split(" ");
              if (line.length >= 7) {
                let localip = line[3];
                let localport = "";
                const localaddress = line[3].split(":");
                if (localaddress.length > 1) {
                  localport = localaddress[localaddress.length - 1];
                  localaddress.pop();
                  localip = localaddress.join(":");
                }
                let peerip = line[4];
                let peerport = "";
                const peeraddress = line[4].split(":");
                if (peeraddress.length > 1) {
                  peerport = peeraddress[peeraddress.length - 1];
                  peeraddress.pop();
                  peerip = peeraddress.join(":");
                }
                const connstate = line[5];
                const proc = line[6].split("/");
                if (connstate) {
                  result.push({
                    protocol: line[0],
                    localAddress: localip,
                    localPort: localport,
                    peerAddress: peerip,
                    peerPort: peerport,
                    state: connstate,
                    pid: proc[0] && proc[0] !== "-" ? parseInt(proc[0], 10) : null,
                    process: proc[1] ? proc[1].split(" ")[0].split(":")[0] : ""
                  });
                }
              }
            });
            if (callback) {
              callback(result);
            }
            resolve(result);
          } else {
            cmd = 'ss -tunap | grep "ESTAB\\|SYN-SENT\\|SYN-RECV\\|FIN-WAIT1\\|FIN-WAIT2\\|TIME-WAIT\\|CLOSE\\|CLOSE-WAIT\\|LAST-ACK\\|LISTEN\\|CLOSING"';
            exec$8(cmd, { maxBuffer: 1024 * 102400 }, (error2, stdout2) => {
              if (!error2) {
                const lines2 = stdout2.toString().split("\n");
                lines2.forEach((line) => {
                  line = line.replace(/ +/g, " ").split(" ");
                  if (line.length >= 6) {
                    let localip = line[4];
                    let localport = "";
                    const localaddress = line[4].split(":");
                    if (localaddress.length > 1) {
                      localport = localaddress[localaddress.length - 1];
                      localaddress.pop();
                      localip = localaddress.join(":");
                    }
                    let peerip = line[5];
                    let peerport = "";
                    const peeraddress = line[5].split(":");
                    if (peeraddress.length > 1) {
                      peerport = peeraddress[peeraddress.length - 1];
                      peeraddress.pop();
                      peerip = peeraddress.join(":");
                    }
                    let connstate = line[1];
                    if (connstate === "ESTAB") {
                      connstate = "ESTABLISHED";
                    }
                    if (connstate === "TIME-WAIT") {
                      connstate = "TIME_WAIT";
                    }
                    let pid = null;
                    let process2 = "";
                    if (line.length >= 7 && line[6].indexOf("users:") > -1) {
                      const proc = line[6].replace('users:(("', "").replace(/"/g, "").replace("pid=", "").split(",");
                      if (proc.length > 2) {
                        process2 = proc[0];
                        const pidValue = parseInt(proc[1], 10);
                        if (pidValue > 0) {
                          pid = pidValue;
                        }
                      }
                    }
                    if (connstate) {
                      result.push({
                        protocol: line[0],
                        localAddress: localip,
                        localPort: localport,
                        peerAddress: peerip,
                        peerPort: peerport,
                        state: connstate,
                        pid,
                        process: process2
                      });
                    }
                  }
                });
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          }
        });
      }
      if (_darwin$8) {
        const cmd = 'netstat -natvln | head -n2; netstat -natvln | grep "tcp4\\|tcp6\\|udp4\\|udp6"';
        const states = "ESTABLISHED|SYN_SENT|SYN_RECV|FIN_WAIT1|FIN_WAIT_1|FIN_WAIT2|FIN_WAIT_2|TIME_WAIT|CLOSE|CLOSE_WAIT|LAST_ACK|LISTEN|CLOSING|UNKNOWN".split("|");
        exec$8(cmd, { maxBuffer: 1024 * 102400 }, (error, stdout) => {
          if (!error) {
            exec$8("ps -axo pid,command", { maxBuffer: 1024 * 102400 }, (err2, stdout2) => {
              let processes2 = stdout2.toString().split("\n");
              processes2 = processes2.map((line) => {
                return line.trim().replace(/ +/g, " ");
              });
              const lines = stdout.toString().split("\n");
              lines.shift();
              let pidPos = 8;
              if (lines.length > 1 && lines[0].indexOf("pid") > 0) {
                const header = (lines.shift() || "").replace(/ Address/g, "_Address").replace(/process:/g, "").replace(/ +/g, " ").split(" ");
                pidPos = header.indexOf("pid");
              }
              lines.forEach((line) => {
                line = line.replace(/ +/g, " ").split(" ");
                if (line.length >= 8) {
                  let localip = line[3];
                  let localport = "";
                  const localaddress = line[3].split(".");
                  if (localaddress.length > 1) {
                    localport = localaddress[localaddress.length - 1];
                    localaddress.pop();
                    localip = localaddress.join(".");
                  }
                  let peerip = line[4];
                  let peerport = "";
                  const peeraddress = line[4].split(".");
                  if (peeraddress.length > 1) {
                    peerport = peeraddress[peeraddress.length - 1];
                    peeraddress.pop();
                    peerip = peeraddress.join(".");
                  }
                  const hasState = states.indexOf(line[5]) >= 0;
                  const connstate = hasState ? line[5] : "UNKNOWN";
                  let pidField = "";
                  if (line[line.length - 9] && line[line.length - 9].indexOf(":") >= 0) {
                    pidField = line[line.length - 9].split(":")[1];
                  } else {
                    pidField = line[pidPos + (hasState ? 0 : -1)] || "";
                    if (pidField.indexOf(":") >= 0) {
                      pidField = pidField.split(":")[1];
                    }
                  }
                  const pid = parseInt(pidField, 10);
                  if (connstate) {
                    result.push({
                      protocol: line[0],
                      localAddress: localip,
                      localPort: localport,
                      peerAddress: peerip,
                      peerPort: peerport,
                      state: connstate,
                      pid,
                      process: getProcessName(processes2, pid)
                    });
                  }
                }
              });
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        });
      }
      if (_windows$9) {
        let cmd = "netstat -nao";
        try {
          exec$8(cmd, util$a.execOptsWin, (error, stdout) => {
            if (!error) {
              let lines = stdout.toString().split("\r\n");
              lines.forEach((line) => {
                line = line.trim().replace(/ +/g, " ").split(" ");
                if (line.length >= 4) {
                  let localip = line[1];
                  let localport = "";
                  const localaddress = line[1].split(":");
                  if (localaddress.length > 1) {
                    localport = localaddress[localaddress.length - 1];
                    localaddress.pop();
                    localip = localaddress.join(":");
                  }
                  localip = localip.replace(/\[/g, "").replace(/\]/g, "");
                  let peerip = line[2];
                  let peerport = "";
                  const peeraddress = line[2].split(":");
                  if (peeraddress.length > 1) {
                    peerport = peeraddress[peeraddress.length - 1];
                    peeraddress.pop();
                    peerip = peeraddress.join(":");
                  }
                  peerip = peerip.replace(/\[/g, "").replace(/\]/g, "");
                  const pid = util$a.toInt(line[4]);
                  let connstate = line[3];
                  if (connstate === "HERGESTELLT") {
                    connstate = "ESTABLISHED";
                  }
                  if (connstate.startsWith("ABH")) {
                    connstate = "LISTEN";
                  }
                  if (connstate === "SCHLIESSEN_WARTEN") {
                    connstate = "CLOSE_WAIT";
                  }
                  if (connstate === "WARTEND") {
                    connstate = "TIME_WAIT";
                  }
                  if (connstate === "SYN_GESENDET") {
                    connstate = "SYN_SENT";
                  }
                  if (connstate === "LISTENING") {
                    connstate = "LISTEN";
                  }
                  if (connstate === "SYN_RECEIVED") {
                    connstate = "SYN_RECV";
                  }
                  if (connstate === "FIN_WAIT_1") {
                    connstate = "FIN_WAIT1";
                  }
                  if (connstate === "FIN_WAIT_2") {
                    connstate = "FIN_WAIT2";
                  }
                  if (line[0].toLowerCase() !== "udp" && connstate) {
                    result.push({
                      protocol: line[0].toLowerCase(),
                      localAddress: localip,
                      localPort: localport,
                      peerAddress: peerip,
                      peerPort: peerport,
                      state: connstate,
                      pid,
                      process: ""
                    });
                  } else if (line[0].toLowerCase() === "udp") {
                    result.push({
                      protocol: line[0].toLowerCase(),
                      localAddress: localip,
                      localPort: localport,
                      peerAddress: peerip,
                      peerPort: peerport,
                      state: "",
                      pid: parseInt(line[3], 10),
                      process: ""
                    });
                  }
                }
              });
              if (callback) {
                callback(result);
              }
              resolve(result);
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
network.networkConnections = networkConnections;
function networkGatewayDefault(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = "";
      if (_linux$8 || _freebsd$7 || _openbsd$7 || _netbsd$7) {
        const cmd = "ip route get 1";
        try {
          exec$8(cmd, { maxBuffer: 1024 * 102400 }, (error, stdout) => {
            if (!error) {
              let lines = stdout.toString().split("\n");
              const line = lines && lines[0] ? lines[0] : "";
              let parts = line.split(" via ");
              if (parts && parts[1]) {
                parts = parts[1].split(" ");
                result = parts[0];
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_darwin$8) {
        let cmd = "route -n get default";
        try {
          exec$8(cmd, { maxBuffer: 1024 * 102400 }, (error, stdout) => {
            if (!error) {
              const lines = stdout.toString().split("\n").map((line) => line.trim());
              result = util$a.getValue(lines, "gateway");
            }
            if (!result) {
              cmd = "netstat -rn | awk '/default/ {print $2}'";
              exec$8(cmd, { maxBuffer: 1024 * 102400 }, (error2, stdout2) => {
                const lines = stdout2.toString().split("\n").map((line) => line.trim());
                result = lines.find(
                  (line) => /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(line)
                );
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
      if (_windows$9) {
        try {
          exec$8("netstat -r", util$a.execOptsWin, (error, stdout) => {
            const lines = stdout.toString().split(os$3.EOL);
            lines.forEach((line) => {
              line = line.replace(/\s+/g, " ").trim();
              if (line.indexOf("0.0.0.0 0.0.0.0") > -1 && !/[a-zA-Z]/.test(line)) {
                const parts = line.split(" ");
                if (parts.length >= 5 && parts[parts.length - 3].indexOf(".") > -1) {
                  result = parts[parts.length - 3];
                }
              }
            });
            if (!result) {
              util$a.powerShell("Get-CimInstance -ClassName Win32_IP4RouteTable | Where-Object { $_.Destination -eq '0.0.0.0' -and $_.Mask -eq '0.0.0.0' }").then((data) => {
                let lines2 = data.toString().split("\r\n");
                if (lines2.length > 1 && !result) {
                  result = util$a.getValue(lines2, "NextHop");
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                }
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
network.networkGatewayDefault = networkGatewayDefault;
var wifi = {};
const os$2 = require$$0$1;
const exec$7 = require$$1$4.exec;
const execSync$3 = require$$1$4.execSync;
const util$9 = util$i;
const _platform$8 = process.platform;
const _linux$7 = _platform$8 === "linux" || _platform$8 === "android";
const _darwin$7 = _platform$8 === "darwin";
const _windows$8 = _platform$8 === "win32";
function wifiDBFromQuality(quality) {
  const qual = parseFloat(quality);
  if (isNaN(qual)) {
    return null;
  }
  if (qual < 0) {
    return 0;
  }
  if (qual >= 100) {
    return -50;
  }
  return qual / 2 - 100;
}
function wifiQualityFromDB(db) {
  const dbValue = parseFloat(db);
  if (isNaN(dbValue)) {
    return null;
  }
  const result = 2 * (dbValue + 100);
  return result <= 100 ? result : 100;
}
const _wifi_frequencies = {
  1: 2412,
  2: 2417,
  3: 2422,
  4: 2427,
  5: 2432,
  6: 2437,
  7: 2442,
  8: 2447,
  9: 2452,
  10: 2457,
  11: 2462,
  12: 2467,
  13: 2472,
  14: 2484,
  32: 5160,
  34: 5170,
  36: 5180,
  38: 5190,
  40: 5200,
  42: 5210,
  44: 5220,
  46: 5230,
  48: 5240,
  50: 5250,
  52: 5260,
  54: 5270,
  56: 5280,
  58: 5290,
  60: 5300,
  62: 5310,
  64: 5320,
  68: 5340,
  96: 5480,
  100: 5500,
  102: 5510,
  104: 5520,
  106: 5530,
  108: 5540,
  110: 5550,
  112: 5560,
  114: 5570,
  116: 5580,
  118: 5590,
  120: 5600,
  122: 5610,
  124: 5620,
  126: 5630,
  128: 5640,
  132: 5660,
  134: 5670,
  136: 5680,
  138: 5690,
  140: 5700,
  142: 5710,
  144: 5720,
  149: 5745,
  151: 5755,
  153: 5765,
  155: 5775,
  157: 5785,
  159: 5795,
  161: 5805,
  165: 5825,
  169: 5845,
  173: 5865,
  183: 4915,
  184: 4920,
  185: 4925,
  187: 4935,
  188: 4940,
  189: 4945,
  192: 4960,
  196: 4980
};
function wifiFrequencyFromChannel(channel) {
  return {}.hasOwnProperty.call(_wifi_frequencies, channel) ? _wifi_frequencies[channel] : null;
}
function wifiChannelFromFrequencs(frequency) {
  let channel = 0;
  for (const key in _wifi_frequencies) {
    if ({}.hasOwnProperty.call(_wifi_frequencies, key)) {
      if (_wifi_frequencies[key] === frequency) {
        channel = util$9.toInt(key);
      }
    }
  }
  return channel;
}
function ifaceListLinux() {
  const result = [];
  const cmd = "iw dev 2>/dev/null";
  try {
    const all = execSync$3(cmd, util$9.execOptsLinux).toString().split("\n").map((line) => line.trim()).join("\n");
    const parts = all.split("\nInterface ");
    parts.shift();
    parts.forEach((ifaceDetails) => {
      const lines = ifaceDetails.split("\n");
      const iface = lines[0];
      const id = util$9.toInt(util$9.getValue(lines, "ifindex", " "));
      const mac = util$9.getValue(lines, "addr", " ");
      const channel = util$9.toInt(util$9.getValue(lines, "channel", " "));
      result.push({
        id,
        iface,
        mac,
        channel
      });
    });
    return result;
  } catch {
    try {
      const all = execSync$3("nmcli -t -f general,wifi-properties,wired-properties,interface-flags,capabilities,nsp device show 2>/dev/null", util$9.execOptsLinux).toString();
      const parts = all.split("\n\n");
      let i = 1;
      parts.forEach((ifaceDetails) => {
        const lines = ifaceDetails.split("\n");
        const iface = util$9.getValue(lines, "GENERAL.DEVICE");
        const type = util$9.getValue(lines, "GENERAL.TYPE");
        const id = i++;
        const mac = util$9.getValue(lines, "GENERAL.HWADDR");
        const channel = "";
        if (type.toLowerCase() === "wifi") {
          result.push({
            id,
            iface,
            mac,
            channel
          });
        }
      });
      return result;
    } catch {
      return [];
    }
  }
}
function nmiDeviceLinux(iface) {
  const cmd = `nmcli -t -f general,wifi-properties,capabilities,ip4,ip6 device show ${util$9.sanitizeString(iface, true)} 2> /dev/null`;
  try {
    const lines = execSync$3(cmd, util$9.execOptsLinux).toString().split("\n");
    const ssid = util$9.getValue(lines, "GENERAL.CONNECTION");
    const uuid2 = util$9.getValue(lines, "GENERAL.CON-UUID");
    return {
      iface,
      type: util$9.getValue(lines, "GENERAL.TYPE"),
      vendor: util$9.getValue(lines, "GENERAL.VENDOR"),
      product: util$9.getValue(lines, "GENERAL.PRODUCT"),
      mac: util$9.getValue(lines, "GENERAL.HWADDR").toLowerCase(),
      ssid: ssid !== "--" ? ssid : null,
      uuid: uuid2 !== "--" ? uuid2 : null
    };
  } catch {
    return {};
  }
}
function nmiConnectionLinux(uuid2) {
  if (!uuid2 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid2)) {
    return {};
  }
  const cmd = `nmcli -t connection show ${uuid2} 2>/dev/null`;
  try {
    const lines = execSync$3(cmd, util$9.execOptsLinux).toString().split("\n");
    const ssid = util$9.getValue(lines, "802-11-wireless.ssid");
    const bssid = util$9.getValue(lines, "802-11-wireless.seen-bssids").toLowerCase();
    return {
      ssid: ssid || null,
      uuid: util$9.getValue(lines, "connection.uuid"),
      type: util$9.getValue(lines, "connection.type"),
      autoconnect: util$9.getValue(lines, "connection.autoconnect") === "yes",
      security: util$9.getValue(lines, "802-11-wireless-security.key-mgmt"),
      bssid: bssid !== "--" ? bssid : null
    };
  } catch {
    return {};
  }
}
function wpaConnectionLinux(iface) {
  if (!iface) {
    return {};
  }
  const cmd = `wpa_cli -i ${util$9.sanitizeString(iface, true)} status 2>&1`;
  try {
    const lines = execSync$3(cmd, util$9.execOptsLinux).toString().split("\n");
    const freq = util$9.toInt(util$9.getValue(lines, "freq", "="));
    return {
      ssid: util$9.getValue(lines, "ssid", "="),
      uuid: util$9.getValue(lines, "uuid", "="),
      security: util$9.getValue(lines, "key_mgmt", "="),
      freq,
      channel: wifiChannelFromFrequencs(freq),
      bssid: util$9.getValue(lines, "bssid", "=").toLowerCase()
    };
  } catch {
    return {};
  }
}
function getWifiNetworkListNmi() {
  const result = [];
  const cmd = "nmcli -t -m multiline --fields active,ssid,bssid,mode,chan,freq,signal,security,wpa-flags,rsn-flags device wifi list 2>/dev/null";
  try {
    const stdout = execSync$3(cmd, util$9.execOptsLinux);
    const parts = stdout.toString().split("ACTIVE:");
    parts.shift();
    parts.forEach((part) => {
      part = "ACTIVE:" + part;
      const lines = part.split(os$2.EOL);
      const channel = util$9.getValue(lines, "CHAN");
      const frequency = util$9.getValue(lines, "FREQ").toLowerCase().replace("mhz", "").trim();
      const security = util$9.getValue(lines, "SECURITY").replace("(", "").replace(")", "");
      const wpaFlags = util$9.getValue(lines, "WPA-FLAGS").replace("(", "").replace(")", "");
      const rsnFlags = util$9.getValue(lines, "RSN-FLAGS").replace("(", "").replace(")", "");
      const quality = util$9.getValue(lines, "SIGNAL");
      result.push({
        ssid: util$9.getValue(lines, "SSID"),
        bssid: util$9.getValue(lines, "BSSID").toLowerCase(),
        mode: util$9.getValue(lines, "MODE"),
        channel: channel ? parseInt(channel, 10) : null,
        frequency: frequency ? parseInt(frequency, 10) : null,
        signalLevel: wifiDBFromQuality(quality),
        quality: quality ? parseInt(quality, 10) : null,
        security: security && security !== "none" ? security.split(" ") : [],
        wpaFlags: wpaFlags && wpaFlags !== "none" ? wpaFlags.split(" ") : [],
        rsnFlags: rsnFlags && rsnFlags !== "none" ? rsnFlags.split(" ") : []
      });
    });
    return result;
  } catch {
    return [];
  }
}
function getWifiNetworkListIw(iface) {
  const result = [];
  try {
    const iwlistParts = execSync$3(`export LC_ALL=C; iwlist ${util$9.sanitizeString(iface, true)} scan 2>&1; unset LC_ALL`, util$9.execOptsLinux).toString().split("        Cell ");
    if (iwlistParts[0].indexOf("resource busy") >= 0) {
      return -1;
    }
    if (iwlistParts.length > 1) {
      iwlistParts.shift();
      iwlistParts.forEach((element) => {
        const lines = element.split("\n");
        const channel = util$9.getValue(lines, "channel", ":", true);
        const address = lines && lines.length && lines[0].indexOf("Address:") >= 0 ? lines[0].split("Address:")[1].trim().toLowerCase() : "";
        const mode2 = util$9.getValue(lines, "mode", ":", true);
        const frequency = util$9.getValue(lines, "frequency", ":", true);
        const qualityString = util$9.getValue(lines, "Quality", "=", true);
        const dbParts = qualityString.toLowerCase().split("signal level=");
        const db = dbParts.length > 1 ? util$9.toInt(dbParts[1]) : 0;
        const quality = db ? wifiQualityFromDB(db) : 0;
        const ssid = util$9.getValue(lines, "essid", ":", true);
        const isWpa = element.indexOf(" WPA ") >= 0;
        const isWpa2 = element.indexOf("WPA2 ") >= 0;
        const security = [];
        if (isWpa) {
          security.push("WPA");
        }
        if (isWpa2) {
          security.push("WPA2");
        }
        const wpaFlags = [];
        let wpaFlag = "";
        lines.forEach((line) => {
          const l = line.trim().toLowerCase();
          if (l.indexOf("group cipher") >= 0) {
            if (wpaFlag) {
              wpaFlags.push(wpaFlag);
            }
            const parts = l.split(":");
            if (parts.length > 1) {
              wpaFlag = parts[1].trim().toUpperCase();
            }
          }
          if (l.indexOf("pairwise cipher") >= 0) {
            const parts = l.split(":");
            if (parts.length > 1) {
              if (parts[1].indexOf("tkip") >= 0) {
                wpaFlag = wpaFlag ? "TKIP/" + wpaFlag : "TKIP";
              } else if (parts[1].indexOf("ccmp") >= 0) {
                wpaFlag = wpaFlag ? "CCMP/" + wpaFlag : "CCMP";
              } else if (parts[1].indexOf("proprietary") >= 0) {
                wpaFlag = wpaFlag ? "PROP/" + wpaFlag : "PROP";
              }
            }
          }
          if (l.indexOf("authentication suites") >= 0) {
            const parts = l.split(":");
            if (parts.length > 1) {
              if (parts[1].indexOf("802.1x") >= 0) {
                wpaFlag = wpaFlag ? "802.1x/" + wpaFlag : "802.1x";
              } else if (parts[1].indexOf("psk") >= 0) {
                wpaFlag = wpaFlag ? "PSK/" + wpaFlag : "PSK";
              }
            }
          }
        });
        if (wpaFlag) {
          wpaFlags.push(wpaFlag);
        }
        result.push({
          ssid,
          bssid: address,
          mode: mode2,
          channel: channel ? util$9.toInt(channel) : null,
          frequency: frequency ? util$9.toInt(frequency.replace(".", "")) : null,
          signalLevel: db,
          quality,
          security,
          wpaFlags,
          rsnFlags: []
        });
      });
    }
    return result;
  } catch {
    return -1;
  }
}
function parseWifiDarwin(wifiStr) {
  const result = [];
  try {
    let wifiObj = JSON.parse(wifiStr);
    wifiObj = wifiObj.SPAirPortDataType[0].spairport_airport_interfaces[0].spairport_airport_other_local_wireless_networks;
    wifiObj.forEach((wifiItem) => {
      const security = [];
      const sm = wifiItem.spairport_security_mode || "";
      if (sm === "spairport_security_mode_wep") {
        security.push("WEP");
      } else if (sm === "spairport_security_mode_wpa2_personal") {
        security.push("WPA2");
      } else if (sm.startsWith("spairport_security_mode_wpa2_enterprise")) {
        security.push("WPA2 EAP");
      } else if (sm.startsWith("pairport_security_mode_wpa3_transition")) {
        security.push("WPA2/WPA3");
      } else if (sm.startsWith("pairport_security_mode_wpa3")) {
        security.push("WPA3");
      }
      const channel = parseInt(("" + wifiItem.spairport_network_channel).split(" ")[0]) || 0;
      const signalLevel = wifiItem.spairport_signal_noise || null;
      result.push({
        ssid: wifiItem._name || "",
        bssid: wifiItem.spairport_network_bssid || null,
        mode: wifiItem.spairport_network_phymode,
        channel,
        frequency: wifiFrequencyFromChannel(channel),
        signalLevel: signalLevel ? parseInt(signalLevel, 10) : null,
        quality: wifiQualityFromDB(signalLevel),
        security,
        wpaFlags: [],
        rsnFlags: []
      });
    });
    return result;
  } catch {
    return result;
  }
}
function wifiNetworks(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux$7) {
        result = getWifiNetworkListNmi();
        if (result.length === 0) {
          try {
            const iwconfigParts = execSync$3("export LC_ALL=C; iwconfig 2>/dev/null; unset LC_ALL", util$9.execOptsLinux).toString().split("\n\n");
            let iface = "";
            iwconfigParts.forEach((element) => {
              if (element.indexOf("no wireless") === -1 && element.trim() !== "") {
                iface = element.split(" ")[0];
              }
            });
            if (iface) {
              const ifaceSanitized = util$9.sanitizeString(iface, true);
              const res = getWifiNetworkListIw(ifaceSanitized);
              if (res === -1) {
                setTimeout(() => {
                  const res2 = getWifiNetworkListIw(ifaceSanitized);
                  if (res2 !== -1) {
                    result = res2;
                  }
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                }, 4e3);
              } else {
                result = res;
                if (callback) {
                  callback(result);
                }
                resolve(result);
              }
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          } catch {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      } else if (_darwin$7) {
        const cmd = "system_profiler SPAirPortDataType -json 2>/dev/null";
        exec$7(cmd, { maxBuffer: 1024 * 4e4 }, (error, stdout) => {
          result = parseWifiDarwin(stdout.toString());
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else if (_windows$8) {
        const cmd = "netsh wlan show networks mode=Bssid";
        util$9.powerShell(cmd).then((stdout) => {
          const ssidParts = stdout.toString("utf8").split(os$2.EOL + os$2.EOL + "SSID ");
          ssidParts.shift();
          ssidParts.forEach((ssidPart) => {
            const ssidLines = ssidPart.split(os$2.EOL);
            if (ssidLines && ssidLines.length >= 8 && ssidLines[0].indexOf(":") >= 0) {
              const bssidsParts = ssidPart.split(" BSSID");
              bssidsParts.shift();
              bssidsParts.forEach((bssidPart) => {
                const bssidLines = bssidPart.split(os$2.EOL);
                if (bssidLines.length < 4) {
                  return;
                }
                const bssidLine = bssidLines[0].split(":");
                bssidLine.shift();
                const bssid = bssidLine.join(":").trim().toLowerCase();
                const channel = bssidLines[3].split(":").pop().trim();
                const quality = bssidLines[1].split(":").pop().trim();
                result.push({
                  ssid: ssidLines[0].split(":").pop().trim(),
                  bssid,
                  mode: "",
                  channel: channel ? parseInt(channel, 10) : null,
                  frequency: wifiFrequencyFromChannel(channel),
                  signalLevel: wifiDBFromQuality(quality),
                  quality: quality ? parseInt(quality, 10) : null,
                  security: [ssidLines[2].split(":").pop().trim()],
                  wpaFlags: [ssidLines[3].split(":").pop().trim()],
                  rsnFlags: []
                });
              });
            }
          });
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
wifi.wifiNetworks = wifiNetworks;
function getVendor(model) {
  model = model.toLowerCase();
  let result = "";
  if (model.indexOf("intel") >= 0) {
    result = "Intel";
  } else if (model.indexOf("realtek") >= 0) {
    result = "Realtek";
  } else if (model.indexOf("qualcom") >= 0) {
    result = "Qualcom";
  } else if (model.indexOf("broadcom") >= 0) {
    result = "Broadcom";
  } else if (model.indexOf("cavium") >= 0) {
    result = "Cavium";
  } else if (model.indexOf("cisco") >= 0) {
    result = "Cisco";
  } else if (model.indexOf("marvel") >= 0) {
    result = "Marvel";
  } else if (model.indexOf("zyxel") >= 0) {
    result = "Zyxel";
  } else if (model.indexOf("melanox") >= 0) {
    result = "Melanox";
  } else if (model.indexOf("d-link") >= 0) {
    result = "D-Link";
  } else if (model.indexOf("tp-link") >= 0) {
    result = "TP-Link";
  } else if (model.indexOf("asus") >= 0) {
    result = "Asus";
  } else if (model.indexOf("linksys") >= 0) {
    result = "Linksys";
  }
  return result;
}
function wifiConnections(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = [];
      if (_linux$7) {
        const ifaces = ifaceListLinux();
        const networkList = getWifiNetworkListNmi();
        ifaces.forEach((ifaceDetail) => {
          const ifaceSanitized = util$9.sanitizeString(ifaceDetail.iface, true);
          const nmiDetails = nmiDeviceLinux(ifaceSanitized);
          const wpaDetails = wpaConnectionLinux(ifaceSanitized);
          const nmiConnection = nmiConnectionLinux(nmiDetails.uuid);
          const ssid = nmiConnection.ssid || nmiDetails.ssid || wpaDetails.ssid;
          const network2 = networkList.filter((nw) => nw.ssid === ssid);
          const channel = network2 && network2.length && network2[0].channel ? network2[0].channel : wpaDetails.channel ? wpaDetails.channel : null;
          const bssid = network2 && network2.length && network2[0].bssid ? network2[0].bssid : wpaDetails.bssid ? wpaDetails.bssid : null;
          const signalLevel = network2 && network2.length && network2[0].signalLevel ? network2[0].signalLevel : null;
          if (ssid && bssid) {
            result.push({
              id: ifaceDetail.id,
              iface: ifaceDetail.iface,
              model: nmiDetails.product,
              ssid,
              bssid: network2 && network2.length && network2[0].bssid ? network2[0].bssid : wpaDetails.bssid ? wpaDetails.bssid : null,
              channel,
              frequency: channel ? wifiFrequencyFromChannel(channel) : null,
              type: nmiConnection.type ? nmiConnection.type : "802.11",
              security: nmiConnection.security ? nmiConnection.security : wpaDetails.security ? wpaDetails.security : null,
              signalLevel,
              quality: wifiQualityFromDB(signalLevel),
              txRate: null
            });
          }
        });
        if (callback) {
          callback(result);
        }
        resolve(result);
      } else if (_darwin$7) {
        const cmd = 'system_profiler SPNetworkDataType SPAirPortDataType -xml 2>/dev/null; echo "######" ; ioreg -n AppleBCMWLANSkywalkInterface -r 2>/dev/null';
        exec$7(cmd, (error, stdout) => {
          try {
            const parts = stdout.toString().split("######");
            const profilerObj = util$9.plistParser(parts[0]);
            const networkObj = profilerObj[0]._SPCommandLineArguments.indexOf("SPNetworkDataType") >= 0 ? profilerObj[0]._items : profilerObj[1]._items;
            const airportObj = profilerObj[0]._SPCommandLineArguments.indexOf("SPAirPortDataType") >= 0 ? profilerObj[0]._items[0].spairport_airport_interfaces : profilerObj[1]._items[0].spairport_airport_interfaces;
            let lines3 = [];
            if (parts[1].indexOf("  | {") > 0 && parts[1].indexOf("  | }") > parts[1].indexOf("  | {")) {
              lines3 = parts[1].split("  | {")[1].split("  | }")[0].replace(/ \| /g, "").replace(/"/g, "").split("\n");
            }
            const networkWifiObj = networkObj.find((item) => {
              return item._name === "Wi-Fi";
            });
            const airportWifiObj = airportObj[0].spairport_current_network_information;
            const channel = parseInt(("" + airportWifiObj.spairport_network_channel).split(" ")[0], 10) || 0;
            const signalLevel = airportWifiObj.spairport_signal_noise || null;
            const security = [];
            const sm = airportWifiObj.spairport_security_mode || "";
            if (sm === "spairport_security_mode_wep") {
              security.push("WEP");
            } else if (sm === "spairport_security_mode_wpa2_personal") {
              security.push("WPA2");
            } else if (sm.startsWith("spairport_security_mode_wpa2_enterprise")) {
              security.push("WPA2 EAP");
            } else if (sm.startsWith("pairport_security_mode_wpa3_transition")) {
              security.push("WPA2/WPA3");
            } else if (sm.startsWith("pairport_security_mode_wpa3")) {
              security.push("WPA3");
            }
            result.push({
              id: networkWifiObj._name || "Wi-Fi",
              iface: networkWifiObj.interface || "",
              model: networkWifiObj.hardware || "",
              ssid: (airportWifiObj._name || "").replace("&lt;", "<").replace("&gt;", ">"),
              bssid: airportWifiObj.spairport_network_bssid || "",
              channel,
              frequency: channel ? wifiFrequencyFromChannel(channel) : null,
              type: airportWifiObj.spairport_network_phymode || "802.11",
              security,
              signalLevel: signalLevel ? parseInt(signalLevel, 10) : null,
              quality: wifiQualityFromDB(signalLevel),
              txRate: airportWifiObj.spairport_network_rate || null
            });
          } catch {
            util$9.noop();
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else if (_windows$8) {
        const cmd = "netsh wlan show interfaces";
        util$9.powerShell(cmd).then((stdout) => {
          const allLines = stdout.toString().split("\r\n");
          for (let i = 0; i < allLines.length; i++) {
            allLines[i] = allLines[i].trim();
          }
          const parts = allLines.join("\r\n").split(":\r\n\r\n");
          parts.shift();
          parts.forEach((part) => {
            const lines = part.split("\r\n");
            if (lines.length >= 5) {
              const iface = lines[0].indexOf(":") >= 0 ? lines[0].split(":")[1].trim() : "";
              const model = lines[1].indexOf(":") >= 0 ? lines[1].split(":")[1].trim() : "";
              const id = lines[2].indexOf(":") >= 0 ? lines[2].split(":")[1].trim() : "";
              const ssid = util$9.getValue(lines, "SSID", ":", true);
              const bssid = util$9.getValue(lines, "BSSID", ":", true) || util$9.getValue(lines, "AP BSSID", ":", true);
              const quality = util$9.getValue(lines, "Signal", ":", true);
              const signalLevel = wifiDBFromQuality(quality);
              const type = util$9.getValue(lines, "Radio type", ":", true) || util$9.getValue(lines, "Type de radio", ":", true) || util$9.getValue(lines, "Funktyp", ":", true) || null;
              const security = util$9.getValue(lines, "authentication", ":", true) || util$9.getValue(lines, "Authentification", ":", true) || util$9.getValue(lines, "Authentifizierung", ":", true) || null;
              const channel = util$9.getValue(lines, "Channel", ":", true) || util$9.getValue(lines, "Canal", ":", true) || util$9.getValue(lines, "Kanal", ":", true) || null;
              const txRate = util$9.getValue(lines, "Transmit rate (mbps)", ":", true) || util$9.getValue(lines, "Transmission (mbit/s)", ":", true) || util$9.getValue(lines, "Empfangsrate (MBit/s)", ":", true) || null;
              if (model && id && ssid && bssid) {
                result.push({
                  id,
                  iface,
                  model,
                  ssid,
                  bssid,
                  channel: util$9.toInt(channel),
                  frequency: channel ? wifiFrequencyFromChannel(channel) : null,
                  type,
                  security,
                  signalLevel,
                  quality: quality ? parseInt(quality, 10) : null,
                  txRate: util$9.toInt(txRate) || null
                });
              }
            }
          });
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
wifi.wifiConnections = wifiConnections;
function wifiInterfaces(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = [];
      if (_linux$7) {
        const ifaces = ifaceListLinux();
        ifaces.forEach((ifaceDetail) => {
          const ifaceSanitized = util$9.sanitizeString(ifaceDetail.iface, true);
          const nmiDetails = nmiDeviceLinux(ifaceSanitized);
          result.push({
            id: ifaceDetail.id,
            iface: ifaceDetail.iface,
            model: nmiDetails.product ? nmiDetails.product : null,
            vendor: nmiDetails.vendor ? nmiDetails.vendor : null,
            mac: ifaceDetail.mac
          });
        });
        if (callback) {
          callback(result);
        }
        resolve(result);
      } else if (_darwin$7) {
        const cmd = "system_profiler SPNetworkDataType";
        exec$7(cmd, (error, stdout) => {
          const parts1 = stdout.toString().split("\n\n    Wi-Fi:\n\n");
          if (parts1.length > 1) {
            const lines = parts1[1].split("\n\n")[0].split("\n");
            const iface = util$9.getValue(lines, "BSD Device Name", ":", true);
            const mac = util$9.getValue(lines, "MAC Address", ":", true);
            const model = util$9.getValue(lines, "hardware", ":", true);
            result.push({
              id: "Wi-Fi",
              iface,
              model,
              vendor: "",
              mac
            });
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else if (_windows$8) {
        const cmd = "netsh wlan show interfaces";
        util$9.powerShell(cmd).then((stdout) => {
          const allLines = stdout.toString().split("\r\n");
          for (let i = 0; i < allLines.length; i++) {
            allLines[i] = allLines[i].trim();
          }
          const parts = allLines.join("\r\n").split(":\r\n\r\n");
          parts.shift();
          parts.forEach((part) => {
            const lines = part.split("\r\n");
            if (lines.length >= 5) {
              const iface = lines[0].indexOf(":") >= 0 ? lines[0].split(":")[1].trim() : "";
              const model = lines[1].indexOf(":") >= 0 ? lines[1].split(":")[1].trim() : "";
              const id = lines[2].indexOf(":") >= 0 ? lines[2].split(":")[1].trim() : "";
              const macParts = lines[3].indexOf(":") >= 0 ? lines[3].split(":") : [];
              macParts.shift();
              const mac = macParts.join(":").trim();
              const vendor = getVendor(model);
              if (iface && model && id && mac) {
                result.push({
                  id,
                  iface,
                  model,
                  vendor,
                  mac
                });
              }
            }
          });
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
wifi.wifiInterfaces = wifiInterfaces;
var processes$1 = {};
const os$1 = require$$0$1;
const fs$1 = require$$1$1;
const path$1 = require$$1;
const exec$6 = require$$1$4.exec;
const execSync$2 = require$$1$4.execSync;
const util$8 = util$i;
let _platform$7 = process.platform;
const _linux$6 = _platform$7 === "linux" || _platform$7 === "android";
const _darwin$6 = _platform$7 === "darwin";
const _windows$7 = _platform$7 === "win32";
const _freebsd$6 = _platform$7 === "freebsd";
const _openbsd$6 = _platform$7 === "openbsd";
const _netbsd$6 = _platform$7 === "netbsd";
const _sunos$6 = _platform$7 === "sunos";
const _processes_cpu = {
  all: 0,
  all_utime: 0,
  all_stime: 0,
  list: {},
  ms: 0,
  result: {}
};
const _services_cpu = {
  all: 0,
  list: {},
  ms: 0,
  result: {}
};
const _process_cpu = {
  all: 0,
  all_utime: 0,
  all_stime: 0,
  list: {},
  ms: 0,
  result: {}
};
const _winStatusValues = {
  0: "unknown",
  1: "other",
  2: "ready",
  3: "running",
  4: "blocked",
  5: "suspended blocked",
  6: "suspended ready",
  7: "terminated",
  8: "stopped",
  9: "growing"
};
function parseTimeUnix(time2) {
  let result = time2;
  let parts = time2.replace(/ +/g, " ").split(" ");
  if (parts.length === 5) {
    result = parts[4] + "-" + ("0" + ("JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC".indexOf(parts[1].toUpperCase()) / 3 + 1)).slice(-2) + "-" + ("0" + parts[2]).slice(-2) + " " + parts[3];
  }
  return result;
}
function parseElapsedTime(etime) {
  let current = /* @__PURE__ */ new Date();
  current = new Date(current.getTime() - current.getTimezoneOffset() * 6e4);
  const elapsed = etime.split("-");
  const timeIndex = elapsed.length - 1;
  const days = timeIndex > 0 ? parseInt(elapsed[timeIndex - 1]) : 0;
  const timeStr = elapsed[timeIndex].split(":");
  const hours = timeStr.length === 3 ? parseInt(timeStr[0] || 0) : 0;
  const mins = parseInt(timeStr[timeStr.length === 3 ? 1 : 0] || 0);
  const secs = parseInt(timeStr[timeStr.length === 3 ? 2 : 1] || 0);
  const ms2 = (((days * 24 + hours) * 60 + mins) * 60 + secs) * 1e3;
  let res = new Date(current.getTime());
  let result = res.toISOString().substring(0, 10) + " " + res.toISOString().substring(11, 19);
  try {
    res = new Date(current.getTime() - ms2);
    result = res.toISOString().substring(0, 10) + " " + res.toISOString().substring(11, 19);
  } catch (e) {
    util$8.noop();
  }
  return result;
}
function services(srv, callback) {
  if (util$8.isFunction(srv) && !callback) {
    callback = srv;
    srv = "";
  }
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (typeof srv !== "string") {
        if (callback) {
          callback([]);
        }
        return resolve([]);
      }
      if (srv) {
        let srvString = "";
        try {
          srvString.__proto__.toLowerCase = util$8.stringToLower;
          srvString.__proto__.replace = util$8.stringReplace;
          srvString.__proto__.toString = util$8.stringToString;
          srvString.__proto__.substr = util$8.stringSubstr;
          srvString.__proto__.substring = util$8.stringSubstring;
          srvString.__proto__.trim = util$8.stringTrim;
          srvString.__proto__.startsWith = util$8.stringStartWith;
        } catch (e) {
          Object.setPrototypeOf(srvString, util$8.stringObj);
        }
        const s = util$8.sanitizeShellString(srv);
        const l = util$8.mathMin(s.length, 2e3);
        for (let i = 0; i <= l; i++) {
          if (s[i] !== void 0) {
            srvString = srvString + s[i];
          }
        }
        srvString = srvString.trim().toLowerCase().replace(/, /g, "|").replace(/,+/g, "|");
        if (srvString === "") {
          srvString = "*";
        }
        if (util$8.isPrototypePolluted() && srvString !== "*") {
          srvString = "------";
        }
        let srvs = srvString.split("|");
        let result = [];
        let dataSrv = [];
        if (_linux$6 || _freebsd$6 || _openbsd$6 || _netbsd$6 || _darwin$6) {
          if ((_linux$6 || _freebsd$6 || _openbsd$6 || _netbsd$6) && srvString === "*") {
            try {
              const tmpsrv = execSync$2("systemctl --all --type=service --no-legend 2> /dev/null", util$8.execOptsLinux).toString().split("\n");
              srvs = [];
              for (const s2 of tmpsrv) {
                const name = s2.split(".service")[0];
                if (name && s2.indexOf(" not-found ") === -1) {
                  srvs.push(name.trim());
                }
              }
              srvString = srvs.join("|");
            } catch (d) {
              try {
                srvString = "";
                const tmpsrv = execSync$2("service --status-all 2> /dev/null", util$8.execOptsLinux).toString().split("\n");
                for (const s2 of tmpsrv) {
                  const parts = s2.split("]");
                  if (parts.length === 2) {
                    srvString += (srvString !== "" ? "|" : "") + parts[1].trim();
                  }
                }
                srvs = srvString.split("|");
              } catch (e) {
                try {
                  const srvStr = execSync$2("ls /etc/init.d/ -m 2> /dev/null", util$8.execOptsLinux).toString().split("\n").join("");
                  srvString = "";
                  if (srvStr) {
                    const tmpsrv = srvStr.split(",");
                    for (const s2 of tmpsrv) {
                      const name = s2.trim();
                      if (name) {
                        srvString += (srvString !== "" ? "|" : "") + name;
                      }
                    }
                    srvs = srvString.split("|");
                  }
                } catch (f) {
                  srvString = "";
                  srvs = [];
                }
              }
            }
          }
          if (_darwin$6 && srvString === "*") {
            if (callback) {
              callback(result);
            }
            return resolve(result);
          }
          let args = _darwin$6 ? ["-caxo", "pcpu,pmem,pid,command"] : ["-axo", "pcpu,pmem,pid,command"];
          if (srvString !== "" && srvs.length > 0) {
            util$8.execSafe("ps", args).then((stdout) => {
              if (stdout) {
                let lines = stdout.replace(/ +/g, " ").replace(/,+/g, ".").split("\n");
                srvs.forEach(function(srv2) {
                  let ps;
                  if (_darwin$6) {
                    ps = lines.filter(function(e) {
                      return e.toLowerCase().indexOf(srv2) !== -1;
                    });
                  } else {
                    ps = lines.filter(function(e) {
                      return e.toLowerCase().indexOf(" " + srv2.toLowerCase() + ":") !== -1 || e.toLowerCase().indexOf("(" + srv2.toLowerCase() + " ") !== -1 || e.toLowerCase().indexOf("(" + srv2.toLowerCase() + ")") !== -1 || e.toLowerCase().indexOf(" " + srv2.toLowerCase().replace(/[0-9.]/g, "") + ":") !== -1 || e.toLowerCase().indexOf("/" + srv2.toLowerCase()) !== -1;
                    });
                  }
                  const pids = [];
                  for (const p of ps) {
                    const pid = p.trim().split(" ")[2];
                    if (pid) {
                      pids.push(parseInt(pid, 10));
                    }
                  }
                  result.push({
                    name: srv2,
                    running: ps.length > 0,
                    startmode: "",
                    pids,
                    cpu: parseFloat(
                      ps.reduce(function(pv, cv) {
                        return pv + parseFloat(cv.trim().split(" ")[0]);
                      }, 0).toFixed(2)
                    ),
                    mem: parseFloat(
                      ps.reduce(function(pv, cv) {
                        return pv + parseFloat(cv.trim().split(" ")[1]);
                      }, 0).toFixed(2)
                    )
                  });
                });
                if (_linux$6) {
                  let cmd = 'cat /proc/stat | grep "cpu "';
                  for (let i in result) {
                    for (let j in result[i].pids) {
                      cmd += ";cat /proc/" + result[i].pids[j] + "/stat";
                    }
                  }
                  exec$6(cmd, { maxBuffer: 1024 * 102400 }, function(error, stdout2) {
                    let curr_processes = stdout2.toString().split("\n");
                    let all = parseProcStat(curr_processes.shift());
                    let list_new = {};
                    let resultProcess = {};
                    curr_processes.forEach((element) => {
                      resultProcess = calcProcStatLinux(element, all, _services_cpu);
                      if (resultProcess.pid) {
                        let listPos = -1;
                        for (let i in result) {
                          for (let j in result[i].pids) {
                            if (parseInt(result[i].pids[j]) === parseInt(resultProcess.pid)) {
                              listPos = i;
                            }
                          }
                        }
                        if (listPos >= 0) {
                          result[listPos].cpu += resultProcess.cpuu + resultProcess.cpus;
                        }
                        list_new[resultProcess.pid] = {
                          cpuu: resultProcess.cpuu,
                          cpus: resultProcess.cpus,
                          utime: resultProcess.utime,
                          stime: resultProcess.stime,
                          cutime: resultProcess.cutime,
                          cstime: resultProcess.cstime
                        };
                      }
                    });
                    _services_cpu.all = all;
                    _services_cpu.list = Object.assign({}, list_new);
                    _services_cpu.ms = Date.now();
                    _services_cpu.result = Object.assign({}, result);
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                  });
                } else {
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                }
              } else {
                args = ["-o", "comm"];
                util$8.execSafe("ps", args).then((stdout2) => {
                  if (stdout2) {
                    let lines = stdout2.replace(/ +/g, " ").replace(/,+/g, ".").split("\n");
                    srvs.forEach(function(srv2) {
                      let ps = lines.filter(function(e) {
                        return e.indexOf(srv2) !== -1;
                      });
                      result.push({
                        name: srv2,
                        running: ps.length > 0,
                        startmode: "",
                        cpu: 0,
                        mem: 0
                      });
                    });
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                  } else {
                    srvs.forEach(function(srv2) {
                      result.push({
                        name: srv2,
                        running: false,
                        startmode: "",
                        cpu: 0,
                        mem: 0
                      });
                    });
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                  }
                });
              }
            });
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } else if (_windows$7) {
          try {
            let wincommand = "Get-CimInstance Win32_Service";
            if (srvs[0] !== "*") {
              wincommand += ' -Filter "';
              srvs.forEach((srv2) => {
                wincommand += `Name='${srv2}' or `;
              });
              wincommand = `${wincommand.slice(0, -4)}"`;
            }
            wincommand += " | select Name,Caption,Started,StartMode,ProcessId | fl";
            util$8.powerShell(wincommand).then((stdout, error) => {
              if (!error) {
                let serviceSections = stdout.split(/\n\s*\n/);
                serviceSections.forEach((element) => {
                  if (element.trim() !== "") {
                    let lines = element.trim().split("\r\n");
                    let srvName = util$8.getValue(lines, "Name", ":", true).toLowerCase();
                    let srvCaption = util$8.getValue(lines, "Caption", ":", true).toLowerCase();
                    let started2 = util$8.getValue(lines, "Started", ":", true);
                    let startMode = util$8.getValue(lines, "StartMode", ":", true);
                    let pid = util$8.getValue(lines, "ProcessId", ":", true);
                    if (srvString === "*" || srvs.indexOf(srvName) >= 0 || srvs.indexOf(srvCaption) >= 0) {
                      result.push({
                        name: srvName,
                        running: started2.toLowerCase() === "true",
                        startmode: startMode,
                        pids: [pid],
                        cpu: 0,
                        mem: 0
                      });
                      dataSrv.push(srvName);
                      dataSrv.push(srvCaption);
                    }
                  }
                });
                if (srvString !== "*") {
                  const srvsMissing = srvs.filter((e) => dataSrv.indexOf(e) === -1);
                  srvsMissing.forEach((srvName) => {
                    result.push({
                      name: srvName,
                      running: false,
                      startmode: "",
                      pids: [],
                      cpu: 0,
                      mem: 0
                    });
                  });
                }
                if (callback) {
                  callback(result);
                }
                resolve(result);
              } else {
                srvs.forEach((srvName) => {
                  result.push({
                    name: srvName,
                    running: false,
                    startmode: "",
                    cpu: 0,
                    mem: 0
                  });
                });
                if (callback) {
                  callback(result);
                }
                resolve(result);
              }
            });
          } catch {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      } else {
        if (callback) {
          callback([]);
        }
        resolve([]);
      }
    });
  });
}
processes$1.services = services;
function parseProcStat(line) {
  const parts = line.replace(/ +/g, " ").split(" ");
  const user = parts.length >= 2 ? parseInt(parts[1]) : 0;
  const nice = parts.length >= 3 ? parseInt(parts[2]) : 0;
  const system2 = parts.length >= 4 ? parseInt(parts[3]) : 0;
  const idle = parts.length >= 5 ? parseInt(parts[4]) : 0;
  const iowait = parts.length >= 6 ? parseInt(parts[5]) : 0;
  const irq = parts.length >= 7 ? parseInt(parts[6]) : 0;
  const softirq = parts.length >= 8 ? parseInt(parts[7]) : 0;
  const steal = parts.length >= 9 ? parseInt(parts[8]) : 0;
  const guest = parts.length >= 10 ? parseInt(parts[9]) : 0;
  const guest_nice = parts.length >= 11 ? parseInt(parts[10]) : 0;
  return user + nice + system2 + idle + iowait + irq + softirq + steal + guest + guest_nice;
}
function calcProcStatLinux(line, all, _cpu_old) {
  let statparts = line.replace(/ +/g, " ").split(")");
  if (statparts.length >= 2) {
    let parts = statparts[1].split(" ");
    if (parts.length >= 16) {
      let pid = parseInt(statparts[0].split(" ")[0]);
      let utime = parseInt(parts[12]);
      let stime = parseInt(parts[13]);
      let cutime = parseInt(parts[14]);
      let cstime = parseInt(parts[15]);
      let cpuu = 0;
      let cpus = 0;
      if (_cpu_old.all > 0 && _cpu_old.list[pid]) {
        cpuu = (utime + cutime - _cpu_old.list[pid].utime - _cpu_old.list[pid].cutime) / (all - _cpu_old.all) * 100;
        cpus = (stime + cstime - _cpu_old.list[pid].stime - _cpu_old.list[pid].cstime) / (all - _cpu_old.all) * 100;
      } else {
        cpuu = (utime + cutime) / all * 100;
        cpus = (stime + cstime) / all * 100;
      }
      return {
        pid,
        utime,
        stime,
        cutime,
        cstime,
        cpuu,
        cpus
      };
    } else {
      return {
        pid: 0,
        utime: 0,
        stime: 0,
        cutime: 0,
        cstime: 0,
        cpuu: 0,
        cpus: 0
      };
    }
  } else {
    return {
      pid: 0,
      utime: 0,
      stime: 0,
      cutime: 0,
      cstime: 0,
      cpuu: 0,
      cpus: 0
    };
  }
}
function calcProcStatWin(procStat, all, _cpu_old) {
  let cpuu = 0;
  let cpus = 0;
  if (_cpu_old.all > 0 && _cpu_old.list[procStat.pid]) {
    cpuu = (procStat.utime - _cpu_old.list[procStat.pid].utime) / (all - _cpu_old.all) * 100;
    cpus = (procStat.stime - _cpu_old.list[procStat.pid].stime) / (all - _cpu_old.all) * 100;
  } else {
    cpuu = procStat.utime / all * 100;
    cpus = procStat.stime / all * 100;
  }
  return {
    pid: procStat.pid,
    utime: procStat.utime,
    stime: procStat.stime,
    cpuu: cpuu > 0 ? cpuu : 0,
    cpus: cpus > 0 ? cpus : 0
  };
}
function processes(callback) {
  let parsedhead = [];
  function getName(command) {
    command = command || "";
    let result = command.split(" ")[0];
    if (result.substr(-1) === ":") {
      result = result.substr(0, result.length - 1);
    }
    if (result.substr(0, 1) !== "[") {
      let parts = result.split("/");
      if (isNaN(parseInt(parts[parts.length - 1]))) {
        result = parts[parts.length - 1];
      } else {
        result = parts[0];
      }
    }
    return result;
  }
  function parseLine(line) {
    if (parsedhead.length < 13) {
      return null;
    }
    let offset = 0;
    let offset2 = 0;
    function checkColumn(i) {
      offset = offset2;
      if (parsedhead[i]) {
        offset2 = line.substring(parsedhead[i].to + offset, 1e4).indexOf(" ");
      } else {
        offset2 = 1e4;
      }
    }
    checkColumn(0);
    const pid = parseInt(line.substring(parsedhead[0].from + offset, parsedhead[0].to + offset2));
    checkColumn(1);
    const ppid = parseInt(line.substring(parsedhead[1].from + offset, parsedhead[1].to + offset2));
    checkColumn(2);
    const cpu2 = parseFloat(line.substring(parsedhead[2].from + offset, parsedhead[2].to + offset2).replace(/,/g, "."));
    checkColumn(3);
    const mem2 = parseFloat(line.substring(parsedhead[3].from + offset, parsedhead[3].to + offset2).replace(/,/g, "."));
    checkColumn(4);
    const priority = parseInt(line.substring(parsedhead[4].from + offset, parsedhead[4].to + offset2));
    checkColumn(5);
    const vsz = parseInt(line.substring(parsedhead[5].from + offset, parsedhead[5].to + offset2));
    checkColumn(6);
    const rss = parseInt(line.substring(parsedhead[6].from + offset, parsedhead[6].to + offset2));
    checkColumn(7);
    const nice = parseInt(line.substring(parsedhead[7].from + offset, parsedhead[7].to + offset2)) || 0;
    checkColumn(8);
    const started2 = !_sunos$6 ? parseElapsedTime(line.substring(parsedhead[8].from + offset, parsedhead[8].to + offset2).trim()) : parseTimeUnix(line.substring(parsedhead[8].from + offset, parsedhead[8].to + offset2).trim());
    checkColumn(9);
    let state = line.substring(parsedhead[9].from + offset, parsedhead[9].to + offset2).trim();
    state = state[0] === "R" ? "running" : state[0] === "S" ? "sleeping" : state[0] === "T" ? "stopped" : state[0] === "W" ? "paging" : state[0] === "X" ? "dead" : state[0] === "Z" ? "zombie" : state[0] === "D" || state[0] === "U" ? "blocked" : "unknown";
    checkColumn(10);
    let tty = line.substring(parsedhead[10].from + offset, parsedhead[10].to + offset2).trim();
    if (tty === "?" || tty === "??") {
      tty = "";
    }
    checkColumn(11);
    const user = line.substring(parsedhead[11].from + offset, parsedhead[11].to + offset2).trim();
    checkColumn(12);
    let cmdPath = "";
    let command = "";
    let params = "";
    let fullcommand = line.substring(parsedhead[12].from + offset, parsedhead[12].to + offset2).trim();
    if (fullcommand.substr(fullcommand.length - 1) === "]") {
      fullcommand = fullcommand.slice(0, -1);
    }
    if (fullcommand.substr(0, 1) === "[") {
      command = fullcommand.substring(1);
    } else {
      const p1 = fullcommand.indexOf("(");
      const p2 = fullcommand.indexOf(")");
      const p3 = fullcommand.indexOf("/");
      const p4 = fullcommand.indexOf(":");
      if (p1 < p2 && p1 < p3 && p3 < p2) {
        command = fullcommand.split(" ")[0];
        command = command.replace(/:/g, "");
      } else {
        if (p4 > 0 && (p3 === -1 || p3 > 3)) {
          command = fullcommand.split(" ")[0];
          command = command.replace(/:/g, "");
        } else {
          let firstParamPos = fullcommand.indexOf(" -");
          let firstParamPathPos = fullcommand.indexOf(" /");
          firstParamPos = firstParamPos >= 0 ? firstParamPos : 1e4;
          firstParamPathPos = firstParamPathPos >= 0 ? firstParamPathPos : 1e4;
          const firstPos = Math.min(firstParamPos, firstParamPathPos);
          let tmpCommand = fullcommand.substr(0, firstPos);
          const tmpParams = fullcommand.substr(firstPos);
          const lastSlashPos = tmpCommand.lastIndexOf("/");
          if (lastSlashPos >= 0) {
            cmdPath = tmpCommand.substr(0, lastSlashPos);
            tmpCommand = tmpCommand.substr(lastSlashPos + 1);
          }
          if (firstPos === 1e4 && tmpCommand.indexOf(" ") > -1) {
            const parts = tmpCommand.split(" ");
            if (fs$1.existsSync(path$1.join(cmdPath, parts[0]))) {
              command = parts.shift();
              params = (parts.join(" ") + " " + tmpParams).trim();
            } else {
              command = tmpCommand.trim();
              params = tmpParams.trim();
            }
          } else {
            command = tmpCommand.trim();
            params = tmpParams.trim();
          }
        }
      }
    }
    return {
      pid,
      parentPid: ppid,
      name: _linux$6 ? getName(command) : command,
      cpu: cpu2,
      cpuu: 0,
      cpus: 0,
      mem: mem2,
      priority,
      memVsz: vsz,
      memRss: rss,
      nice,
      started: started2,
      state,
      tty,
      user,
      command,
      params,
      path: cmdPath
    };
  }
  function parseProcesses(lines) {
    let result = [];
    if (lines.length > 1) {
      let head = lines[0];
      parsedhead = util$8.parseHead(head, 8);
      lines.shift();
      lines.forEach((line) => {
        if (line.trim() !== "") {
          const parsed = parseLine(line);
          if (parsed) {
            result.push(parsed);
          }
        }
      });
    }
    return result;
  }
  function parseProcesses2(lines) {
    function formatDateTime(time2) {
      const month = ("0" + (time2.getMonth() + 1).toString()).slice(-2);
      const year = time2.getFullYear().toString();
      const day = ("0" + time2.getDate().toString()).slice(-2);
      const hours = ("0" + time2.getHours().toString()).slice(-2);
      const mins = ("0" + time2.getMinutes().toString()).slice(-2);
      const secs = ("0" + time2.getSeconds().toString()).slice(-2);
      return year + "-" + month + "-" + day + " " + hours + ":" + mins + ":" + secs;
    }
    function parseElapsed(etime) {
      let started2 = "";
      if (etime.indexOf("d") >= 0) {
        const elapsed_parts = etime.split("d");
        started2 = formatDateTime(new Date(Date.now() - (elapsed_parts[0] * 24 + elapsed_parts[1] * 1) * 60 * 60 * 1e3));
      } else if (etime.indexOf("h") >= 0) {
        const elapsed_parts = etime.split("h");
        started2 = formatDateTime(new Date(Date.now() - (elapsed_parts[0] * 60 + elapsed_parts[1] * 1) * 60 * 1e3));
      } else if (etime.indexOf(":") >= 0) {
        const elapsed_parts = etime.split(":");
        let seconds = 0;
        if (elapsed_parts.length === 3) {
          seconds = elapsed_parts[0] * 3600 + elapsed_parts[1] * 60 + elapsed_parts[2] * 1;
        } else if (elapsed_parts.length === 2) {
          seconds = elapsed_parts[0] * 60 + elapsed_parts[1] * 1;
        } else {
          seconds = elapsed_parts[0] * 1;
        }
        started2 = formatDateTime(new Date(Date.now() - seconds * 1e3));
      }
      return started2;
    }
    let result = [];
    lines.forEach((line) => {
      if (line.trim() !== "") {
        line = line.trim().replace(/ +/g, " ").replace(/,+/g, ".");
        const parts = line.split(" ");
        const command = parts.slice(9).join(" ");
        const pmem = parseFloat((1 * parseInt(parts[3]) * 1024 / os$1.totalmem()).toFixed(1));
        const started2 = parseElapsed(parts[5]);
        result.push({
          pid: parseInt(parts[0]),
          parentPid: parseInt(parts[1]),
          name: getName(command),
          cpu: 0,
          cpuu: 0,
          cpus: 0,
          mem: pmem,
          priority: 0,
          memVsz: parseInt(parts[2]),
          memRss: parseInt(parts[3]),
          nice: parseInt(parts[4]),
          started: started2,
          state: parts[6] === "R" ? "running" : parts[6] === "S" ? "sleeping" : parts[6] === "T" ? "stopped" : parts[6] === "W" ? "paging" : parts[6] === "X" ? "dead" : parts[6] === "Z" ? "zombie" : parts[6] === "D" || parts[6] === "U" ? "blocked" : "unknown",
          tty: parts[7],
          user: parts[8],
          command
        });
      }
    });
    return result;
  }
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        all: 0,
        running: 0,
        blocked: 0,
        sleeping: 0,
        unknown: 0,
        list: []
      };
      let cmd = "";
      if (_processes_cpu.ms && Date.now() - _processes_cpu.ms >= 500 || _processes_cpu.ms === 0) {
        if (_linux$6 || _freebsd$6 || _openbsd$6 || _netbsd$6 || _darwin$6 || _sunos$6) {
          if (_linux$6) {
            cmd = "export LC_ALL=C; ps -axo pid:11,ppid:11,pcpu:6,pmem:6,pri:5,vsz:11,rss:11,ni:5,etime:30,state:5,tty:15,user:20,command; unset LC_ALL";
          }
          if (_freebsd$6 || _openbsd$6 || _netbsd$6) {
            cmd = "export LC_ALL=C; ps -axo pid,ppid,pcpu,pmem,pri,vsz,rss,ni,etime,state,tty,user,command; unset LC_ALL";
          }
          if (_darwin$6) {
            cmd = "ps -axo pid,ppid,pcpu,pmem,pri,vsz=temp_title_1,rss=temp_title_2,nice,etime=temp_title_3,state,tty,user,command -r";
          }
          if (_sunos$6) {
            cmd = "ps -Ao pid,ppid,pcpu,pmem,pri,vsz,rss,nice,stime,s,tty,user,comm";
          }
          try {
            exec$6(cmd, { maxBuffer: 1024 * 102400 }, (error, stdout) => {
              if (!error && stdout.toString().trim()) {
                result.list = parseProcesses(stdout.toString().split("\n")).slice();
                result.all = result.list.length;
                result.running = result.list.filter((e) => {
                  return e.state === "running";
                }).length;
                result.blocked = result.list.filter((e) => {
                  return e.state === "blocked";
                }).length;
                result.sleeping = result.list.filter((e) => {
                  return e.state === "sleeping";
                }).length;
                if (_linux$6) {
                  cmd = 'cat /proc/stat | grep "cpu "';
                  result.list.forEach((element) => {
                    cmd += ";cat /proc/" + element.pid + "/stat";
                  });
                  exec$6(cmd, { maxBuffer: 1024 * 102400 }, (error2, stdout2) => {
                    let curr_processes = stdout2.toString().split("\n");
                    let all = parseProcStat(curr_processes.shift());
                    let list_new = {};
                    let resultProcess = {};
                    curr_processes.forEach((element) => {
                      resultProcess = calcProcStatLinux(element, all, _processes_cpu);
                      if (resultProcess.pid) {
                        let listPos = result.list.map((e) => {
                          return e.pid;
                        }).indexOf(resultProcess.pid);
                        if (listPos >= 0) {
                          result.list[listPos].cpu = resultProcess.cpuu + resultProcess.cpus;
                          result.list[listPos].cpuu = resultProcess.cpuu;
                          result.list[listPos].cpus = resultProcess.cpus;
                        }
                        list_new[resultProcess.pid] = {
                          cpuu: resultProcess.cpuu,
                          cpus: resultProcess.cpus,
                          utime: resultProcess.utime,
                          stime: resultProcess.stime,
                          cutime: resultProcess.cutime,
                          cstime: resultProcess.cstime
                        };
                      }
                    });
                    _processes_cpu.all = all;
                    _processes_cpu.list = Object.assign({}, list_new);
                    _processes_cpu.ms = Date.now();
                    _processes_cpu.result = Object.assign({}, result);
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                  });
                } else {
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                }
              } else {
                cmd = "ps -o pid,ppid,vsz,rss,nice,etime,stat,tty,user,comm";
                if (_sunos$6) {
                  cmd = "ps -o pid,ppid,vsz,rss,nice,etime,s,tty,user,comm";
                }
                exec$6(cmd, { maxBuffer: 1024 * 102400 }, (error2, stdout2) => {
                  if (!error2) {
                    let lines = stdout2.toString().split("\n");
                    lines.shift();
                    result.list = parseProcesses2(lines).slice();
                    result.all = result.list.length;
                    result.running = result.list.filter((e) => {
                      return e.state === "running";
                    }).length;
                    result.blocked = result.list.filter((e) => {
                      return e.state === "blocked";
                    }).length;
                    result.sleeping = result.list.filter((e) => {
                      return e.state === "sleeping";
                    }).length;
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                  } else {
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                  }
                });
              }
            });
          } catch {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } else if (_windows$7) {
          try {
            util$8.powerShell(
              `Get-CimInstance Win32_Process | select-Object ProcessId,ParentProcessId,ExecutionState,Caption,CommandLine,ExecutablePath,UserModeTime,KernelModeTime,WorkingSetSize,Priority,PageFileUsage,
                @{n="CreationDate";e={$_.CreationDate.ToString("yyyy-MM-dd HH:mm:ss")}} | ConvertTo-Json -compress`
            ).then((stdout, error) => {
              if (!error) {
                const procs = [];
                const procStats = [];
                const list_new = {};
                let allcpuu = 0;
                let allcpus = 0;
                let processArray = [];
                try {
                  stdout = stdout.trim().replace(/^\uFEFF/, "");
                  processArray = JSON.parse(stdout);
                  if (!Array.isArray(processArray)) {
                    processArray = [processArray];
                  }
                } catch {
                }
                processArray.forEach((element) => {
                  const pid = element.ProcessId;
                  const parentPid = element.ParentProcessId;
                  const statusValue = element.ExecutionState || null;
                  const name = element.Caption;
                  const commandLine = element.CommandLine;
                  const commandPath = element.ExecutablePath;
                  const utime = element.UserModeTime;
                  const stime = element.KernelModeTime;
                  const memw = element.WorkingSetSize;
                  allcpuu = allcpuu + utime;
                  allcpus = allcpus + stime;
                  result.all++;
                  if (!statusValue) {
                    result.unknown++;
                  }
                  if (statusValue === "3") {
                    result.running++;
                  }
                  if (statusValue === "4" || statusValue === "5") {
                    result.blocked++;
                  }
                  procStats.push({
                    pid,
                    utime,
                    stime,
                    cpu: 0,
                    cpuu: 0,
                    cpus: 0
                  });
                  procs.push({
                    pid,
                    parentPid,
                    name,
                    cpu: 0,
                    cpuu: 0,
                    cpus: 0,
                    mem: memw / os$1.totalmem() * 100,
                    priority: element.Priority || null,
                    memVsz: element.PageFileUsage || null,
                    memRss: Math.floor((element.WorkingSetSize || 0) / 1024),
                    nice: 0,
                    started: element.CreationDate,
                    state: statusValue ? _winStatusValues[statusValue] : _winStatusValues[0],
                    tty: "",
                    user: "",
                    command: commandLine || name,
                    path: commandPath,
                    params: ""
                  });
                });
                result.sleeping = result.all - result.running - result.blocked - result.unknown;
                result.list = procs;
                procStats.forEach((element) => {
                  let resultProcess = calcProcStatWin(element, allcpuu + allcpus, _processes_cpu);
                  let listPos = result.list.map((e) => e.pid).indexOf(resultProcess.pid);
                  if (listPos >= 0) {
                    result.list[listPos].cpu = resultProcess.cpuu + resultProcess.cpus;
                    result.list[listPos].cpuu = resultProcess.cpuu;
                    result.list[listPos].cpus = resultProcess.cpus;
                  }
                  list_new[resultProcess.pid] = {
                    cpuu: resultProcess.cpuu,
                    cpus: resultProcess.cpus,
                    utime: resultProcess.utime,
                    stime: resultProcess.stime
                  };
                });
                _processes_cpu.all = allcpuu + allcpus;
                _processes_cpu.all_utime = allcpuu;
                _processes_cpu.all_stime = allcpus;
                _processes_cpu.list = Object.assign({}, list_new);
                _processes_cpu.ms = Date.now();
                _processes_cpu.result = Object.assign({}, result);
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          } catch {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      } else {
        if (callback) {
          callback(_processes_cpu.result);
        }
        resolve(_processes_cpu.result);
      }
    });
  });
}
processes$1.processes = processes;
function processLoad(proc, callback) {
  if (util$8.isFunction(proc) && !callback) {
    callback = proc;
    proc = "";
  }
  return new Promise((resolve) => {
    process.nextTick(() => {
      proc = proc || "";
      if (typeof proc !== "string") {
        if (callback) {
          callback([]);
        }
        return resolve([]);
      }
      let processesString = "";
      try {
        processesString.__proto__.toLowerCase = util$8.stringToLower;
        processesString.__proto__.replace = util$8.stringReplace;
        processesString.__proto__.toString = util$8.stringToString;
        processesString.__proto__.substr = util$8.stringSubstr;
        processesString.__proto__.substring = util$8.stringSubstring;
        processesString.__proto__.trim = util$8.stringTrim;
        processesString.__proto__.startsWith = util$8.stringStartWith;
      } catch {
        Object.setPrototypeOf(processesString, util$8.stringObj);
      }
      const s = util$8.sanitizeShellString(proc);
      const l = util$8.mathMin(s.length, 2e3);
      for (let i = 0; i <= l; i++) {
        if (s[i] !== void 0) {
          processesString = processesString + s[i];
        }
      }
      processesString = processesString.trim().toLowerCase().replace(/, /g, "|").replace(/,+/g, "|");
      if (processesString === "") {
        processesString = "*";
      }
      if (util$8.isPrototypePolluted() && processesString !== "*") {
        processesString = "------";
      }
      let processes2 = processesString.split("|");
      let result = [];
      const procSanitized = util$8.isPrototypePolluted() ? "" : util$8.sanitizeShellString(proc) || "*";
      if (procSanitized && processes2.length && processes2[0] !== "------") {
        if (_windows$7) {
          try {
            util$8.powerShell("Get-CimInstance Win32_Process | select ProcessId,Caption,UserModeTime,KernelModeTime,WorkingSetSize | ConvertTo-Json -compress").then((stdout, error) => {
              if (!error) {
                const procStats = [];
                const list_new = {};
                let allcpuu = 0;
                let allcpus = 0;
                let processArray = [];
                try {
                  stdout = stdout.trim().replace(/^\uFEFF/, "");
                  processArray = JSON.parse(stdout);
                  if (!Array.isArray(processArray)) {
                    processArray = [processArray];
                  }
                } catch {
                }
                processArray.forEach((element) => {
                  const pid = element.ProcessId;
                  const name = element.Caption;
                  const utime = element.UserModeTime;
                  const stime = element.KernelModeTime;
                  const mem2 = element.WorkingSetSize;
                  allcpuu = allcpuu + utime;
                  allcpus = allcpus + stime;
                  procStats.push({
                    pid,
                    name,
                    utime,
                    stime,
                    cpu: 0,
                    cpuu: 0,
                    cpus: 0,
                    mem: mem2
                  });
                  let pname = "";
                  let inList = false;
                  processes2.forEach((proc2) => {
                    if (name.toLowerCase().indexOf(proc2.toLowerCase()) >= 0 && !inList) {
                      inList = true;
                      pname = proc2;
                    }
                  });
                  if (processesString === "*" || inList) {
                    let processFound = false;
                    result.forEach((item) => {
                      if (item.proc.toLowerCase() === pname.toLowerCase()) {
                        item.pids.push(pid);
                        item.mem += mem2 / os$1.totalmem() * 100;
                        processFound = true;
                      }
                    });
                    if (!processFound) {
                      result.push({
                        proc: pname,
                        pid,
                        pids: [pid],
                        cpu: 0,
                        mem: mem2 / os$1.totalmem() * 100
                      });
                    }
                  }
                });
                if (processesString !== "*") {
                  let processesMissing = processes2.filter((name) => procStats.filter((item) => item.name.toLowerCase().indexOf(name) >= 0).length === 0);
                  processesMissing.forEach((procName) => {
                    result.push({
                      proc: procName,
                      pid: null,
                      pids: [],
                      cpu: 0,
                      mem: 0
                    });
                  });
                }
                procStats.forEach((element) => {
                  let resultProcess = calcProcStatWin(element, allcpuu + allcpus, _process_cpu);
                  let listPos = -1;
                  for (let j = 0; j < result.length; j++) {
                    if (result[j].pid === resultProcess.pid || result[j].pids.indexOf(resultProcess.pid) >= 0) {
                      listPos = j;
                    }
                  }
                  if (listPos >= 0) {
                    result[listPos].cpu += resultProcess.cpuu + resultProcess.cpus;
                  }
                  list_new[resultProcess.pid] = {
                    cpuu: resultProcess.cpuu,
                    cpus: resultProcess.cpus,
                    utime: resultProcess.utime,
                    stime: resultProcess.stime
                  };
                });
                _process_cpu.all = allcpuu + allcpus;
                _process_cpu.all_utime = allcpuu;
                _process_cpu.all_stime = allcpus;
                _process_cpu.list = Object.assign({}, list_new);
                _process_cpu.ms = Date.now();
                _process_cpu.result = JSON.parse(JSON.stringify(result));
                if (callback) {
                  callback(result);
                }
                resolve(result);
              }
            });
          } catch {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } else if (_darwin$6 || _linux$6 || _freebsd$6 || _openbsd$6 || _netbsd$6) {
          const params = ["-axo", "pid,ppid,pcpu,pmem,comm"];
          util$8.execSafe("ps", params).then((stdout) => {
            if (stdout) {
              const procStats = [];
              const lines = stdout.toString().split("\n").filter((line) => {
                if (processesString === "*") {
                  return true;
                }
                if (line.toLowerCase().indexOf("grep") !== -1) {
                  return false;
                }
                let found = false;
                processes2.forEach((item) => {
                  found = found || line.toLowerCase().indexOf(item.toLowerCase()) >= 0;
                });
                return found;
              });
              if (processesString === "*") {
                lines.shift();
              }
              lines.forEach((line) => {
                const data = line.trim().replace(/ +/g, " ").split(" ");
                if (data.length > 4) {
                  const linuxName = data[4].indexOf("/") >= 0 ? data[4].substring(0, data[4].indexOf("/")) : data[4];
                  const name = _linux$6 ? linuxName : data[4].substring(data[4].lastIndexOf("/") + 1);
                  procStats.push({
                    name,
                    pid: parseInt(data[0]) || 0,
                    ppid: parseInt(data[1]) || 0,
                    cpu: parseFloat(data[2].replace(",", ".")),
                    mem: parseFloat(data[3].replace(",", "."))
                  });
                }
              });
              procStats.forEach((item) => {
                let listPos = -1;
                let inList = false;
                let name = item.name;
                for (let j = 0; j < result.length; j++) {
                  if (item.name.toLowerCase().indexOf(result[j].proc.toLowerCase()) >= 0) {
                    listPos = j;
                  }
                }
                processes2.forEach((proc2) => {
                  if (item.name.toLowerCase().indexOf(proc2.toLowerCase()) >= 0 && !inList) {
                    inList = true;
                    name = proc2;
                  }
                });
                if (processesString === "*" || inList) {
                  if (listPos < 0) {
                    if (name) {
                      result.push({
                        proc: name,
                        pid: item.pid,
                        pids: [item.pid],
                        cpu: item.cpu,
                        mem: item.mem
                      });
                    }
                  } else {
                    if (item.ppid < 10) {
                      result[listPos].pid = item.pid;
                    }
                    result[listPos].pids.push(item.pid);
                    result[listPos].cpu += item.cpu;
                    result[listPos].mem += item.mem;
                  }
                }
              });
              if (processesString !== "*") {
                let processesMissing = processes2.filter((name) => {
                  return procStats.filter((item) => {
                    return item.name.toLowerCase().indexOf(name) >= 0;
                  }).length === 0;
                });
                processesMissing.forEach((procName) => {
                  result.push({
                    proc: procName,
                    pid: null,
                    pids: [],
                    cpu: 0,
                    mem: 0
                  });
                });
              }
              if (_linux$6) {
                result.forEach((item) => {
                  item.cpu = 0;
                });
                let cmd = 'cat /proc/stat | grep "cpu "';
                for (let i in result) {
                  for (let j in result[i].pids) {
                    cmd += ";cat /proc/" + result[i].pids[j] + "/stat";
                  }
                }
                exec$6(cmd, { maxBuffer: 1024 * 102400 }, (error, stdout2) => {
                  let curr_processes = stdout2.toString().split("\n");
                  let all = parseProcStat(curr_processes.shift());
                  let list_new = {};
                  let resultProcess = {};
                  curr_processes.forEach((element) => {
                    resultProcess = calcProcStatLinux(element, all, _process_cpu);
                    if (resultProcess.pid) {
                      let resultItemId = -1;
                      for (let i in result) {
                        if (result[i].pids.indexOf(resultProcess.pid) >= 0) {
                          resultItemId = i;
                        }
                      }
                      if (resultItemId >= 0) {
                        result[resultItemId].cpu += resultProcess.cpuu + resultProcess.cpus;
                      }
                      list_new[resultProcess.pid] = {
                        cpuu: resultProcess.cpuu,
                        cpus: resultProcess.cpus,
                        utime: resultProcess.utime,
                        stime: resultProcess.stime,
                        cutime: resultProcess.cutime,
                        cstime: resultProcess.cstime
                      };
                    }
                  });
                  result.forEach((item) => {
                    item.cpu = Math.round(item.cpu * 100) / 100;
                  });
                  _process_cpu.all = all;
                  _process_cpu.list = Object.assign({}, list_new);
                  _process_cpu.ms = Date.now();
                  _process_cpu.result = Object.assign({}, result);
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                });
              } else {
                if (callback) {
                  callback(result);
                }
                resolve(result);
              }
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          });
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      } else {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
processes$1.processLoad = processLoad;
var users$1 = {};
const exec$5 = require$$1$4.exec;
const util$7 = util$i;
const _platform$6 = process.platform;
const _linux$5 = _platform$6 === "linux" || _platform$6 === "android";
const _darwin$5 = _platform$6 === "darwin";
const _windows$6 = _platform$6 === "win32";
const _freebsd$5 = _platform$6 === "freebsd";
const _openbsd$5 = _platform$6 === "openbsd";
const _netbsd$5 = _platform$6 === "netbsd";
const _sunos$5 = _platform$6 === "sunos";
function parseDate(dtMon, dtDay) {
  let dt = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  try {
    dt = "" + (/* @__PURE__ */ new Date()).getFullYear() + "-" + ("0" + ("JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC".indexOf(dtMon.toUpperCase()) / 3 + 1)).slice(-2) + "-" + ("0" + dtDay).slice(-2);
    if (new Date(dt) > /* @__PURE__ */ new Date()) {
      dt = "" + ((/* @__PURE__ */ new Date()).getFullYear() - 1) + "-" + ("0" + ("JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC".indexOf(dtMon.toUpperCase()) / 3 + 1)).slice(-2) + "-" + ("0" + dtDay).slice(-2);
    }
  } catch {
    util$7.noop();
  }
  return dt;
}
function parseUsersLinux(lines, phase) {
  const result = [];
  let result_who = [];
  const result_w = {};
  let w_first = true;
  let w_header = [];
  const w_pos = [];
  let who_line = {};
  let is_whopart = true;
  let is_whoerror = false;
  lines.forEach((line) => {
    if (line === "---") {
      is_whopart = false;
    } else {
      const l = line.replace(/ +/g, " ").split(" ");
      if (is_whopart) {
        if (line.toLowerCase().indexOf("unexpected") >= 0 || line.toLowerCase().indexOf("unrecognized") >= 0) {
          is_whoerror = true;
          result_who = [];
        }
        if (!is_whoerror) {
          const timePos = l && l.length > 4 && l[4].indexOf(":") > 0 ? 4 : 3;
          result_who.push({
            user: l[0],
            tty: l[1],
            date: timePos === 4 ? parseDate(l[2], l[3]) : l[2],
            time: l[timePos],
            ip: l && l.length > timePos + 1 ? l[timePos + 1].replace(/\(/g, "").replace(/\)/g, "") : "",
            command: ""
          });
        }
      } else {
        if (w_first) {
          if (line[0] !== " ") {
            w_header = l;
            w_header.forEach((item) => {
              w_pos.push(line.indexOf(item));
            });
            w_first = false;
          }
        } else {
          result_w.user = line.substring(w_pos[0], w_pos[1] - 1).trim();
          result_w.tty = line.substring(w_pos[1], w_pos[2] - 1).trim();
          result_w.ip = line.substring(w_pos[2], w_pos[3] - 1).replace(/\(/g, "").replace(/\)/g, "").trim();
          result_w.command = line.substring(w_pos[7], 1e3).trim();
          if (result_who.length || phase === 1) {
            who_line = result_who.filter((obj) => {
              return obj.user.substring(0, 8).trim() === result_w.user && obj.tty === result_w.tty;
            });
          } else {
            who_line = [{ user: result_w.user, tty: result_w.tty, date: "", time: "", ip: "" }];
          }
          if (who_line.length === 1 && who_line[0].user !== "") {
            result.push({
              user: who_line[0].user,
              tty: who_line[0].tty,
              date: who_line[0].date,
              time: who_line[0].time,
              ip: who_line[0].ip,
              command: result_w.command
            });
          }
        }
      }
    }
  });
  if (result.length === 0 && phase === 2) {
    return result_who;
  } else {
    return result;
  }
}
function parseUsersDarwin(lines) {
  const result = [];
  const result_who = [];
  const result_w = {};
  let who_line = {};
  let is_whopart = true;
  lines.forEach((line) => {
    if (line === "---") {
      is_whopart = false;
    } else {
      const l = line.replace(/ +/g, " ").split(" ");
      if (is_whopart) {
        result_who.push({
          user: l[0],
          tty: l[1],
          date: parseDate(l[2], l[3]),
          time: l[4]
        });
      } else {
        result_w.user = l[0];
        result_w.tty = l[1];
        result_w.ip = l[2] !== "-" ? l[2] : "";
        result_w.command = l.slice(5, 1e3).join(" ");
        who_line = result_who.filter((obj) => obj.user.substring(0, 10) === result_w.user.substring(0, 10) && (obj.tty.substring(3, 1e3) === result_w.tty || obj.tty === result_w.tty));
        if (who_line.length === 1) {
          result.push({
            user: who_line[0].user,
            tty: who_line[0].tty,
            date: who_line[0].date,
            time: who_line[0].time,
            ip: result_w.ip,
            command: result_w.command
          });
        }
      }
    }
  });
  return result;
}
function users(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux$5) {
        exec$5('export LC_ALL=C; who --ips; echo "---"; w; unset LC_ALL | tail -n +2', (error, stdout) => {
          if (!error) {
            let lines = stdout.toString().split("\n");
            result = parseUsersLinux(lines, 1);
            if (result.length === 0) {
              exec$5('who; echo "---"; w | tail -n +2', (error2, stdout2) => {
                if (!error2) {
                  lines = stdout2.toString().split("\n");
                  result = parseUsersLinux(lines, 2);
                }
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        });
      }
      if (_freebsd$5 || _openbsd$5 || _netbsd$5) {
        exec$5('who; echo "---"; w -ih', (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().split("\n");
            result = parseUsersDarwin(lines);
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$5) {
        exec$5('who; echo "---"; w -h', (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().split("\n");
            result = parseUsersDarwin(lines);
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin$5) {
        exec$5('export LC_ALL=C; who; echo "---"; w -ih; unset LC_ALL', (error, stdout) => {
          if (!error) {
            const lines = stdout.toString().split("\n");
            result = parseUsersDarwin(lines);
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows$6) {
        try {
          let cmd = `Get-CimInstance Win32_LogonSession | select LogonId,@{n="StartTime";e={$_.StartTime.ToString("yyyy-MM-dd HH:mm:ss")}} | fl; echo '#-#-#-#';`;
          cmd += "Get-CimInstance Win32_LoggedOnUser | select antecedent,dependent | fl ; echo '#-#-#-#';";
          cmd += `$process = (Get-CimInstance Win32_Process -Filter "name = 'explorer.exe'"); Invoke-CimMethod -InputObject $process[0] -MethodName GetOwner | select user, domain | fl; get-process -name explorer | select-object sessionid | fl; echo '#-#-#-#';`;
          cmd += "query user";
          util$7.powerShell(cmd).then((data) => {
            if (data) {
              data = data.split("#-#-#-#");
              const sessions = parseWinSessions((data[0] || "").split(/\n\s*\n/));
              const loggedons = parseWinLoggedOn((data[1] || "").split(/\n\s*\n/));
              const queryUser = parseWinUsersQuery((data[3] || "").split("\r\n"));
              const users2 = parseWinUsers((data[2] || "").split(/\n\s*\n/), queryUser);
              for (let id in loggedons) {
                if ({}.hasOwnProperty.call(loggedons, id)) {
                  loggedons[id].dateTime = {}.hasOwnProperty.call(sessions, id) ? sessions[id] : "";
                }
              }
              users2.forEach((user) => {
                let dateTime = "";
                for (let id in loggedons) {
                  if ({}.hasOwnProperty.call(loggedons, id)) {
                    if (loggedons[id].user === user.user && (!dateTime || dateTime < loggedons[id].dateTime)) {
                      dateTime = loggedons[id].dateTime;
                    }
                  }
                }
                result.push({
                  user: user.user,
                  tty: user.tty,
                  date: `${dateTime.substring(0, 10)}`,
                  time: `${dateTime.substring(11, 19)}`,
                  ip: "",
                  command: ""
                });
              });
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
function parseWinSessions(sessionParts) {
  const sessions = {};
  sessionParts.forEach((session) => {
    const lines = session.split("\r\n");
    const id = util$7.getValue(lines, "LogonId");
    const starttime = util$7.getValue(lines, "starttime");
    if (id) {
      sessions[id] = starttime;
    }
  });
  return sessions;
}
function fuzzyMatch(name1, name2) {
  name1 = name1.toLowerCase();
  name2 = name2.toLowerCase();
  let eq = 0;
  let len = name1.length;
  if (name2.length > len) {
    len = name2.length;
  }
  for (let i = 0; i < len; i++) {
    const c1 = name1[i] || "";
    const c2 = name2[i] || "";
    if (c1 === c2) {
      eq++;
    }
  }
  return len > 10 ? eq / len > 0.9 : len > 0 ? eq / len > 0.8 : false;
}
function parseWinUsers(userParts, userQuery) {
  const users2 = [];
  userParts.forEach((user) => {
    const lines = user.split("\r\n");
    const domain = util$7.getValue(lines, "domain", ":", true);
    const username = util$7.getValue(lines, "user", ":", true);
    const sessionid = util$7.getValue(lines, "sessionid", ":", true);
    if (username) {
      const quser = userQuery.filter((item) => fuzzyMatch(item.user, username));
      users2.push({
        domain,
        user: username,
        tty: quser && quser[0] && quser[0].tty ? quser[0].tty : sessionid
      });
    }
  });
  return users2;
}
function parseWinLoggedOn(loggedonParts) {
  const loggedons = {};
  loggedonParts.forEach((loggedon) => {
    const lines = loggedon.split("\r\n");
    const antecendent = util$7.getValue(lines, "antecedent", ":", true);
    let parts = antecendent.split("=");
    const name = parts.length > 2 ? parts[1].split(",")[0].replace(/"/g, "").trim() : "";
    const domain = parts.length > 2 ? parts[2].replace(/"/g, "").replace(/\)/g, "").trim() : "";
    const dependent = util$7.getValue(lines, "dependent", ":", true);
    parts = dependent.split("=");
    const id = parts.length > 1 ? parts[1].replace(/"/g, "").replace(/\)/g, "").trim() : "";
    if (id) {
      loggedons[id] = {
        domain,
        user: name
      };
    }
  });
  return loggedons;
}
function parseWinUsersQuery(lines) {
  lines = lines.filter((item) => item);
  let result = [];
  const header = lines[0];
  const headerDelimiter = [];
  if (header) {
    const start = header[0] === " " ? 1 : 0;
    headerDelimiter.push(start - 1);
    let nextSpace = 0;
    for (let i = start + 1; i < header.length; i++) {
      if (header[i] === " " && (header[i - 1] === " " || header[i - 1] === ".")) {
        nextSpace = i;
      } else {
        if (nextSpace) {
          headerDelimiter.push(nextSpace);
          nextSpace = 0;
        }
      }
    }
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const user = lines[i].substring(headerDelimiter[0] + 1, headerDelimiter[1]).trim() || "";
        const tty = lines[i].substring(headerDelimiter[1] + 1, headerDelimiter[2] - 2).trim() || "";
        result.push({
          user,
          tty
        });
      }
    }
  }
  return result;
}
users$1.users = users;
var internet = {};
const util$6 = util$i;
const _platform$5 = process.platform;
const _linux$4 = _platform$5 === "linux" || _platform$5 === "android";
const _darwin$4 = _platform$5 === "darwin";
const _windows$5 = _platform$5 === "win32";
const _freebsd$4 = _platform$5 === "freebsd";
const _openbsd$4 = _platform$5 === "openbsd";
const _netbsd$4 = _platform$5 === "netbsd";
const _sunos$4 = _platform$5 === "sunos";
function inetChecksite(url, callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        url,
        ok: false,
        status: 404,
        ms: null
      };
      if (typeof url !== "string") {
        if (callback) {
          callback(result);
        }
        return resolve(result);
      }
      let urlSanitized = "";
      const s = util$6.sanitizeShellString(url, true);
      const l = util$6.mathMin(s.length, 2e3);
      for (let i = 0; i <= l; i++) {
        if (s[i] !== void 0) {
          try {
            s[i].__proto__.toLowerCase = util$6.stringToLower;
          } catch {
            Object.setPrototypeOf(s[i], util$6.stringObj);
          }
          const sl = s[i].toLowerCase();
          if (sl && sl[0] && !sl[1] && sl[0].length === 1) {
            urlSanitized = urlSanitized + sl[0];
          }
        }
      }
      result.url = urlSanitized;
      try {
        if (urlSanitized && !util$6.isPrototypePolluted()) {
          try {
            urlSanitized.__proto__.startsWith = util$6.stringStartWith;
          } catch {
            Object.setPrototypeOf(urlSanitized, util$6.stringObj);
          }
          if (urlSanitized.startsWith("file:") || urlSanitized.startsWith("gopher:") || urlSanitized.startsWith("telnet:") || urlSanitized.startsWith("mailto:") || urlSanitized.startsWith("news:") || urlSanitized.startsWith("nntp:")) {
            if (callback) {
              callback(result);
            }
            return resolve(result);
          }
          util$6.checkWebsite(urlSanitized).then((res) => {
            result.status = res.statusCode;
            result.ok = res.statusCode >= 200 && res.statusCode <= 399;
            result.ms = result.ok ? res.time : null;
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      } catch {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
internet.inetChecksite = inetChecksite;
function inetLatency(host, callback) {
  if (util$6.isFunction(host) && !callback) {
    callback = host;
    host = "";
  }
  host = host || "8.8.8.8";
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (typeof host !== "string") {
        if (callback) {
          callback(null);
        }
        return resolve(null);
      }
      let hostSanitized = "";
      const s = (util$6.isPrototypePolluted() ? "8.8.8.8" : util$6.sanitizeShellString(host, true)).trim();
      const l = util$6.mathMin(s.length, 2e3);
      for (let i = 0; i <= l; i++) {
        if (!(s[i] === void 0)) {
          try {
            s[i].__proto__.toLowerCase = util$6.stringToLower;
          } catch {
            Object.setPrototypeOf(s[i], util$6.stringObj);
          }
          const sl = s[i].toLowerCase();
          if (sl && sl[0] && !sl[1]) {
            hostSanitized = hostSanitized + sl[0];
          }
        }
      }
      try {
        hostSanitized.__proto__.startsWith = util$6.stringStartWith;
      } catch {
        Object.setPrototypeOf(hostSanitized, util$6.stringObj);
      }
      if (hostSanitized.startsWith("file:") || hostSanitized.startsWith("gopher:") || hostSanitized.startsWith("telnet:") || hostSanitized.startsWith("mailto:") || hostSanitized.startsWith("news:") || hostSanitized.startsWith("nntp:")) {
        if (callback) {
          callback(null);
        }
        return resolve(null);
      }
      if (hostSanitized.startsWith("-")) {
        if (callback) {
          callback(null);
        }
        return resolve(null);
      }
      let params;
      if (_linux$4 || _freebsd$4 || _openbsd$4 || _netbsd$4 || _darwin$4) {
        if (_linux$4) {
          params = ["-c", "2", "-w", "3", hostSanitized];
        }
        if (_freebsd$4 || _openbsd$4 || _netbsd$4) {
          params = ["-c", "2", "-t", "3", hostSanitized];
        }
        if (_darwin$4) {
          params = ["-c2", "-t3", hostSanitized];
        }
        util$6.execSafe("ping", params).then((stdout) => {
          let result = null;
          if (stdout) {
            const lines = stdout.split("\n").filter((line2) => line2.indexOf("rtt") >= 0 || line2.indexOf("round-trip") >= 0 || line2.indexOf("avg") >= 0).join("\n");
            const line = lines.split("=");
            if (line.length > 1) {
              const parts = line[1].split("/");
              if (parts.length > 1) {
                result = parseFloat(parts[1]);
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$4) {
        const params2 = ["-s", "-a", hostSanitized, "56", "2"];
        const filt = "avg";
        util$6.execSafe("ping", params2, { timeout: 3e3 }).then((stdout) => {
          let result = null;
          if (stdout) {
            const lines = stdout.split("\n").filter((line2) => line2.indexOf(filt) >= 0).join("\n");
            const line = lines.split("=");
            if (line.length > 1) {
              const parts = line[1].split("/");
              if (parts.length > 1) {
                result = parseFloat(parts[1].replace(",", "."));
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows$5) {
        let result = null;
        try {
          const params2 = [hostSanitized, "-n", "1"];
          util$6.execSafe("ping", params2, util$6.execOptsWin).then((stdout) => {
            if (stdout) {
              const lines = stdout.split("\r\n");
              lines.shift();
              lines.forEach((line) => {
                if ((line.toLowerCase().match(/ms/g) || []).length === 3) {
                  let l2 = line.replace(/ +/g, " ").split(" ");
                  if (l2.length > 6) {
                    result = parseFloat(l2[l2.length - 1]);
                  }
                }
              });
            }
            if (callback) {
              callback(result);
            }
            resolve(result);
          });
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
internet.inetLatency = inetLatency;
var docker = {};
const net = require$$4;
const isWin = require$$0$1.type() === "Windows_NT";
const socketPath = process.env.DOCKER_SOCKET || (isWin ? "//./pipe/docker_engine" : "/var/run/docker.sock");
const socketTimeout = +process.env.DOCKER_SOCKET_TIMEOUT || 3e4;
function fetchJson(path2, callback) {
  let done = false;
  const finish = (result) => {
    if (!done) {
      done = true;
      callback(result);
    }
  };
  try {
    const socket = net.createConnection({ path: socketPath });
    let alldata = "";
    socket.setTimeout(socketTimeout, () => {
      socket.destroy();
      finish({});
    });
    socket.on("connect", () => {
      socket.write(`GET ${path2} HTTP/1.0\r
\r
`);
    });
    socket.on("data", (data) => {
      alldata = alldata + data.toString();
    });
    socket.on("error", () => {
      finish({});
    });
    socket.on("end", () => {
      const startbody = alldata.indexOf("\r\n\r\n");
      const status = parseInt(alldata.split(" ")[1], 10);
      if (startbody < 0 || isNaN(status) || status < 200 || status >= 300) {
        return finish({});
      }
      try {
        finish(JSON.parse(alldata.substring(startbody + 4)));
      } catch {
        finish({});
      }
    });
  } catch {
    finish({});
  }
}
let DockerSocket$1 = class DockerSocket {
  getInfo(callback) {
    fetchJson("http:/info", callback);
  }
  listImages(all, callback) {
    fetchJson(`http:/images/json${all ? "?all=1" : ""}`, callback);
  }
  inspectImage(id, callback) {
    if (id) {
      fetchJson(`http:/images/${id}/json?stream=0`, callback);
    } else {
      callback({});
    }
  }
  listContainers(all, callback) {
    fetchJson(`http:/containers/json${all ? "?all=1" : ""}`, callback);
  }
  getStats(id, callback) {
    if (id) {
      fetchJson(`http:/containers/${id}/stats?stream=0`, callback);
    } else {
      callback({});
    }
  }
  getInspect(id, callback) {
    if (id) {
      fetchJson(`http:/containers/${id}/json?stream=0`, callback);
    } else {
      callback({});
    }
  }
  getProcesses(id, callback) {
    if (id) {
      fetchJson(`http:/containers/${id}/top?ps_args=-opid,ppid,pgid,vsz,time,etime,nice,ruser,user,rgroup,group,stat,rss,args`, callback);
    } else {
      callback({});
    }
  }
  listVolumes(callback) {
    fetchJson("http:/volumes", callback);
  }
};
var dockerSocket = DockerSocket$1;
const util$5 = util$i;
const DockerSocket2 = dockerSocket;
const _platform$4 = process.platform;
const _windows$4 = _platform$4 === "win32";
const _docker_cpu_last_read = {};
let _docker_socket;
function dockerInfo(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (!_docker_socket) {
        _docker_socket = new DockerSocket2();
      }
      const result = {};
      _docker_socket.getInfo((data) => {
        result.id = data.ID;
        result.containers = data.Containers;
        result.containersRunning = data.ContainersRunning;
        result.containersPaused = data.ContainersPaused;
        result.containersStopped = data.ContainersStopped;
        result.images = data.Images;
        result.driver = data.Driver;
        result.memoryLimit = data.MemoryLimit;
        result.swapLimit = data.SwapLimit;
        result.kernelMemory = data.KernelMemory;
        result.cpuCfsPeriod = data.CpuCfsPeriod;
        result.cpuCfsQuota = data.CpuCfsQuota;
        result.cpuShares = data.CPUShares;
        result.cpuSet = data.CPUSet;
        result.ipv4Forwarding = data.IPv4Forwarding;
        result.bridgeNfIptables = data.BridgeNfIptables;
        result.bridgeNfIp6tables = data.BridgeNfIp6tables;
        result.debug = data.Debug;
        result.nfd = data.NFd;
        result.oomKillDisable = data.OomKillDisable;
        result.ngoroutines = data.NGoroutines;
        result.systemTime = data.SystemTime;
        result.loggingDriver = data.LoggingDriver;
        result.cgroupDriver = data.CgroupDriver;
        result.nEventsListener = data.NEventsListener;
        result.kernelVersion = data.KernelVersion;
        result.operatingSystem = data.OperatingSystem;
        result.osType = data.OSType;
        result.architecture = data.Architecture;
        result.ncpu = data.NCPU;
        result.memTotal = data.MemTotal;
        result.dockerRootDir = data.DockerRootDir;
        result.httpProxy = data.HttpProxy;
        result.httpsProxy = data.HttpsProxy;
        result.noProxy = data.NoProxy;
        result.name = data.Name;
        result.labels = data.Labels;
        result.experimentalBuild = data.ExperimentalBuild;
        result.serverVersion = data.ServerVersion;
        result.clusterStore = data.ClusterStore;
        result.clusterAdvertise = data.ClusterAdvertise;
        result.defaultRuntime = data.DefaultRuntime;
        result.liveRestoreEnabled = data.LiveRestoreEnabled;
        result.isolation = data.Isolation;
        result.initBinary = data.InitBinary;
        result.productLicense = data.ProductLicense;
        if (callback) {
          callback(result);
        }
        resolve(result);
      });
    });
  });
}
docker.dockerInfo = dockerInfo;
function dockerImages(all, callback) {
  if (util$5.isFunction(all) && !callback) {
    callback = all;
    all = false;
  }
  if (typeof all === "string" && all === "true") {
    all = true;
  }
  if (typeof all !== "boolean" && all !== void 0) {
    all = false;
  }
  all = all || false;
  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (!_docker_socket) {
        _docker_socket = new DockerSocket2();
      }
      const workload = [];
      _docker_socket.listImages(all, (data) => {
        let dockerImages2 = {};
        try {
          dockerImages2 = data;
          if (dockerImages2 && Object.prototype.toString.call(dockerImages2) === "[object Array]" && dockerImages2.length > 0) {
            dockerImages2.forEach((element) => {
              if (element.Names && Object.prototype.toString.call(element.Names) === "[object Array]" && element.Names.length > 0) {
                element.Name = element.Names[0].replace(/^\/|\/$/g, "");
              }
              if (element.Id && typeof element.Id === "string") {
                workload.push(dockerImagesInspect(element.Id.trim(), element));
              }
            });
            if (workload.length) {
              Promise.all(workload).then((data2) => {
                if (callback) {
                  callback(data2);
                }
                resolve(data2);
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      });
    });
  });
}
function dockerImagesInspect(imageID, payload) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      imageID = imageID || "";
      if (typeof imageID !== "string") {
        return resolve();
      }
      const imageIDSanitized = util$5.isPrototypePolluted() ? "" : util$5.sanitizeImageID(imageID);
      if (imageIDSanitized) {
        if (!_docker_socket) {
          _docker_socket = new DockerSocket2();
        }
        _docker_socket.inspectImage(imageIDSanitized, (data) => {
          try {
            resolve({
              id: payload.Id,
              container: data.Container,
              comment: data.Comment,
              os: data.Os,
              architecture: data.Architecture,
              parent: data.Parent,
              dockerVersion: data.DockerVersion,
              size: data.Size,
              sharedSize: payload.SharedSize,
              virtualSize: data.VirtualSize,
              author: data.Author,
              created: data.Created ? Math.round(new Date(data.Created).getTime() / 1e3) : 0,
              containerConfig: data.ContainerConfig ? data.ContainerConfig : {},
              graphDriver: data.GraphDriver ? data.GraphDriver : {},
              repoDigests: data.RepoDigests ? data.RepoDigests : [],
              repoTags: data.RepoTags ? data.RepoTags : [],
              config: data.Config ? data.Config : {},
              rootFS: data.RootFS ? data.RootFS : {}
            });
          } catch {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}
docker.dockerImages = dockerImages;
function dockerContainers(all, callback) {
  function inContainers(containers, id) {
    return containers.some((obj) => obj.Id && obj.Id.indexOf(id) === 0);
  }
  if (util$5.isFunction(all) && !callback) {
    callback = all;
    all = false;
  }
  if (typeof all === "string" && all === "true") {
    all = true;
  }
  if (typeof all !== "boolean" && all !== void 0) {
    all = false;
  }
  all = all || false;
  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (!_docker_socket) {
        _docker_socket = new DockerSocket2();
      }
      const workload = [];
      _docker_socket.listContainers(all, (data) => {
        let docker_containers = {};
        try {
          docker_containers = data;
          if (docker_containers && Object.prototype.toString.call(docker_containers) === "[object Array]" && docker_containers.length > 0) {
            for (let key in _docker_cpu_last_read) {
              if ({}.hasOwnProperty.call(_docker_cpu_last_read, key)) {
                if (!inContainers(docker_containers, key)) {
                  delete _docker_cpu_last_read[key];
                }
              }
            }
            docker_containers.forEach((element) => {
              if (element.Names && Object.prototype.toString.call(element.Names) === "[object Array]" && element.Names.length > 0) {
                element.Name = element.Names[0].replace(/^\/|\/$/g, "");
              }
              if (element.Id && typeof element.Id === "string") {
                workload.push(dockerContainerInspect(element.Id.trim(), element));
              }
            });
            if (workload.length) {
              Promise.all(workload).then((data2) => {
                if (callback) {
                  callback(data2);
                }
                resolve(data2);
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } catch (err2) {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      });
    });
  });
}
function dockerContainerInspect(containerID, payload) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      containerID = containerID || "";
      if (typeof containerID !== "string") {
        return resolve();
      }
      const containerIdSanitized = util$5.isPrototypePolluted() ? "" : util$5.sanitizeContainerID(containerID);
      if (containerIdSanitized) {
        if (!_docker_socket) {
          _docker_socket = new DockerSocket2();
        }
        _docker_socket.getInspect(containerIdSanitized, (data) => {
          try {
            resolve({
              id: payload.Id,
              name: payload.Name,
              image: payload.Image,
              imageID: payload.ImageID,
              command: payload.Command,
              created: payload.Created,
              started: data.State && data.State.StartedAt ? Math.round(new Date(data.State.StartedAt).getTime() / 1e3) : 0,
              finished: data.State && data.State.FinishedAt && !data.State.FinishedAt.startsWith("0001-01-01") ? Math.round(new Date(data.State.FinishedAt).getTime() / 1e3) : 0,
              createdAt: data.Created ? data.Created : "",
              startedAt: data.State && data.State.StartedAt ? data.State.StartedAt : "",
              finishedAt: data.State && data.State.FinishedAt && !data.State.FinishedAt.startsWith("0001-01-01") ? data.State.FinishedAt : "",
              status: data.State && data.State.Health && data.State.Health.Status ? data.State.Health.Status : "",
              state: payload.State,
              restartCount: data.RestartCount || 0,
              platform: data.Platform || "",
              driver: data.Driver || "",
              labels: data.Config && data.Config.Labels ? data.Config.Labels : {},
              ports: payload.Ports,
              mounts: payload.Mounts
              // hostconfig: payload.HostConfig,
              // network: payload.NetworkSettings
            });
          } catch {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}
docker.dockerContainers = dockerContainers;
function docker_calcCPUPercent(cpu_stats, precpu_stats, id) {
  if (!cpu_stats || !cpu_stats.cpu_usage || !precpu_stats) {
    return 0;
  }
  const precpuTotal = precpu_stats.cpu_usage && precpu_stats.cpu_usage.total_usage ? precpu_stats.cpu_usage.total_usage : 0;
  if (!_windows$4) {
    let cpuPercent = 0;
    const cpuDelta = cpu_stats.cpu_usage.total_usage - precpuTotal;
    const systemDelta = cpu_stats.system_cpu_usage - (precpu_stats.system_cpu_usage || 0);
    if (systemDelta > 0 && cpuDelta > 0) {
      if (precpu_stats.online_cpus) {
        cpuPercent = cpuDelta / systemDelta * precpu_stats.online_cpus * 100;
      } else if (cpu_stats.cpu_usage.percpu_usage && cpu_stats.cpu_usage.percpu_usage.length) {
        cpuPercent = cpuDelta / systemDelta * cpu_stats.cpu_usage.percpu_usage.length * 100;
      }
    }
    return cpuPercent;
  } else {
    const nanoSecNow = util$5.nanoSeconds();
    let cpuPercent = 0;
    const lastRead = _docker_cpu_last_read[id] || 0;
    if (lastRead > 0) {
      const possIntervals = nanoSecNow - lastRead;
      const intervalsUsed = cpu_stats.cpu_usage.total_usage - precpuTotal;
      if (possIntervals > 0) {
        cpuPercent = 100 * intervalsUsed / possIntervals;
      }
    }
    _docker_cpu_last_read[id] = nanoSecNow;
    return cpuPercent;
  }
}
function docker_calcNetworkIO(networks) {
  let rx = 0;
  let wx = 0;
  for (let key in networks) {
    if (!{}.hasOwnProperty.call(networks, key)) {
      continue;
    }
    const obj = networks[key];
    rx = +obj.rx_bytes;
    wx = +obj.tx_bytes;
  }
  return {
    rx,
    wx
  };
}
function docker_calcBlockIO(blkio_stats) {
  let result = {
    r: 0,
    w: 0
  };
  if (blkio_stats && blkio_stats.io_service_bytes_recursive && Object.prototype.toString.call(blkio_stats.io_service_bytes_recursive) === "[object Array]" && blkio_stats.io_service_bytes_recursive.length > 0) {
    blkio_stats.io_service_bytes_recursive.forEach((element) => {
      if (element.op && element.op.toLowerCase() === "read" && element.value) {
        result.r += element.value;
      }
      if (element.op && element.op.toLowerCase() === "write" && element.value) {
        result.w += element.value;
      }
    });
  }
  return result;
}
function dockerContainerStats(containerIDs, callback) {
  let containerArray = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (util$5.isFunction(containerIDs) && !callback) {
        callback = containerIDs;
        containerArray = ["*"];
      } else {
        containerIDs = containerIDs || "*";
        if (typeof containerIDs !== "string") {
          if (callback) {
            callback([]);
          }
          return resolve([]);
        }
        let containerIDsSanitized = "";
        try {
          containerIDsSanitized.__proto__.toLowerCase = util$5.stringToLower;
          containerIDsSanitized.__proto__.replace = util$5.stringReplace;
          containerIDsSanitized.__proto__.toString = util$5.stringToString;
          containerIDsSanitized.__proto__.substr = util$5.stringSubstr;
          containerIDsSanitized.__proto__.substring = util$5.stringSubstring;
          containerIDsSanitized.__proto__.trim = util$5.stringTrim;
          containerIDsSanitized.__proto__.startsWith = util$5.stringStartWith;
        } catch (e) {
          Object.setPrototypeOf(containerIDsSanitized, util$5.stringObj);
        }
        containerIDsSanitized = containerIDs.trim();
        if (containerIDsSanitized !== "*") {
          containerIDsSanitized = util$5.isPrototypePolluted() ? "" : util$5.sanitizeContainerID(containerIDs);
        }
        containerArray = containerIDsSanitized.trim().toLowerCase().replace(/,+/g, "|").split("|").filter((item) => item.trim());
      }
      const result = [];
      const workload = [];
      if (containerArray.length && containerArray[0].trim() === "*") {
        containerArray = [];
        dockerContainers().then((allContainers) => {
          for (let container of (allContainers || []).filter(Boolean)) {
            if (container.id) {
              containerArray.push(container.id.substring(0, 12));
            }
          }
          if (containerArray.length) {
            dockerContainerStats(containerArray.join(",")).then((result2) => {
              if (callback) {
                callback(result2);
              }
              resolve(result2);
            });
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        });
      } else {
        for (let containerID of containerArray) {
          workload.push(dockerContainerStatsSingle(containerID.trim()));
        }
        if (workload.length) {
          Promise.all(workload).then((data) => {
            if (callback) {
              callback(data);
            }
            resolve(data);
          });
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      }
    });
  });
}
function dockerContainerStatsSingle(containerID) {
  containerID = containerID || "";
  const result = {
    id: containerID,
    memUsage: 0,
    memLimit: 0,
    memPercent: 0,
    cpuPercent: 0,
    pids: 0,
    netIO: {
      rx: 0,
      wx: 0
    },
    blockIO: {
      r: 0,
      w: 0
    },
    restartCount: 0,
    cpuStats: {},
    precpuStats: {},
    memoryStats: {},
    networks: {}
  };
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (containerID) {
        if (!_docker_socket) {
          _docker_socket = new DockerSocket2();
        }
        _docker_socket.getInspect(containerID, (dataInspect) => {
          try {
            _docker_socket.getStats(containerID, (data) => {
              try {
                let stats = data;
                if (!stats.message) {
                  if (data.id) {
                    result.id = data.id;
                  }
                  result.memUsage = stats.memory_stats && stats.memory_stats.usage ? stats.memory_stats.usage : 0;
                  result.memLimit = stats.memory_stats && stats.memory_stats.limit ? stats.memory_stats.limit : 0;
                  result.memPercent = stats.memory_stats && stats.memory_stats.usage && stats.memory_stats.limit ? stats.memory_stats.usage / stats.memory_stats.limit * 100 : 0;
                  result.cpuPercent = stats.cpu_stats && stats.precpu_stats ? docker_calcCPUPercent(stats.cpu_stats, stats.precpu_stats, containerID) : 0;
                  result.pids = stats.pids_stats && stats.pids_stats.current ? stats.pids_stats.current : 0;
                  result.restartCount = dataInspect.RestartCount ? dataInspect.RestartCount : 0;
                  if (stats.networks) {
                    result.netIO = docker_calcNetworkIO(stats.networks);
                  }
                  if (stats.blkio_stats) {
                    result.blockIO = docker_calcBlockIO(stats.blkio_stats);
                  }
                  result.cpuStats = stats.cpu_stats ? stats.cpu_stats : {};
                  result.precpuStats = stats.precpu_stats ? stats.precpu_stats : {};
                  result.memoryStats = stats.memory_stats ? stats.memory_stats : {};
                  result.networks = stats.networks ? stats.networks : {};
                }
              } catch {
                util$5.noop();
              }
              resolve(result);
            });
          } catch {
            util$5.noop();
          }
        });
      } else {
        resolve(result);
      }
    });
  });
}
docker.dockerContainerStats = dockerContainerStats;
function dockerContainerProcesses(containerID, callback) {
  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      containerID = containerID || "";
      if (typeof containerID !== "string") {
        return resolve(result);
      }
      const containerIdSanitized = util$5.isPrototypePolluted() ? "" : util$5.sanitizeContainerID(containerID);
      if (containerIdSanitized) {
        if (!_docker_socket) {
          _docker_socket = new DockerSocket2();
        }
        _docker_socket.getProcesses(containerIdSanitized, (data) => {
          try {
            if (data && data.Titles && data.Processes) {
              let titles = data.Titles.map(function(value) {
                return value.toUpperCase();
              });
              let pos_pid = titles.indexOf("PID");
              let pos_ppid = titles.indexOf("PPID");
              let pos_pgid = titles.indexOf("PGID");
              let pos_vsz = titles.indexOf("VSZ");
              let pos_time = titles.indexOf("TIME");
              let pos_elapsed = titles.indexOf("ELAPSED");
              let pos_ni = titles.indexOf("NI");
              let pos_ruser = titles.indexOf("RUSER");
              let pos_user = titles.indexOf("USER");
              let pos_rgroup = titles.indexOf("RGROUP");
              let pos_group = titles.indexOf("GROUP");
              let pos_stat = titles.indexOf("STAT");
              let pos_rss = titles.indexOf("RSS");
              let pos_command = titles.indexOf("COMMAND");
              data.Processes.forEach((process2) => {
                result.push({
                  pidHost: pos_pid >= 0 ? process2[pos_pid] : "",
                  ppid: pos_ppid >= 0 ? process2[pos_ppid] : "",
                  pgid: pos_pgid >= 0 ? process2[pos_pgid] : "",
                  user: pos_user >= 0 ? process2[pos_user] : "",
                  ruser: pos_ruser >= 0 ? process2[pos_ruser] : "",
                  group: pos_group >= 0 ? process2[pos_group] : "",
                  rgroup: pos_rgroup >= 0 ? process2[pos_rgroup] : "",
                  stat: pos_stat >= 0 ? process2[pos_stat] : "",
                  time: pos_time >= 0 ? process2[pos_time] : "",
                  elapsed: pos_elapsed >= 0 ? process2[pos_elapsed] : "",
                  nice: pos_ni >= 0 ? process2[pos_ni] : "",
                  rss: pos_rss >= 0 ? process2[pos_rss] : "",
                  vsz: pos_vsz >= 0 ? process2[pos_vsz] : "",
                  command: pos_command >= 0 ? process2[pos_command] : ""
                });
              });
            }
          } catch {
            util$5.noop();
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } else {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
docker.dockerContainerProcesses = dockerContainerProcesses;
function dockerVolumes(callback) {
  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      if (!_docker_socket) {
        _docker_socket = new DockerSocket2();
      }
      _docker_socket.listVolumes((data) => {
        let dockerVolumes2 = {};
        try {
          dockerVolumes2 = data;
          if (dockerVolumes2 && dockerVolumes2.Volumes && Object.prototype.toString.call(dockerVolumes2.Volumes) === "[object Array]" && dockerVolumes2.Volumes.length > 0) {
            dockerVolumes2.Volumes.forEach((element) => {
              result.push({
                name: element.Name,
                driver: element.Driver,
                labels: element.Labels,
                mountpoint: element.Mountpoint,
                options: element.Options,
                scope: element.Scope,
                created: element.CreatedAt ? Math.round(new Date(element.CreatedAt).getTime() / 1e3) : 0
              });
            });
            if (callback) {
              callback(result);
            }
            resolve(result);
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } catch {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      });
    });
  });
}
docker.dockerVolumes = dockerVolumes;
function dockerAll(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      dockerContainers(true).then((result) => {
        if (result && Object.prototype.toString.call(result) === "[object Array]" && result.length > 0) {
          let l = result.length;
          result.forEach((element) => {
            dockerContainerStats(element.id).then((res) => {
              element.memUsage = res[0].memUsage;
              element.memLimit = res[0].memLimit;
              element.memPercent = res[0].memPercent;
              element.cpuPercent = res[0].cpuPercent;
              element.pids = res[0].pids;
              element.netIO = res[0].netIO;
              element.blockIO = res[0].blockIO;
              element.cpuStats = res[0].cpuStats;
              element.precpuStats = res[0].precpuStats;
              element.memoryStats = res[0].memoryStats;
              element.networks = res[0].networks;
              dockerContainerProcesses(element.id).then((processes2) => {
                element.processes = processes2;
                l -= 1;
                if (l === 0) {
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                }
              });
            });
          });
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      });
    });
  });
}
docker.dockerAll = dockerAll;
var virtualbox = {};
const os = require$$0$1;
const exec$4 = require$$1$4.exec;
const util$4 = util$i;
function vboxInfo(callback) {
  let result = [];
  return new Promise((resolve) => {
    process.nextTick(() => {
      try {
        exec$4(util$4.getVboxmanage() + " list vms --long", (error, stdout) => {
          let parts = (os.EOL + stdout.toString()).split(os.EOL + "Name:");
          parts.shift();
          parts.forEach((part) => {
            const lines = ("Name:" + part).split(os.EOL);
            const state = util$4.getValue(lines, "State");
            const running = state.startsWith("running");
            const runningSinceString = running ? state.replace("running (since ", "").replace(")", "").trim() : "";
            let runningSince = 0;
            try {
              if (running) {
                const sinceDateObj = new Date(runningSinceString);
                const parsed = Date.parse(sinceDateObj);
                if (!isNaN(parsed)) {
                  const offset = sinceDateObj.getTimezoneOffset();
                  runningSince = Math.round((Date.now() - parsed) / 1e3) + offset * 60;
                }
              }
            } catch {
              util$4.noop();
            }
            const stoppedSinceString = !running ? state.replace("powered off (since", "").replace(")", "").trim() : "";
            let stoppedSince = 0;
            try {
              if (!running) {
                const sinceDateObj = new Date(stoppedSinceString);
                const parsed = Date.parse(sinceDateObj);
                if (!isNaN(parsed)) {
                  const offset = sinceDateObj.getTimezoneOffset();
                  stoppedSince = Math.round((Date.now() - parsed) / 1e3) + offset * 60;
                }
              }
            } catch {
              util$4.noop();
            }
            result.push({
              id: util$4.getValue(lines, "UUID"),
              name: util$4.getValue(lines, "Name"),
              running,
              started: runningSinceString,
              runningSince,
              stopped: stoppedSinceString,
              stoppedSince,
              guestOS: util$4.getValue(lines, "Guest OS"),
              hardwareUUID: util$4.getValue(lines, "Hardware UUID"),
              memory: parseInt(util$4.getValue(lines, "Memory size", "     "), 10),
              vram: parseInt(util$4.getValue(lines, "VRAM size"), 10),
              cpus: parseInt(util$4.getValue(lines, "Number of CPUs"), 10),
              cpuExepCap: util$4.getValue(lines, "CPU exec cap"),
              cpuProfile: util$4.getValue(lines, "CPUProfile"),
              chipset: util$4.getValue(lines, "Chipset"),
              firmware: util$4.getValue(lines, "Firmware"),
              pageFusion: util$4.getValue(lines, "Page Fusion") === "enabled",
              configFile: util$4.getValue(lines, "Config file"),
              snapshotFolder: util$4.getValue(lines, "Snapshot folder"),
              logFolder: util$4.getValue(lines, "Log folder"),
              hpet: util$4.getValue(lines, "HPET") === "enabled",
              pae: util$4.getValue(lines, "PAE") === "enabled",
              longMode: util$4.getValue(lines, "Long Mode") === "enabled",
              tripleFaultReset: util$4.getValue(lines, "Triple Fault Reset") === "enabled",
              apic: util$4.getValue(lines, "APIC") === "enabled",
              x2Apic: util$4.getValue(lines, "X2APIC") === "enabled",
              acpi: util$4.getValue(lines, "ACPI") === "enabled",
              ioApic: util$4.getValue(lines, "IOAPIC") === "enabled",
              biosApicMode: util$4.getValue(lines, "BIOS APIC mode"),
              bootMenuMode: util$4.getValue(lines, "Boot menu mode"),
              bootDevice1: util$4.getValue(lines, "Boot Device 1"),
              bootDevice2: util$4.getValue(lines, "Boot Device 2"),
              bootDevice3: util$4.getValue(lines, "Boot Device 3"),
              bootDevice4: util$4.getValue(lines, "Boot Device 4"),
              timeOffset: util$4.getValue(lines, "Time offset"),
              rtc: util$4.getValue(lines, "RTC")
            });
          });
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      } catch {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    });
  });
}
virtualbox.vboxInfo = vboxInfo;
var printer$1 = {};
const exec$3 = require$$1$4.exec;
const util$3 = util$i;
let _platform$3 = process.platform;
const _linux$3 = _platform$3 === "linux" || _platform$3 === "android";
const _darwin$3 = _platform$3 === "darwin";
const _windows$3 = _platform$3 === "win32";
const _freebsd$3 = _platform$3 === "freebsd";
const _openbsd$3 = _platform$3 === "openbsd";
const _netbsd$3 = _platform$3 === "netbsd";
const _sunos$3 = _platform$3 === "sunos";
const winPrinterStatus = {
  1: "Other",
  2: "Unknown",
  3: "Idle",
  4: "Printing",
  5: "Warmup",
  6: "Stopped Printing",
  7: "Offline"
};
function parseLinuxCupsHeader(lines) {
  const result = {};
  if (lines && lines.length) {
    if (lines[0].indexOf(" CUPS v") > 0) {
      const parts = lines[0].split(" CUPS v");
      result.cupsVersion = parts[1];
    }
  }
  return result;
}
function parseLinuxCupsPrinter(lines) {
  const result = {};
  const printerId = util$3.getValue(lines, "PrinterId", " ");
  result.id = printerId ? parseInt(printerId, 10) : null;
  result.name = util$3.getValue(lines, "Info", " ");
  result.model = lines.length > 0 && lines[0] ? lines[0].split(" ")[0] : "";
  result.uri = util$3.getValue(lines, "DeviceURI", " ");
  result.uuid = util$3.getValue(lines, "UUID", " ");
  result.status = util$3.getValue(lines, "State", " ");
  result.local = util$3.getValue(lines, "Location", " ").toLowerCase().startsWith("local");
  result.default = null;
  result.shared = util$3.getValue(lines, "Shared", " ").toLowerCase().startsWith("yes");
  return result;
}
function parseLinuxLpstatPrinter(lines, id) {
  const result = {};
  result.id = id;
  result.name = util$3.getValue(lines, "Description", ":", true);
  result.model = lines.length > 0 && lines[0] ? lines[0].split(" ")[0] : "";
  result.uri = null;
  result.uuid = null;
  result.status = lines.length > 0 && lines[0] ? lines[0].indexOf(" idle") > 0 ? "idle" : lines[0].indexOf(" printing") > 0 ? "printing" : "unknown" : null;
  result.local = util$3.getValue(lines, "Location", ":", true).toLowerCase().startsWith("local");
  result.default = null;
  result.shared = util$3.getValue(lines, "Shared", " ").toLowerCase().startsWith("yes");
  return result;
}
function parseDarwinPrinters(printerObject, id) {
  const result = {};
  const uriParts = printerObject.uri.split("/");
  result.id = id;
  result.name = printerObject._name;
  result.model = uriParts.length ? uriParts[uriParts.length - 1] : "";
  result.uri = printerObject.uri;
  result.uuid = null;
  result.status = printerObject.status;
  result.local = printerObject.printserver === "local";
  result.default = printerObject.default === "yes";
  result.shared = printerObject.shared === "yes";
  return result;
}
function parseWindowsPrinters(lines, id) {
  const result = {};
  const status = parseInt(util$3.getValue(lines, "PrinterStatus", ":"), 10);
  result.id = id;
  result.name = util$3.getValue(lines, "name", ":");
  result.model = util$3.getValue(lines, "DriverName", ":");
  result.uri = null;
  result.uuid = null;
  result.status = winPrinterStatus[status] ? winPrinterStatus[status] : null;
  result.local = util$3.getValue(lines, "Local", ":").toUpperCase() === "TRUE";
  result.default = util$3.getValue(lines, "Default", ":").toUpperCase() === "TRUE";
  result.shared = util$3.getValue(lines, "Shared", ":").toUpperCase() === "TRUE";
  return result;
}
function printer(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux$3 || _freebsd$3 || _openbsd$3 || _netbsd$3) {
        let cmd = "cat /etc/cups/printers.conf 2>/dev/null";
        exec$3(cmd, (error, stdout) => {
          if (!error) {
            const parts = stdout.toString().split("<Printer ");
            const printerHeader = parseLinuxCupsHeader(parts[0].split("\n"));
            for (let i = 1; i < parts.length; i++) {
              const printers = parseLinuxCupsPrinter(parts[i].split("\n"));
              if (printers.name) {
                printers.engine = "CUPS";
                printers.engineVersion = printerHeader.cupsVersion;
                result.push(printers);
              }
            }
          }
          if (result.length === 0) {
            if (_linux$3) {
              cmd = "export LC_ALL=C; lpstat -lp 2>/dev/null; unset LC_ALL";
              exec$3(cmd, (error2, stdout2) => {
                const parts = ("\n" + stdout2.toString()).split("\nprinter ");
                for (let i = 1; i < parts.length; i++) {
                  const printers = parseLinuxLpstatPrinter(parts[i].split("\n"), i);
                  result.push(printers);
                }
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
            } else {
              if (callback) {
                callback(result);
              }
              resolve(result);
            }
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        });
      }
      if (_darwin$3) {
        let cmd = "system_profiler SPPrintersDataType -json";
        exec$3(cmd, (error, stdout) => {
          if (!error) {
            try {
              const outObj = JSON.parse(stdout.toString());
              if (outObj.SPPrintersDataType && outObj.SPPrintersDataType.length) {
                for (let i = 0; i < outObj.SPPrintersDataType.length; i++) {
                  const printer2 = parseDarwinPrinters(outObj.SPPrintersDataType[i], i);
                  result.push(printer2);
                }
              }
            } catch {
              util$3.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows$3) {
        util$3.powerShell("Get-CimInstance Win32_Printer | select PrinterStatus,Name,DriverName,Local,Default,Shared | fl").then((stdout, error) => {
          if (!error) {
            const parts = stdout.toString().split(/\n\s*\n/);
            for (let i = 0; i < parts.length; i++) {
              const printer2 = parseWindowsPrinters(parts[i].split("\n"), i);
              if (printer2.name || printer2.model) {
                result.push(printer2);
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$3) {
        resolve(null);
      }
    });
  });
}
printer$1.printer = printer;
var usb$1 = {};
const exec$2 = require$$1$4.exec;
const util$2 = util$i;
let _platform$2 = process.platform;
const _linux$2 = _platform$2 === "linux" || _platform$2 === "android";
const _darwin$2 = _platform$2 === "darwin";
const _windows$2 = _platform$2 === "win32";
const _freebsd$2 = _platform$2 === "freebsd";
const _openbsd$2 = _platform$2 === "openbsd";
const _netbsd$2 = _platform$2 === "netbsd";
const _sunos$2 = _platform$2 === "sunos";
function getLinuxUsbType(type, name) {
  let result = type;
  const str = (name + " " + type).toLowerCase();
  if (str.indexOf("camera") >= 0) {
    result = "Camera";
  } else if (str.indexOf("hub") >= 0) {
    result = "Hub";
  } else if (str.indexOf("keybrd") >= 0) {
    result = "Keyboard";
  } else if (str.indexOf("keyboard") >= 0) {
    result = "Keyboard";
  } else if (str.indexOf("mouse") >= 0) {
    result = "Mouse";
  } else if (str.indexOf("stora") >= 0) {
    result = "Storage";
  } else if (str.indexOf("microp") >= 0) {
    result = "Microphone";
  } else if (str.indexOf("headset") >= 0) {
    result = "Audio";
  } else if (str.indexOf("audio") >= 0) {
    result = "Audio";
  }
  return result;
}
function parseLinuxUsb(usb2) {
  const result = {};
  const lines = usb2.split("\n");
  if (lines && lines.length && lines[0].indexOf("Device") >= 0) {
    const parts = lines[0].split(" ");
    result.bus = parseInt(parts[0], 10);
    if (parts[2]) {
      result.deviceId = parseInt(parts[2], 10);
    } else {
      result.deviceId = null;
    }
  } else {
    result.bus = null;
    result.deviceId = null;
  }
  const idVendor = util$2.getValue(lines, "idVendor", " ", true).trim();
  let vendorParts = idVendor.split(" ");
  vendorParts.shift();
  const vendor = vendorParts.join(" ");
  const idProduct = util$2.getValue(lines, "idProduct", " ", true).trim();
  let productParts = idProduct.split(" ");
  productParts.shift();
  const product = productParts.join(" ");
  const interfaceClass = util$2.getValue(lines, "bInterfaceClass", " ", true).trim();
  let interfaceClassParts = interfaceClass.split(" ");
  interfaceClassParts.shift();
  const usbType = interfaceClassParts.join(" ");
  const iManufacturer = util$2.getValue(lines, "iManufacturer", " ", true).trim();
  let iManufacturerParts = iManufacturer.split(" ");
  iManufacturerParts.shift();
  const manufacturer = iManufacturerParts.join(" ");
  const iSerial = util$2.getValue(lines, "iSerial", " ", true).trim();
  let iSerialParts = iSerial.split(" ");
  iSerialParts.shift();
  const serial = iSerialParts.join(" ");
  result.id = (idVendor.startsWith("0x") ? idVendor.split(" ")[0].substr(2, 10) : "") + ":" + (idProduct.startsWith("0x") ? idProduct.split(" ")[0].substr(2, 10) : "");
  result.name = product;
  result.type = getLinuxUsbType(usbType, product);
  result.removable = null;
  result.vendor = vendor;
  result.manufacturer = manufacturer;
  result.maxPower = util$2.getValue(lines, "MaxPower", " ", true);
  result.serialNumber = serial;
  return result;
}
function getDarwinUsbType(name) {
  let result = "";
  if (name.indexOf("camera") >= 0) {
    result = "Camera";
  } else if (name.indexOf("touch bar") >= 0) {
    result = "Touch Bar";
  } else if (name.indexOf("controller") >= 0) {
    result = "Controller";
  } else if (name.indexOf("headset") >= 0) {
    result = "Audio";
  } else if (name.indexOf("keyboard") >= 0) {
    result = "Keyboard";
  } else if (name.indexOf("trackpad") >= 0) {
    result = "Trackpad";
  } else if (name.indexOf("sensor") >= 0) {
    result = "Sensor";
  } else if (name.indexOf("bthusb") >= 0) {
    result = "Bluetooth";
  } else if (name.indexOf("bth") >= 0) {
    result = "Bluetooth";
  } else if (name.indexOf("rfcomm") >= 0) {
    result = "Bluetooth";
  } else if (name.indexOf("usbhub") >= 0) {
    result = "Hub";
  } else if (name.indexOf(" hub") >= 0) {
    result = "Hub";
  } else if (name.indexOf("mouse") >= 0) {
    result = "Mouse";
  } else if (name.indexOf("microp") >= 0) {
    result = "Microphone";
  } else if (name.indexOf("removable") >= 0) {
    result = "Storage";
  }
  return result;
}
function parseDarwinUsb(usb2, id) {
  const result = {};
  result.id = id;
  usb2 = usb2.replace(/ \|/g, "");
  usb2 = usb2.trim();
  let lines = usb2.split("\n");
  lines.shift();
  try {
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].trim();
      lines[i] = lines[i].replace(/=/g, ":");
      if (lines[i] !== "{" && lines[i] !== "}" && lines[i + 1] && lines[i + 1].trim() !== "}") {
        lines[i] = lines[i] + ",";
      }
      lines[i] = lines[i].replace(":Yes,", ':"Yes",');
      lines[i] = lines[i].replace(": Yes,", ': "Yes",');
      lines[i] = lines[i].replace(": Yes", ': "Yes"');
      lines[i] = lines[i].replace(":No,", ':"No",');
      lines[i] = lines[i].replace(": No,", ': "No",');
      lines[i] = lines[i].replace(": No", ': "No"');
      lines[i] = lines[i].replace("((", "").replace("))", "");
      const match = /<(\w+)>/.exec(lines[i]);
      if (match) {
        const number = match[0];
        lines[i] = lines[i].replace(number, `"${number}"`);
      }
    }
    const usbObj = JSON.parse(lines.join("\n"));
    const removableDrive = (usbObj["Built-In"] ? usbObj["Built-In"].toLowerCase() !== "yes" : true) && (usbObj["non-removable"] ? usbObj["non-removable"].toLowerCase() === "no" : true);
    result.bus = null;
    result.deviceId = null;
    result.id = usbObj["USB Address"] || null;
    result.name = usbObj["kUSBProductString"] || usbObj["USB Product Name"] || null;
    result.type = getDarwinUsbType((usbObj["kUSBProductString"] || usbObj["USB Product Name"] || "").toLowerCase() + (removableDrive ? " removable" : ""));
    result.removable = usbObj["non-removable"] ? usbObj["non-removable"].toLowerCase() || false : true;
    result.vendor = usbObj["kUSBVendorString"] || usbObj["USB Vendor Name"] || null;
    result.manufacturer = usbObj["kUSBVendorString"] || usbObj["USB Vendor Name"] || null;
    result.maxPower = null;
    result.serialNumber = usbObj["kUSBSerialNumberString"] || null;
    if (result.name) {
      return result;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}
function getWindowsUsbTypeCreation(creationclass, name) {
  let result = "";
  if (name.indexOf("storage") >= 0) {
    result = "Storage";
  } else if (name.indexOf("speicher") >= 0) {
    result = "Storage";
  } else if (creationclass.indexOf("usbhub") >= 0) {
    result = "Hub";
  } else if (creationclass.indexOf("storage") >= 0) {
    result = "Storage";
  } else if (creationclass.indexOf("usbcontroller") >= 0) {
    result = "Controller";
  } else if (creationclass.indexOf("keyboard") >= 0) {
    result = "Keyboard";
  } else if (creationclass.indexOf("pointing") >= 0) {
    result = "Mouse";
  } else if (creationclass.indexOf("microp") >= 0) {
    result = "Microphone";
  } else if (creationclass.indexOf("disk") >= 0) {
    result = "Storage";
  }
  return result;
}
function parseWindowsUsb(lines, id) {
  const usbType = getWindowsUsbTypeCreation(util$2.getValue(lines, "CreationClassName", ":").toLowerCase(), util$2.getValue(lines, "name", ":").toLowerCase());
  if (usbType) {
    const result = {};
    result.bus = null;
    result.deviceId = util$2.getValue(lines, "deviceid", ":");
    result.id = id;
    result.name = util$2.getValue(lines, "name", ":");
    result.type = usbType;
    result.removable = null;
    result.vendor = null;
    result.manufacturer = util$2.getValue(lines, "Manufacturer", ":");
    result.maxPower = null;
    result.serialNumber = null;
    return result;
  } else {
    return null;
  }
}
function usb(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux$2) {
        const cmd = "export LC_ALL=C; lsusb -v 2>/dev/null; unset LC_ALL";
        exec$2(cmd, { maxBuffer: 1024 * 1024 * 128 }, function(error, stdout) {
          if (!error) {
            const parts = ("\n\n" + stdout.toString()).split("\n\nBus ");
            for (let i = 1; i < parts.length; i++) {
              const usb2 = parseLinuxUsb(parts[i]);
              result.push(usb2);
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_darwin$2) {
        let cmd = "ioreg -p IOUSB -c AppleUSBRootHubDevice -w0 -l";
        exec$2(cmd, { maxBuffer: 1024 * 1024 * 128 }, function(error, stdout) {
          if (!error) {
            const parts = stdout.toString().split(" +-o ");
            for (let i = 1; i < parts.length; i++) {
              const usb2 = parseDarwinUsb(parts[i]);
              if (usb2) {
                result.push(usb2);
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows$2) {
        util$2.powerShell('Get-CimInstance CIM_LogicalDevice | where { $_.Description -match "USB"} | select Name,CreationClassName,DeviceId,Manufacturer | fl').then((stdout, error) => {
          if (!error) {
            const parts = stdout.toString().split(/\n\s*\n/);
            for (let i = 0; i < parts.length; i++) {
              const usb2 = parseWindowsUsb(parts[i].split("\n"), i);
              if (usb2 && result.filter((x) => x.deviceId === usb2.deviceId).length === 0) {
                result.push(usb2);
              }
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$2 || _freebsd$2 || _openbsd$2 || _netbsd$2) {
        resolve(null);
      }
    });
  });
}
usb$1.usb = usb;
var audio$1 = {};
const exec$1 = require$$1$4.exec;
const execSync$1 = require$$1$4.execSync;
const util$1 = util$i;
const _platform$1 = process.platform;
const _linux$1 = _platform$1 === "linux" || _platform$1 === "android";
const _darwin$1 = _platform$1 === "darwin";
const _windows$1 = _platform$1 === "win32";
const _freebsd$1 = _platform$1 === "freebsd";
const _openbsd$1 = _platform$1 === "openbsd";
const _netbsd$1 = _platform$1 === "netbsd";
const _sunos$1 = _platform$1 === "sunos";
function parseAudioType(str, input, output) {
  str = str.toLowerCase();
  let result = "";
  if (str.indexOf("input") >= 0) {
    result = "Microphone";
  }
  if (str.indexOf("display audio") >= 0) {
    result = "Speaker";
  }
  if (str.indexOf("speak") >= 0) {
    result = "Speaker";
  }
  if (str.indexOf("laut") >= 0) {
    result = "Speaker";
  }
  if (str.indexOf("loud") >= 0) {
    result = "Speaker";
  }
  if (str.indexOf("head") >= 0) {
    result = "Headset";
  }
  if (str.indexOf("mic") >= 0) {
    result = "Microphone";
  }
  if (str.indexOf("mikr") >= 0) {
    result = "Microphone";
  }
  if (str.indexOf("phone") >= 0 && str.indexOf("headphone") < 0) {
    result = "Phone";
  }
  if (str.indexOf("controll") >= 0) {
    result = "Controller";
  }
  if (str.indexOf("line o") >= 0) {
    result = "Line Out";
  }
  if (str.indexOf("digital o") >= 0) {
    result = "Digital Out";
  }
  if (str.indexOf("smart sound technology") >= 0) {
    result = "Digital Signal Processor";
  }
  if (str.indexOf("high definition audio") >= 0) {
    result = "Sound Driver";
  }
  if (!result && output) {
    result = "Speaker";
  } else if (!result && input) {
    result = "Microphone";
  }
  return result;
}
function getLinuxAudioPci() {
  const cmd = "lspci -v 2>/dev/null";
  const result = [];
  try {
    const parts = execSync$1(cmd, util$1.execOptsLinux).toString().split("\n\n");
    parts.forEach((element) => {
      const lines = element.split("\n");
      if (lines && lines.length && lines[0].toLowerCase().indexOf("audio") >= 0) {
        const audio2 = {};
        audio2.slotId = lines[0].split(" ")[0];
        audio2.driver = util$1.getValue(lines, "Kernel driver in use", ":", true) || util$1.getValue(lines, "Kernel modules", ":", true);
        result.push(audio2);
      }
    });
    return result;
  } catch {
    return result;
  }
}
function parseLinuxAudioAlsa(stdout) {
  const result = [];
  const parts = stdout.split("--pcm--");
  const cards = parts[0] || "";
  const pcms = parts[1] || "";
  const lines = cards.split("\n");
  lines.forEach((line, i) => {
    const card = line.match(/^\s*(\d+)\s+\[(.+?)\s*\]:\s*(.*)$/);
    if (card && card[3].trim()) {
      const index = card[1];
      const sep = card[3].lastIndexOf(" - ");
      const name = (sep >= 0 ? card[3].substring(sep + 3) : card[3]).trim();
      let driver = (sep >= 0 ? card[3].substring(0, sep) : "").trim();
      if (name && driver.endsWith(name)) {
        driver = driver.substring(0, driver.length - name.length).trim();
      }
      const longName = (lines[i + 1] || "").trim();
      const manufacturer = longName.indexOf(name) > 0 ? longName.substring(0, longName.indexOf(name)).trim() : "";
      const devices = pcms.split("\n").filter((pcm) => pcm.indexOf("/card" + index + "/pcm") >= 0);
      const out = devices.some((pcm) => pcm.trim().endsWith("p"));
      const isIn = devices.some((pcm) => pcm.trim().endsWith("c"));
      const usb2 = (driver + " " + longName).toLowerCase().indexOf("usb") >= 0;
      const hdmi = (card[2] + " " + name).toLowerCase().indexOf("hdmi") >= 0;
      result.push({
        id: "hw:" + index,
        name,
        manufacturer,
        revision: null,
        driver,
        default: null,
        channel: usb2 ? "USB" : hdmi ? "HDMI" : "Onboard",
        type: parseAudioType(name, isIn, out),
        in: devices.length ? isIn : null,
        out: devices.length ? out : null,
        status: "online"
      });
    }
  });
  return result;
}
function parseWinAudioStatus(n) {
  const num = parseInt(n, 10);
  let status = n;
  if (num === 1) {
    status = "other";
  } else if (num === 2) {
    status = "unknown";
  } else if (num === 3) {
    status = "enabled";
  } else if (num === 4) {
    status = "disabled";
  } else if (num === 5) {
    status = "not applicable";
  }
  return status;
}
function parseLinuxAudioPciMM(lines, audioPCI) {
  const result = {};
  const slotId = util$1.getValue(lines, "Slot");
  const pciMatch = audioPCI.filter((item) => item.slotId === slotId);
  result.id = slotId;
  result.name = util$1.getValue(lines, "SDevice");
  result.manufacturer = util$1.getValue(lines, "SVendor");
  result.revision = util$1.getValue(lines, "Rev");
  result.driver = pciMatch && pciMatch.length === 1 && pciMatch[0].driver ? pciMatch[0].driver : "";
  result.default = null;
  result.channel = "PCIe";
  result.type = parseAudioType(result.name, null, null);
  result.in = null;
  result.out = null;
  result.status = "online";
  return result;
}
function parseDarwinChannel(str) {
  let result = "";
  if (str.indexOf("builtin") >= 0) {
    result = "Built-In";
  }
  if (str.indexOf("extern") >= 0) {
    result = "Audio-Jack";
  }
  if (str.indexOf("hdmi") >= 0) {
    result = "HDMI";
  }
  if (str.indexOf("displayport") >= 0) {
    result = "Display-Port";
  }
  if (str.indexOf("usb") >= 0) {
    result = "USB";
  }
  if (str.indexOf("pci") >= 0) {
    result = "PCIe";
  }
  return result;
}
function parseDarwinAudio(audioObject, id) {
  const result = {};
  const channelStr = ((audioObject.coreaudio_device_transport || "") + " " + (audioObject._name || "")).toLowerCase();
  result.id = id;
  result.name = audioObject._name;
  result.manufacturer = audioObject.coreaudio_device_manufacturer;
  result.revision = null;
  result.driver = null;
  result.default = !!(audioObject.coreaudio_default_audio_input_device || "") || !!(audioObject.coreaudio_default_audio_output_device || "");
  result.channel = parseDarwinChannel(channelStr);
  result.type = parseAudioType(result.name, !!(audioObject.coreaudio_device_input || ""), !!(audioObject.coreaudio_device_output || ""));
  result.in = !!(audioObject.coreaudio_device_input || "");
  result.out = !!(audioObject.coreaudio_device_output || "");
  result.status = "online";
  return result;
}
function parseWindowsAudio(lines) {
  const result = {};
  const status = parseWinAudioStatus(util$1.getValue(lines, "StatusInfo", ":"));
  result.id = util$1.getValue(lines, "DeviceID", ":");
  result.name = util$1.getValue(lines, "name", ":");
  result.manufacturer = util$1.getValue(lines, "manufacturer", ":");
  result.revision = null;
  result.driver = null;
  result.default = null;
  result.channel = null;
  result.type = parseAudioType(result.name, null, null);
  result.in = null;
  result.out = null;
  result.status = status;
  return result;
}
function audio(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      const result = [];
      if (_linux$1 || _freebsd$1 || _openbsd$1 || _netbsd$1) {
        const cmd = "lspci -vmm 2>/dev/null";
        exec$1(cmd, (error, stdout) => {
          if (!error) {
            const audioPCI = getLinuxAudioPci();
            const parts = stdout.toString().split("\n\n");
            parts.forEach((element) => {
              const lines = element.split("\n");
              if (util$1.getValue(lines, "class", ":", true).toLowerCase().indexOf("audio") >= 0) {
                const audio2 = parseLinuxAudioPciMM(lines, audioPCI);
                result.push(audio2);
              }
            });
          }
          if (!result.length) {
            const cmdAlsa = 'cat /proc/asound/cards 2>/dev/null; echo "--pcm--"; ls -d /proc/asound/card*/pcm* 2>/dev/null';
            exec$1(cmdAlsa, util$1.execOptsLinux, (error2, stdout2) => {
              if (!error2) {
                parseLinuxAudioAlsa(stdout2.toString()).forEach((item) => result.push(item));
              }
              if (callback) {
                callback(result);
              }
              resolve(result);
            });
          } else {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        });
      }
      if (_darwin$1) {
        const cmd = "system_profiler SPAudioDataType -json";
        exec$1(cmd, (error, stdout) => {
          if (!error) {
            try {
              const outObj = JSON.parse(stdout.toString());
              if (outObj.SPAudioDataType && outObj.SPAudioDataType.length && outObj.SPAudioDataType[0] && outObj.SPAudioDataType[0]["_items"] && outObj.SPAudioDataType[0]["_items"].length) {
                for (let i = 0; i < outObj.SPAudioDataType[0]["_items"].length; i++) {
                  const audio2 = parseDarwinAudio(outObj.SPAudioDataType[0]["_items"][i], i);
                  result.push(audio2);
                }
              }
            } catch {
              util$1.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows$1) {
        util$1.powerShell("Get-CimInstance Win32_SoundDevice | select DeviceID,StatusInfo,Name,Manufacturer | fl").then((stdout, error) => {
          if (!error) {
            const parts = stdout.toString().split(/\n\s*\n/);
            parts.forEach((element) => {
              const lines = element.split("\n");
              if (util$1.getValue(lines, "name", ":")) {
                result.push(parseWindowsAudio(lines));
              }
            });
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_sunos$1) {
        resolve(null);
      }
    });
  });
}
audio$1.audio = audio;
var bluetooth = {};
var bluetoothVendors$1 = {
  0: "Ericsson Technology Licensing",
  1: "Nokia Mobile Phones",
  2: "Intel Corp.",
  3: "IBM Corp.",
  4: "Toshiba Corp.",
  5: "3Com",
  6: "Microsoft",
  7: "Lucent",
  8: "Motorola",
  9: "Infineon Technologies AG",
  10: "Cambridge Silicon Radio",
  11: "Silicon Wave",
  12: "Digianswer A/S",
  13: "Texas Instruments Inc.",
  14: "Ceva, Inc. (formerly Parthus Technologies, Inc.)",
  15: "Broadcom Corporation",
  16: "Mitel Semiconductor",
  17: "Widcomm, Inc",
  18: "Zeevo, Inc.",
  19: "Atmel Corporation",
  20: "Mitsubishi Electric Corporation",
  21: "RTX Telecom A/S",
  22: "KC Technology Inc.",
  23: "NewLogic",
  24: "Transilica, Inc.",
  25: "Rohde & Schwarz GmbH & Co. KG",
  26: "TTPCom Limited",
  27: "Signia Technologies, Inc.",
  28: "Conexant Systems Inc.",
  29: "Qualcomm",
  30: "Inventel",
  31: "AVM Berlin",
  32: "BandSpeed, Inc.",
  33: "Mansella Ltd",
  34: "NEC Corporation",
  35: "WavePlus Technology Co., Ltd.",
  36: "Alcatel",
  37: "NXP Semiconductors (formerly Philips Semiconductors)",
  38: "C Technologies",
  39: "Open Interface",
  40: "R F Micro Devices",
  41: "Hitachi Ltd",
  42: "Symbol Technologies, Inc.",
  43: "Tenovis",
  44: "Macronix International Co. Ltd.",
  45: "GCT Semiconductor",
  46: "Norwood Systems",
  47: "MewTel Technology Inc.",
  48: "ST Microelectronics",
  49: "Synopsis",
  50: "Red-M (Communications) Ltd",
  51: "Commil Ltd",
  52: "Computer Access Technology Corporation (CATC)",
  53: "Eclipse (HQ Espana) S.L.",
  54: "Renesas Electronics Corporation",
  55: "Mobilian Corporation",
  56: "Terax",
  57: "Integrated System Solution Corp.",
  58: "Matsushita Electric Industrial Co., Ltd.",
  59: "Gennum Corporation",
  60: "BlackBerry Limited (formerly Research In Motion)",
  61: "IPextreme, Inc.",
  62: "Systems and Chips, Inc.",
  63: "Bluetooth SIG, Inc.",
  64: "Seiko Epson Corporation",
  65: "Integrated Silicon Solution Taiwan, Inc.",
  66: "CONWISE Technology Corporation Ltd",
  67: "PARROT SA",
  68: "Socket Mobile",
  69: "Atheros Communications, Inc.",
  70: "MediaTek, Inc.",
  71: "Bluegiga",
  72: "Marvell Technology Group Ltd.",
  73: "3DSP Corporation",
  74: "Accel Semiconductor Ltd.",
  75: "Continental Automotive Systems",
  76: "Apple, Inc.",
  77: "Staccato Communications, Inc.",
  78: "Avago Technologies",
  79: "APT Licensing Ltd.",
  80: "SiRF Technology",
  81: "Tzero Technologies, Inc.",
  82: "J&M Corporation",
  83: "Free2move AB",
  84: "3DiJoy Corporation",
  85: "Plantronics, Inc.",
  86: "Sony Ericsson Mobile Communications",
  87: "Harman International Industries, Inc.",
  88: "Vizio, Inc.",
  89: "Nordic Semiconductor ASA",
  90: "EM Microelectronic-Marin SA",
  91: "Ralink Technology Corporation",
  92: "Belkin International, Inc.",
  93: "Realtek Semiconductor Corporation",
  94: "Stonestreet One, LLC",
  95: "Wicentric, Inc.",
  96: "RivieraWaves S.A.S",
  97: "RDA Microelectronics",
  98: "Gibson Guitars",
  99: "MiCommand Inc.",
  100: "Band XI International, LLC",
  101: "Hewlett-Packard Company",
  102: "9Solutions Oy",
  103: "GN Netcom A/S",
  104: "General Motors",
  105: "A&D Engineering, Inc.",
  106: "MindTree Ltd.",
  107: "Polar Electro OY",
  108: "Beautiful Enterprise Co., Ltd.",
  109: "BriarTek, Inc.",
  110: "Summit Data Communications, Inc.",
  111: "Sound ID",
  112: "Monster, LLC",
  113: "connectBlue AB",
  114: "ShangHai Super Smart Electronics Co. Ltd.",
  115: "Group Sense Ltd.",
  116: "Zomm, LLC",
  117: "Samsung Electronics Co. Ltd.",
  118: "Creative Technology Ltd.",
  119: "Laird Technologies",
  120: "Nike, Inc.",
  121: "lesswire AG",
  122: "MStar Semiconductor, Inc.",
  123: "Hanlynn Technologies",
  124: "A & R Cambridge",
  125: "Seers Technology Co. Ltd",
  126: "Sports Tracking Technologies Ltd.",
  127: "Autonet Mobile",
  128: "DeLorme Publishing Company, Inc.",
  129: "WuXi Vimicro",
  130: "Sennheiser Communications A/S",
  131: "TimeKeeping Systems, Inc.",
  132: "Ludus Helsinki Ltd.",
  133: "BlueRadios, Inc.",
  134: "equinox AG",
  135: "Garmin International, Inc.",
  136: "Ecotest",
  137: "GN ReSound A/S",
  138: "Jawbone",
  139: "Topcorn Positioning Systems, LLC",
  140: "Gimbal Inc. (formerly Qualcomm Labs, Inc. and Qualcomm Retail Solutions, Inc.)",
  141: "Zscan Software",
  142: "Quintic Corp.",
  143: "Stollman E+V GmbH",
  144: "Funai Electric Co., Ltd.",
  145: "Advanced PANMOBIL Systems GmbH & Co. KG",
  146: "ThinkOptics, Inc.",
  147: "Universal Electronics, Inc.",
  148: "Airoha Technology Corp.",
  149: "NEC Lighting, Ltd.",
  150: "ODM Technology, Inc.",
  151: "ConnecteDevice Ltd.",
  152: "zer01.tv GmbH",
  153: "i.Tech Dynamic Global Distribution Ltd.",
  154: "Alpwise",
  155: "Jiangsu Toppower Automotive Electronics Co., Ltd.",
  156: "Colorfy, Inc.",
  157: "Geoforce Inc.",
  158: "Bose Corporation",
  159: "Suunto Oy",
  160: "Kensington Computer Products Group",
  161: "SR-Medizinelektronik",
  162: "Vertu Corporation Limited",
  163: "Meta Watch Ltd.",
  164: "LINAK A/S",
  165: "OTL Dynamics LLC",
  166: "Panda Ocean Inc.",
  167: "Visteon Corporation",
  168: "ARP Devices Limited",
  169: "Magneti Marelli S.p.A",
  170: "CAEN RFID srl",
  171: "Ingenieur-Systemgruppe Zahn GmbH",
  172: "Green Throttle Games",
  173: "Peter Systemtechnik GmbH",
  174: "Omegawave Oy",
  175: "Cinetix",
  176: "Passif Semiconductor Corp",
  177: "Saris Cycling Group, Inc",
  178: "Bekey A/S",
  179: "Clarinox Technologies Pty. Ltd.",
  180: "BDE Technology Co., Ltd.",
  181: "Swirl Networks",
  182: "Meso international",
  183: "TreLab Ltd",
  184: "Qualcomm Innovation Center, Inc. (QuIC)",
  185: "Johnson Controls, Inc.",
  186: "Starkey Laboratories Inc.",
  187: "S-Power Electronics Limited",
  188: "Ace Sensor Inc",
  189: "Aplix Corporation",
  190: "AAMP of America",
  191: "Stalmart Technology Limited",
  192: "AMICCOM Electronics Corporation",
  193: "Shenzhen Excelsecu Data Technology Co.,Ltd",
  194: "Geneq Inc.",
  195: "adidas AG",
  196: "LG Electronics",
  197: "Onset Computer Corporation",
  198: "Selfly BV",
  199: "Quuppa Oy.",
  200: "GeLo Inc",
  201: "Evluma",
  202: "MC10",
  203: "Binauric SE",
  204: "Beats Electronics",
  205: "Microchip Technology Inc.",
  206: "Elgato Systems GmbH",
  207: "ARCHOS SA",
  208: "Dexcom, Inc.",
  209: "Polar Electro Europe B.V.",
  210: "Dialog Semiconductor B.V.",
  211: "Taixingbang Technology (HK) Co,. LTD.",
  212: "Kawantech",
  213: "Austco Communication Systems",
  214: "Timex Group USA, Inc.",
  215: "Qualcomm Technologies, Inc.",
  216: "Qualcomm Connected Experiences, Inc.",
  217: "Voyetra Turtle Beach",
  218: "txtr GmbH",
  219: "Biosentronics",
  220: "Procter & Gamble",
  221: "Hosiden Corporation",
  222: "Muzik LLC",
  223: "Misfit Wearables Corp",
  224: "Google",
  225: "Danlers Ltd",
  226: "Semilink Inc",
  227: "inMusic Brands, Inc",
  228: "L.S. Research Inc.",
  229: "Eden Software Consultants Ltd.",
  230: "Freshtemp",
  231: "KS Technologies",
  232: "ACTS Technologies",
  233: "Vtrack Systems",
  234: "Nielsen-Kellerman Company",
  235: "Server Technology, Inc.",
  236: "BioResearch Associates",
  237: "Jolly Logic, LLC",
  238: "Above Average Outcomes, Inc.",
  239: "Bitsplitters GmbH",
  240: "PayPal, Inc.",
  241: "Witron Technology Limited",
  242: "Aether Things Inc. (formerly Morse Project Inc.)",
  243: "Kent Displays Inc.",
  244: "Nautilus Inc.",
  245: "Smartifier Oy",
  246: "Elcometer Limited",
  247: "VSN Technologies Inc.",
  248: "AceUni Corp., Ltd.",
  249: "StickNFind",
  250: "Crystal Code AB",
  251: "KOUKAAM a.s.",
  252: "Delphi Corporation",
  253: "ValenceTech Limited",
  254: "Reserved",
  255: "Typo Products, LLC",
  256: "TomTom International BV",
  257: "Fugoo, Inc",
  258: "Keiser Corporation",
  259: "Bang & Olufsen A/S",
  260: "PLUS Locations Systems Pty Ltd",
  261: "Ubiquitous Computing Technology Corporation",
  262: "Innovative Yachtter Solutions",
  263: "William Demant Holding A/S",
  264: "Chicony Electronics Co., Ltd.",
  265: "Atus BV",
  266: "Codegate Ltd.",
  267: "ERi, Inc.",
  268: "Transducers Direct, LLC",
  269: "Fujitsu Ten Limited",
  270: "Audi AG",
  271: "HiSilicon Technologies Co., Ltd.",
  272: "Nippon Seiki Co., Ltd.",
  273: "Steelseries ApS",
  274: "vyzybl Inc.",
  275: "Openbrain Technologies, Co., Ltd.",
  276: "Xensr",
  277: "e.solutions",
  278: "1OAK Technologies",
  279: "Wimoto Technologies Inc",
  280: "Radius Networks, Inc.",
  281: "Wize Technology Co., Ltd.",
  282: "Qualcomm Labs, Inc.",
  283: "Aruba Networks",
  284: "Baidu",
  285: "Arendi AG",
  286: "Skoda Auto a.s.",
  287: "Volkswagon AG",
  288: "Porsche AG",
  289: "Sino Wealth Electronic Ltd.",
  290: "AirTurn, Inc.",
  291: "Kinsa, Inc.",
  292: "HID Global",
  293: "SEAT es",
  294: "Promethean Ltd.",
  295: "Salutica Allied Solutions",
  296: "GPSI Group Pty Ltd",
  297: "Nimble Devices Oy",
  298: "Changzhou Yongse Infotech Co., Ltd",
  299: "SportIQ",
  300: "TEMEC Instruments B.V.",
  301: "Sony Corporation",
  302: "ASSA ABLOY",
  303: "Clarion Co., Ltd.",
  304: "Warehouse Innovations",
  305: "Cypress Semiconductor Corporation",
  306: "MADS Inc",
  307: "Blue Maestro Limited",
  308: "Resolution Products, Inc.",
  309: "Airewear LLC",
  310: "Seed Labs, Inc. (formerly ETC sp. z.o.o.)",
  311: "Prestigio Plaza Ltd.",
  312: "NTEO Inc.",
  313: "Focus Systems Corporation",
  314: "Tencent Holdings Limited",
  315: "Allegion",
  316: "Murata Manufacuring Co., Ltd.",
  318: "Nod, Inc.",
  319: "B&B Manufacturing Company",
  320: "Alpine Electronics (China) Co., Ltd",
  321: "FedEx Services",
  322: "Grape Systems Inc.",
  323: "Bkon Connect",
  324: "Lintech GmbH",
  325: "Novatel Wireless",
  326: "Ciright",
  327: "Mighty Cast, Inc.",
  328: "Ambimat Electronics",
  329: "Perytons Ltd.",
  330: "Tivoli Audio, LLC",
  331: "Master Lock",
  332: "Mesh-Net Ltd",
  333: "Huizhou Desay SV Automotive CO., LTD.",
  334: "Tangerine, Inc.",
  335: "B&W Group Ltd.",
  336: "Pioneer Corporation",
  337: "OnBeep",
  338: "Vernier Software & Technology",
  339: "ROL Ergo",
  340: "Pebble Technology",
  341: "NETATMO",
  342: "Accumulate AB",
  343: "Anhui Huami Information Technology Co., Ltd.",
  344: "Inmite s.r.o.",
  345: "ChefSteps, Inc.",
  346: "micas AG",
  347: "Biomedical Research Ltd.",
  348: "Pitius Tec S.L.",
  349: "Estimote, Inc.",
  350: "Unikey Technologies, Inc.",
  351: "Timer Cap Co.",
  352: "AwoX",
  353: "yikes",
  354: "MADSGlobal NZ Ltd.",
  355: "PCH International",
  356: "Qingdao Yeelink Information Technology Co., Ltd.",
  357: "Milwaukee Tool (formerly Milwaukee Electric Tools)",
  358: "MISHIK Pte Ltd",
  359: "Bayer HealthCare",
  360: "Spicebox LLC",
  361: "emberlight",
  362: "Cooper-Atkins Corporation",
  363: "Qblinks",
  364: "MYSPHERA",
  365: "LifeScan Inc",
  366: "Volantic AB",
  367: "Podo Labs, Inc",
  368: "Roche Diabetes Care AG",
  369: "Amazon Fulfillment Service",
  370: "Connovate Technology Private Limited",
  371: "Kocomojo, LLC",
  372: "Everykey LLC",
  373: "Dynamic Controls",
  374: "SentriLock",
  375: "I-SYST inc.",
  376: "CASIO COMPUTER CO., LTD.",
  377: "LAPIS Semiconductor Co., Ltd.",
  378: "Telemonitor, Inc.",
  379: "taskit GmbH",
  380: "Daimler AG",
  381: "BatAndCat",
  382: "BluDotz Ltd",
  383: "XTel ApS",
  384: "Gigaset Communications GmbH",
  385: "Gecko Health Innovations, Inc.",
  386: "HOP Ubiquitous",
  387: "To Be Assigned",
  388: "Nectar",
  389: "bel’apps LLC",
  390: "CORE Lighting Ltd",
  391: "Seraphim Sense Ltd",
  392: "Unico RBC",
  393: "Physical Enterprises Inc.",
  394: "Able Trend Technology Limited",
  395: "Konica Minolta, Inc.",
  396: "Wilo SE",
  397: "Extron Design Services",
  398: "Fitbit, Inc.",
  399: "Fireflies Systems",
  400: "Intelletto Technologies Inc.",
  401: "FDK CORPORATION",
  402: "Cloudleaf, Inc",
  403: "Maveric Automation LLC",
  404: "Acoustic Stream Corporation",
  405: "Zuli",
  406: "Paxton Access Ltd",
  407: "WiSilica Inc",
  408: "Vengit Limited",
  409: "SALTO SYSTEMS S.L.",
  410: "TRON Forum (formerly T-Engine Forum)",
  411: "CUBETECH s.r.o.",
  412: "Cokiya Incorporated",
  413: "CVS Health",
  414: "Ceruus",
  415: "Strainstall Ltd",
  416: "Channel Enterprises (HK) Ltd.",
  417: "FIAMM",
  418: "GIGALANE.CO.,LTD",
  419: "EROAD",
  420: "Mine Safety Appliances",
  421: "Icon Health and Fitness",
  422: "Asandoo GmbH",
  423: "ENERGOUS CORPORATION",
  424: "Taobao",
  425: "Canon Inc.",
  426: "Geophysical Technology Inc.",
  427: "Facebook, Inc.",
  428: "Nipro Diagnostics, Inc.",
  429: "FlightSafety International",
  430: "Earlens Corporation",
  431: "Sunrise Micro Devices, Inc.",
  432: "Star Micronics Co., Ltd.",
  433: "Netizens Sp. z o.o.",
  434: "Nymi Inc.",
  435: "Nytec, Inc.",
  436: "Trineo Sp. z o.o.",
  437: "Nest Labs Inc.",
  438: "LM Technologies Ltd",
  439: "General Electric Company",
  440: "i+D3 S.L.",
  441: "HANA Micron",
  442: "Stages Cycling LLC",
  443: "Cochlear Bone Anchored Solutions AB",
  444: "SenionLab AB",
  445: "Syszone Co., Ltd",
  446: "Pulsate Mobile Ltd.",
  447: "Hong Kong HunterSun Electronic Limited",
  448: "pironex GmbH",
  449: "BRADATECH Corp.",
  450: "Transenergooil AG",
  451: "Bunch",
  452: "DME Microelectronics",
  453: "Bitcraze AB",
  454: "HASWARE Inc.",
  455: "Abiogenix Inc.",
  456: "Poly-Control ApS",
  457: "Avi-on",
  458: "Laerdal Medical AS",
  459: "Fetch My Pet",
  460: "Sam Labs Ltd.",
  461: "Chengdu Synwing Technology Ltd",
  462: "HOUWA SYSTEM DESIGN, k.k.",
  463: "BSH",
  464: "Primus Inter Pares Ltd",
  465: "August",
  466: "Gill Electronics",
  467: "Sky Wave Design",
  468: "Newlab S.r.l.",
  469: "ELAD srl",
  470: "G-wearables inc.",
  471: "Squadrone Systems Inc.",
  472: "Code Corporation",
  473: "Savant Systems LLC",
  474: "Logitech International SA",
  475: "Innblue Consulting",
  476: "iParking Ltd.",
  477: "Koninklijke Philips Electronics N.V.",
  478: "Minelab Electronics Pty Limited",
  479: "Bison Group Ltd.",
  480: "Widex A/S",
  481: "Jolla Ltd",
  482: "Lectronix, Inc.",
  483: "Caterpillar Inc",
  484: "Freedom Innovations",
  485: "Dynamic Devices Ltd",
  486: "Technology Solutions (UK) Ltd",
  487: "IPS Group Inc.",
  488: "STIR",
  489: "Sano, Inc",
  490: "Advanced Application Design, Inc.",
  491: "AutoMap LLC",
  492: "Spreadtrum Communications Shanghai Ltd",
  493: "CuteCircuit LTD",
  494: "Valeo Service",
  495: "Fullpower Technologies, Inc.",
  496: "KloudNation",
  497: "Zebra Technologies Corporation",
  498: "Itron, Inc.",
  499: "The University of Tokyo",
  500: "UTC Fire and Security",
  501: "Cool Webthings Limited",
  502: "DJO Global",
  503: "Gelliner Limited",
  504: "Anyka (Guangzhou) Microelectronics Technology Co, LTD",
  505: "Medtronic, Inc.",
  506: "Gozio, Inc.",
  507: "Form Lifting, LLC",
  508: "Wahoo Fitness, LLC",
  509: "Kontakt Micro-Location Sp. z o.o.",
  510: "Radio System Corporation",
  511: "Freescale Semiconductor, Inc.",
  512: "Verifone Systems PTe Ltd. Taiwan Branch",
  513: "AR Timing",
  514: "Rigado LLC",
  515: "Kemppi Oy",
  516: "Tapcentive Inc.",
  517: "Smartbotics Inc.",
  518: "Otter Products, LLC",
  519: "STEMP Inc.",
  520: "LumiGeek LLC",
  521: "InvisionHeart Inc.",
  522: "Macnica Inc. ",
  523: "Jaguar Land Rover Limited",
  524: "CoroWare Technologies, Inc",
  525: "Simplo Technology Co., LTD",
  526: "Omron Healthcare Co., LTD",
  527: "Comodule GMBH",
  528: "ikeGPS",
  529: "Telink Semiconductor Co. Ltd",
  530: "Interplan Co., Ltd",
  531: "Wyler AG",
  532: "IK Multimedia Production srl",
  533: "Lukoton Experience Oy",
  534: "MTI Ltd",
  535: "Tech4home, Lda",
  536: "Hiotech AB",
  537: "DOTT Limited",
  538: "Blue Speck Labs, LLC",
  539: "Cisco Systems, Inc",
  540: "Mobicomm Inc",
  541: "Edamic",
  542: "Goodnet, Ltd",
  543: "Luster Leaf Products Inc",
  544: "Manus Machina BV",
  545: "Mobiquity Networks Inc",
  546: "Praxis Dynamics",
  547: "Philip Morris Products S.A.",
  548: "Comarch SA",
  549: "Nestl Nespresso S.A.",
  550: "Merlinia A/S",
  551: "LifeBEAM Technologies",
  552: "Twocanoes Labs, LLC",
  553: "Muoverti Limited",
  554: "Stamer Musikanlagen GMBH",
  555: "Tesla Motors",
  556: "Pharynks Corporation",
  557: "Lupine",
  558: "Siemens AG",
  559: "Huami (Shanghai) Culture Communication CO., LTD",
  560: "Foster Electric Company, Ltd",
  561: "ETA SA",
  562: "x-Senso Solutions Kft",
  563: "Shenzhen SuLong Communication Ltd",
  564: "FengFan (BeiJing) Technology Co, Ltd",
  565: "Qrio Inc",
  566: "Pitpatpet Ltd",
  567: "MSHeli s.r.l.",
  568: "Trakm8 Ltd",
  569: "JIN CO, Ltd",
  570: "Alatech Tehnology",
  571: "Beijing CarePulse Electronic Technology Co, Ltd",
  572: "Awarepoint",
  573: "ViCentra B.V.",
  574: "Raven Industries",
  575: "WaveWare Technologies Inc.",
  576: "Argenox Technologies",
  577: "Bragi GmbH",
  578: "16Lab Inc",
  579: "Masimo Corp",
  580: "Iotera Inc",
  581: "Endress+Hauser",
  582: "ACKme Networks, Inc.",
  583: "FiftyThree Inc.",
  584: "Parker Hannifin Corp",
  585: "Transcranial Ltd",
  586: "Uwatec AG",
  587: "Orlan LLC",
  588: "Blue Clover Devices",
  589: "M-Way Solutions GmbH",
  590: "Microtronics Engineering GmbH",
  591: "Schneider Schreibgerte GmbH",
  592: "Sapphire Circuits LLC",
  593: "Lumo Bodytech Inc.",
  594: "UKC Technosolution",
  595: "Xicato Inc.",
  596: "Playbrush",
  597: "Dai Nippon Printing Co., Ltd.",
  598: "G24 Power Limited",
  599: "AdBabble Local Commerce Inc.",
  600: "Devialet SA",
  601: "ALTYOR",
  602: "University of Applied Sciences Valais/Haute Ecole Valaisanne",
  603: "Five Interactive, LLC dba Zendo",
  604: "NetEaseHangzhouNetwork co.Ltd.",
  605: "Lexmark International Inc.",
  606: "Fluke Corporation",
  607: "Yardarm Technologies",
  608: "SensaRx",
  609: "SECVRE GmbH",
  610: "Glacial Ridge Technologies",
  611: "Identiv, Inc.",
  612: "DDS, Inc.",
  613: "SMK Corporation",
  614: "Schawbel Technologies LLC",
  615: "XMI Systems SA",
  616: "Cerevo",
  617: "Torrox GmbH & Co KG",
  618: "Gemalto",
  619: "DEKA Research & Development Corp.",
  620: "Domster Tadeusz Szydlowski",
  621: "Technogym SPA",
  622: "FLEURBAEY BVBA",
  623: "Aptcode Solutions",
  624: "LSI ADL Technology",
  625: "Animas Corp",
  626: "Alps Electric Co., Ltd.",
  627: "OCEASOFT",
  628: "Motsai Research",
  629: "Geotab",
  630: "E.G.O. Elektro-Gertebau GmbH",
  631: "bewhere inc",
  632: "Johnson Outdoors Inc",
  633: "steute Schaltgerate GmbH & Co. KG",
  634: "Ekomini inc.",
  635: "DEFA AS",
  636: "Aseptika Ltd",
  637: "HUAWEI Technologies Co., Ltd. ( )",
  638: "HabitAware, LLC",
  639: "ruwido austria gmbh",
  640: "ITEC corporation",
  641: "StoneL",
  642: "Sonova AG",
  643: "Maven Machines, Inc.",
  644: "Synapse Electronics",
  645: "Standard Innovation Inc.",
  646: "RF Code, Inc.",
  647: "Wally Ventures S.L.",
  648: "Willowbank Electronics Ltd",
  649: "SK Telecom",
  650: "Jetro AS",
  651: "Code Gears LTD",
  652: "NANOLINK APS",
  653: "IF, LLC",
  654: "RF Digital Corp",
  655: "Church & Dwight Co., Inc",
  656: "Multibit Oy",
  657: "CliniCloud Inc",
  658: "SwiftSensors",
  659: "Blue Bite",
  660: "ELIAS GmbH",
  661: "Sivantos GmbH",
  662: "Petzl",
  663: "storm power ltd",
  664: "EISST Ltd",
  665: "Inexess Technology Simma KG",
  666: "Currant, Inc.",
  667: "C2 Development, Inc.",
  668: "Blue Sky Scientific, LLC",
  669: "ALOTTAZS LABS, LLC",
  670: "Kupson spol. s r.o.",
  671: "Areus Engineering GmbH",
  672: "Impossible Camera GmbH",
  673: "InventureTrack Systems",
  674: "LockedUp",
  675: "Itude",
  676: "Pacific Lock Company",
  677: "Tendyron Corporation ( )",
  678: "Robert Bosch GmbH",
  679: "Illuxtron international B.V.",
  680: "miSport Ltd.",
  681: "Chargelib",
  682: "Doppler Lab",
  683: "BBPOS Limited",
  684: "RTB Elektronik GmbH & Co. KG",
  685: "Rx Networks, Inc.",
  686: "WeatherFlow, Inc.",
  687: "Technicolor USA Inc.",
  688: "Bestechnic(Shanghai),Ltd",
  689: "Raden Inc",
  690: "JouZen Oy",
  691: "CLABER S.P.A.",
  692: "Hyginex, Inc.",
  693: "HANSHIN ELECTRIC RAILWAY CO.,LTD.",
  694: "Schneider Electric",
  695: "Oort Technologies LLC",
  696: "Chrono Therapeutics",
  697: "Rinnai Corporation",
  698: "Swissprime Technologies AG",
  699: "Koha.,Co.Ltd",
  700: "Genevac Ltd",
  701: "Chemtronics",
  702: "Seguro Technology Sp. z o.o.",
  703: "Redbird Flight Simulations",
  704: "Dash Robotics",
  705: "LINE Corporation",
  706: "Guillemot Corporation",
  707: "Techtronic Power Tools Technology Limited",
  708: "Wilson Sporting Goods",
  709: "Lenovo (Singapore) Pte Ltd. ( )",
  710: "Ayatan Sensors",
  711: "Electronics Tomorrow Limited",
  712: "VASCO Data Security International, Inc.",
  713: "PayRange Inc.",
  714: "ABOV Semiconductor",
  715: "AINA-Wireless Inc.",
  716: "Eijkelkamp Soil & Water",
  717: "BMA ergonomics b.v.",
  718: "Teva Branded Pharmaceutical Products R&D, Inc.",
  719: "Anima",
  720: "3M",
  721: "Empatica Srl",
  722: "Afero, Inc.",
  723: "Powercast Corporation",
  724: "Secuyou ApS",
  725: "OMRON Corporation",
  726: "Send Solutions",
  727: "NIPPON SYSTEMWARE CO.,LTD.",
  728: "Neosfar",
  729: "Fliegl Agrartechnik GmbH",
  730: "Gilvader",
  731: "Digi International Inc (R)",
  732: "DeWalch Technologies, Inc.",
  733: "Flint Rehabilitation Devices, LLC",
  734: "Samsung SDS Co., Ltd.",
  735: "Blur Product Development",
  736: "University of Michigan",
  737: "Victron Energy BV",
  738: "NTT docomo",
  739: "Carmanah Technologies Corp.",
  740: "Bytestorm Ltd.",
  741: "Espressif Incorporated ( () )",
  742: "Unwire",
  743: "Connected Yard, Inc.",
  744: "American Music Environments",
  745: "Sensogram Technologies, Inc.",
  746: "Fujitsu Limited",
  747: "Ardic Technology",
  748: "Delta Systems, Inc",
  749: "HTC Corporation",
  750: "Citizen Holdings Co., Ltd.",
  751: "SMART-INNOVATION.inc",
  752: "Blackrat Software",
  753: "The Idea Cave, LLC",
  754: "GoPro, Inc.",
  755: "AuthAir, Inc",
  756: "Vensi, Inc.",
  757: "Indagem Tech LLC",
  758: "Intemo Technologies",
  759: "DreamVisions co., Ltd.",
  760: "Runteq Oy Ltd",
  761: "IMAGINATION TECHNOLOGIES LTD",
  762: "CoSTAR TEchnologies",
  763: "Clarius Mobile Health Corp.",
  764: "Shanghai Frequen Microelectronics Co., Ltd.",
  765: "Uwanna, Inc.",
  766: "Lierda Science & Technology Group Co., Ltd.",
  767: "Silicon Laboratories",
  768: "World Moto Inc.",
  769: "Giatec Scientific Inc.",
  770: "Loop Devices, Inc",
  771: "IACA electronique",
  772: "Martians Inc",
  773: "Swipp ApS",
  774: "Life Laboratory Inc.",
  775: "FUJI INDUSTRIAL CO.,LTD.",
  776: "Surefire, LLC",
  777: "Dolby Labs",
  778: "Ellisys",
  779: "Magnitude Lighting Converters",
  780: "Hilti AG",
  781: "Devdata S.r.l.",
  782: "Deviceworx",
  783: "Shortcut Labs",
  784: "SGL Italia S.r.l.",
  785: "PEEQ DATA",
  786: "Ducere Technologies Pvt Ltd",
  787: "DiveNav, Inc.",
  788: "RIIG AI Sp. z o.o.",
  789: "Thermo Fisher Scientific",
  790: "AG Measurematics Pvt. Ltd.",
  791: "CHUO Electronics CO., LTD.",
  792: "Aspenta International",
  793: "Eugster Frismag AG",
  794: "Amber wireless GmbH",
  795: "HQ Inc",
  796: "Lab Sensor Solutions",
  797: "Enterlab ApS",
  798: "Eyefi, Inc.",
  799: "MetaSystem S.p.A.",
  800: "SONO ELECTRONICS. CO., LTD",
  801: "Jewelbots",
  802: "Compumedics Limited",
  803: "Rotor Bike Components",
  804: "Astro, Inc.",
  805: "Amotus Solutions",
  806: "Healthwear Technologies (Changzhou)Ltd",
  807: "Essex Electronics",
  808: "Grundfos A/S",
  809: "Eargo, Inc.",
  810: "Electronic Design Lab",
  811: "ESYLUX",
  812: "NIPPON SMT.CO.,Ltd",
  813: "BM innovations GmbH",
  814: "indoormap",
  815: "OttoQ Inc",
  816: "North Pole Engineering",
  817: "3flares Technologies Inc.",
  818: "Electrocompaniet A.S.",
  819: "Mul-T-Lock",
  820: "Corentium AS",
  821: "Enlighted Inc",
  822: "GISTIC",
  823: "AJP2 Holdings, LLC",
  824: "COBI GmbH",
  825: "Blue Sky Scientific, LLC",
  826: "Appception, Inc.",
  827: "Courtney Thorne Limited",
  828: "Virtuosys",
  829: "TPV Technology Limited",
  830: "Monitra SA",
  831: "Automation Components, Inc.",
  832: "Letsense s.r.l.",
  833: "Etesian Technologies LLC",
  834: "GERTEC BRASIL LTDA.",
  835: "Drekker Development Pty. Ltd.",
  836: "Whirl Inc",
  837: "Locus Positioning",
  838: "Acuity Brands Lighting, Inc",
  839: "Prevent Biometrics",
  840: "Arioneo",
  841: "VersaMe",
  842: "Vaddio",
  843: "Libratone A/S",
  844: "HM Electronics, Inc.",
  845: "TASER International, Inc.",
  846: "SafeTrust Inc.",
  847: "Heartland Payment Systems",
  848: "Bitstrata Systems Inc.",
  849: "Pieps GmbH",
  850: "iRiding(Xiamen)Technology Co.,Ltd.",
  851: "Alpha Audiotronics, Inc.",
  852: "TOPPAN FORMS CO.,LTD.",
  853: "Sigma Designs, Inc.",
  854: "Spectrum Brands, Inc.",
  855: "Polymap Wireless",
  856: "MagniWare Ltd.",
  857: "Novotec Medical GmbH",
  858: "Medicom Innovation Partner a/s",
  859: "Matrix Inc.",
  860: "Eaton Corporation",
  861: "KYS",
  862: "Naya Health, Inc.",
  863: "Acromag",
  864: "Insulet Corporation",
  865: "Wellinks Inc.",
  866: "ON Semiconductor",
  867: "FREELAP SA",
  868: "Favero Electronics Srl",
  869: "BioMech Sensor LLC",
  870: "BOLTT Sports technologies Private limited",
  871: "Saphe International",
  872: "Metormote AB",
  873: "littleBits",
  874: "SetPoint Medical",
  875: "BRControls Products BV",
  876: "Zipcar",
  877: "AirBolt Pty Ltd",
  878: "KeepTruckin Inc",
  879: "Motiv, Inc.",
  880: "Wazombi Labs O",
  881: "ORBCOMM",
  882: "Nixie Labs, Inc.",
  883: "AppNearMe Ltd",
  884: "Holman Industries",
  885: "Expain AS",
  886: "Electronic Temperature Instruments Ltd",
  887: "Plejd AB",
  888: "Propeller Health",
  889: "Shenzhen iMCO Electronic Technology Co.,Ltd",
  890: "Algoria",
  891: "Apption Labs Inc.",
  892: "Cronologics Corporation",
  893: "MICRODIA Ltd.",
  894: "lulabytes S.L.",
  895: "Nestec S.A.",
  896: "LLC MEGA - F service",
  897: "Sharp Corporation",
  898: "Precision Outcomes Ltd",
  899: "Kronos Incorporated",
  900: "OCOSMOS Co., Ltd.",
  901: "Embedded Electronic Solutions Ltd. dba e2Solutions",
  902: "Aterica Inc.",
  903: "BluStor PMC, Inc.",
  904: "Kapsch TrafficCom AB",
  905: "ActiveBlu Corporation",
  906: "Kohler Mira Limited",
  907: "Noke",
  908: "Appion Inc.",
  909: "Resmed Ltd",
  910: "Crownstone B.V.",
  911: "Xiaomi Inc.",
  912: "INFOTECH s.r.o.",
  913: "Thingsquare AB",
  914: "T&D",
  915: "LAVAZZA S.p.A.",
  916: "Netclearance Systems, Inc.",
  917: "SDATAWAY",
  918: "BLOKS GmbH",
  919: "LEGO System A/S",
  920: "Thetatronics Ltd",
  921: "Nikon Corporation",
  922: "NeST",
  923: "South Silicon Valley Microelectronics",
  924: "ALE International",
  925: "CareView Communications, Inc.",
  926: "SchoolBoard Limited",
  927: "Molex Corporation",
  928: "IVT Wireless Limited",
  929: "Alpine Labs LLC",
  930: "Candura Instruments",
  931: "SmartMovt Technology Co., Ltd",
  932: "Token Zero Ltd",
  933: "ACE CAD Enterprise Co., Ltd. (ACECAD)",
  934: "Medela, Inc",
  935: "AeroScout",
  936: "Esrille Inc.",
  937: "THINKERLY SRL",
  938: "Exon Sp. z o.o.",
  939: "Meizu Technology Co., Ltd.",
  940: "Smablo LTD",
  941: "XiQ",
  942: "Allswell Inc.",
  943: "Comm-N-Sense Corp DBA Verigo",
  944: "VIBRADORM GmbH",
  945: "Otodata Wireless Network Inc.",
  946: "Propagation Systems Limited",
  947: "Midwest Instruments & Controls",
  948: "Alpha Nodus, inc.",
  949: "petPOMM, Inc",
  950: "Mattel",
  951: "Airbly Inc.",
  952: "A-Safe Limited",
  953: "FREDERIQUE CONSTANT SA",
  954: "Maxscend Microelectronics Company Limited",
  955: "Abbott Diabetes Care",
  956: "ASB Bank Ltd",
  957: "amadas",
  958: "Applied Science, Inc.",
  959: "iLumi Solutions Inc.",
  960: "Arch Systems Inc.",
  961: "Ember Technologies, Inc.",
  962: "Snapchat Inc",
  963: "Casambi Technologies Oy",
  964: "Pico Technology Inc.",
  965: "St. Jude Medical, Inc.",
  966: "Intricon",
  967: "Structural Health Systems, Inc.",
  968: "Avvel International",
  969: "Gallagher Group",
  970: "In2things Automation Pvt. Ltd.",
  971: "SYSDEV Srl",
  972: "Vonkil Technologies Ltd",
  973: "Wynd Technologies, Inc.",
  974: "CONTRINEX S.A.",
  975: "MIRA, Inc.",
  976: "Watteam Ltd",
  977: "Density Inc.",
  978: "IOT Pot India Private Limited",
  979: "Sigma Connectivity AB",
  980: "PEG PEREGO SPA",
  981: "Wyzelink Systems Inc.",
  982: "Yota Devices LTD",
  983: "FINSECUR",
  984: "Zen-Me Labs Ltd",
  985: "3IWare Co., Ltd.",
  986: "EnOcean GmbH",
  987: "Instabeat, Inc",
  988: "Nima Labs",
  989: "Andreas Stihl AG & Co. KG",
  990: "Nathan Rhoades LLC",
  991: "Grob Technologies, LLC",
  992: "Actions (Zhuhai) Technology Co., Limited",
  993: "SPD Development Company Ltd",
  994: "Sensoan Oy",
  995: "Qualcomm Life Inc",
  996: "Chip-ing AG",
  997: "ffly4u",
  998: "IoT Instruments Oy",
  999: "TRUE Fitness Technology",
  1e3: "Reiner Kartengeraete GmbH & Co. KG.",
  1001: "SHENZHEN LEMONJOY TECHNOLOGY CO., LTD.",
  1002: "Hello Inc.",
  1003: "Evollve Inc.",
  1004: "Jigowatts Inc.",
  1005: "BASIC MICRO.COM,INC.",
  1006: "CUBE TECHNOLOGIES",
  1007: "foolography GmbH",
  1008: "CLINK",
  1009: "Hestan Smart Cooking Inc.",
  1010: "WindowMaster A/S",
  1011: "Flowscape AB",
  1012: "PAL Technologies Ltd",
  1013: "WHERE, Inc.",
  1014: "Iton Technology Corp.",
  1015: "Owl Labs Inc.",
  1016: "Rockford Corp.",
  1017: "Becon Technologies Co.,Ltd.",
  1018: "Vyassoft Technologies Inc",
  1019: "Nox Medical",
  1020: "Kimberly-Clark",
  1021: "Trimble Navigation Ltd.",
  1022: "Littelfuse",
  1023: "Withings",
  1024: "i-developer IT Beratung UG",
  1026: "Sears Holdings Corporation",
  1027: "Gantner Electronic GmbH",
  1028: "Authomate Inc",
  1029: "Vertex International, Inc.",
  1030: "Airtago",
  1031: "Swiss Audio SA",
  1032: "ToGetHome Inc.",
  1033: "AXIS",
  1034: "Openmatics",
  1035: "Jana Care Inc.",
  1036: "Senix Corporation",
  1037: "NorthStar Battery Company, LLC",
  1038: "SKF (U.K.) Limited",
  1039: "CO-AX Technology, Inc.",
  1040: "Fender Musical Instruments",
  1041: "Luidia Inc",
  1042: "SEFAM",
  1043: "Wireless Cables Inc",
  1044: "Lightning Protection International Pty Ltd",
  1045: "Uber Technologies Inc",
  1046: "SODA GmbH",
  1047: "Fatigue Science",
  1048: "Alpine Electronics Inc.",
  1049: "Novalogy LTD",
  1050: "Friday Labs Limited",
  1051: "OrthoAccel Technologies",
  1052: "WaterGuru, Inc.",
  1053: "Benning Elektrotechnik und Elektronik GmbH & Co. KG",
  1054: "Dell Computer Corporation",
  1055: "Kopin Corporation",
  1056: "TecBakery GmbH",
  1057: "Backbone Labs, Inc.",
  1058: "DELSEY SA",
  1059: "Chargifi Limited",
  1060: "Trainesense Ltd.",
  1061: "Unify Software and Solutions GmbH & Co. KG",
  1062: "Husqvarna AB",
  1063: "Focus fleet and fuel management inc",
  1064: "SmallLoop, LLC",
  1065: "Prolon Inc.",
  1066: "BD Medical",
  1067: "iMicroMed Incorporated",
  1068: "Ticto N.V.",
  1069: "Meshtech AS",
  1070: "MemCachier Inc.",
  1071: "Danfoss A/S",
  1072: "SnapStyk Inc.",
  1073: "Amyway Corporation",
  1074: "Silk Labs, Inc.",
  1075: "Pillsy Inc.",
  1076: "Hatch Baby, Inc.",
  1077: "Blocks Wearables Ltd.",
  1078: "Drayson Technologies (Europe) Limited",
  1079: "eBest IOT Inc.",
  1080: "Helvar Ltd",
  1081: "Radiance Technologies",
  1082: "Nuheara Limited",
  1083: "Appside co., ltd.",
  1084: "DeLaval",
  1085: "Coiler Corporation",
  1086: "Thermomedics, Inc.",
  1087: "Tentacle Sync GmbH",
  1088: "Valencell, Inc.",
  1089: "iProtoXi Oy",
  1090: "SECOM CO., LTD.",
  1091: "Tucker International LLC",
  1092: "Metanate Limited",
  1093: "Kobian Canada Inc.",
  1094: "NETGEAR, Inc.",
  1095: "Fabtronics Australia Pty Ltd",
  1096: "Grand Centrix GmbH",
  1097: "1UP USA.com llc",
  1098: "SHIMANO INC.",
  1099: "Nain Inc.",
  1100: "LifeStyle Lock, LLC",
  1101: "VEGA Grieshaber KG",
  1102: "Xtrava Inc.",
  1103: "TTS Tooltechnic Systems AG & Co. KG",
  1104: "Teenage Engineering AB",
  1105: "Tunstall Nordic AB",
  1106: "Svep Design Center AB",
  1107: "GreenPeak Technologies BV",
  1108: "Sphinx Electronics GmbH & Co KG",
  1109: "Atomation",
  1110: "Nemik Consulting Inc",
  1111: "RF INNOVATION",
  1112: "Mini Solution Co., Ltd.",
  1113: "Lumenetix, Inc",
  1114: "2048450 Ontario Inc",
  1115: "SPACEEK LTD",
  1116: "Delta T Corporation",
  1117: "Boston Scientific Corporation",
  1118: "Nuviz, Inc.",
  1119: "Real Time Automation, Inc.",
  1120: "Kolibree",
  1121: "vhf elektronik GmbH",
  1122: "Bonsai Systems GmbH",
  1123: "Fathom Systems Inc.",
  1124: "Bellman & Symfon",
  1125: "International Forte Group LLC",
  1126: "CycleLabs Solutions inc.",
  1127: "Codenex Oy",
  1128: "Kynesim Ltd",
  1129: "Palago AB",
  1130: "INSIGMA INC.",
  1131: "PMD Solutions",
  1132: "Qingdao Realtime Technology Co., Ltd.",
  1133: "BEGA Gantenbrink-Leuchten KG",
  1134: "Pambor Ltd.",
  65535: "SPECIAL USE/DEFAULT"
};
const exec = require$$1$4.exec;
const execSync = require$$1$4.execSync;
const path = require$$1;
const util = util$i;
const bluetoothVendors = bluetoothVendors$1;
const fs = require$$1$1;
const _platform = process.platform;
const _linux = _platform === "linux" || _platform === "android";
const _darwin = _platform === "darwin";
const _windows = _platform === "win32";
const _freebsd = _platform === "freebsd";
const _openbsd = _platform === "openbsd";
const _netbsd = _platform === "netbsd";
const _sunos = _platform === "sunos";
function parseBluetoothType(str) {
  let result = "";
  if (str.indexOf("keyboard") >= 0) {
    result = "Keyboard";
  }
  if (str.indexOf("mouse") >= 0) {
    result = "Mouse";
  }
  if (str.indexOf("trackpad") >= 0) {
    result = "Trackpad";
  }
  if (str.indexOf("audio") >= 0) {
    result = "Audio";
  }
  if (str.indexOf("sound") >= 0) {
    result = "Audio";
  }
  if (str.indexOf("microph") >= 0) {
    result = "Microphone";
  }
  if (str.indexOf("speaker") >= 0) {
    result = "Speaker";
  }
  if (str.indexOf("headset") >= 0) {
    result = "Headset";
  }
  if (str.indexOf("phone") >= 0) {
    result = "Phone";
  }
  if (str.indexOf("macbook") >= 0) {
    result = "Computer";
  }
  if (str.indexOf("imac") >= 0) {
    result = "Computer";
  }
  if (str.indexOf("ipad") >= 0) {
    result = "Tablet";
  }
  if (str.indexOf("watch") >= 0) {
    result = "Watch";
  }
  if (str.indexOf("headphone") >= 0) {
    result = "Headset";
  }
  return result;
}
function parseBluetoothManufacturer(str) {
  let result = str.split(" ")[0];
  str = str.toLowerCase();
  if (str.indexOf("apple") >= 0) {
    result = "Apple";
  }
  if (str.indexOf("ipad") >= 0) {
    result = "Apple";
  }
  if (str.indexOf("imac") >= 0) {
    result = "Apple";
  }
  if (str.indexOf("iphone") >= 0) {
    result = "Apple";
  }
  if (str.indexOf("magic mouse") >= 0) {
    result = "Apple";
  }
  if (str.indexOf("magic track") >= 0) {
    result = "Apple";
  }
  if (str.indexOf("macbook") >= 0) {
    result = "Apple";
  }
  return result;
}
function parseBluetoothVendor(str) {
  const id = parseInt(str);
  if (!isNaN(id)) return bluetoothVendors[id];
}
function parseLinuxBluetoothInfo(lines, macAddr1, macAddr2) {
  const result = {};
  result.device = null;
  result.name = util.getValue(lines, "name", "=");
  result.manufacturer = null;
  result.macDevice = macAddr1;
  result.macHost = macAddr2;
  result.batteryPercent = null;
  result.type = parseBluetoothType(result.name.toLowerCase());
  result.connected = false;
  return result;
}
function parseDarwinBluetoothDevices(bluetoothObject, macAddr2) {
  const result = {};
  const typeStr = ((bluetoothObject.device_minorClassOfDevice_string || bluetoothObject.device_majorClassOfDevice_string || bluetoothObject.device_minorType || "") + (bluetoothObject.device_name || "")).toLowerCase();
  result.device = bluetoothObject.device_services || "";
  result.name = bluetoothObject.device_name || "";
  result.manufacturer = bluetoothObject.device_manufacturer || parseBluetoothVendor(bluetoothObject.device_vendorID) || parseBluetoothManufacturer(bluetoothObject.device_name || "") || "";
  result.macDevice = (bluetoothObject.device_addr || bluetoothObject.device_address || "").toLowerCase().replace(/-/g, ":");
  result.macHost = macAddr2;
  result.batteryPercent = bluetoothObject.device_batteryPercent || null;
  result.type = parseBluetoothType(typeStr);
  result.connected = bluetoothObject.device_isconnected === "attrib_Yes" || false;
  return result;
}
function parseWindowsBluetooth(lines) {
  const result = {};
  result.device = null;
  result.name = util.getValue(lines, "name", ":");
  result.manufacturer = util.getValue(lines, "manufacturer", ":");
  result.macDevice = null;
  result.macHost = null;
  result.batteryPercent = null;
  result.type = parseBluetoothType(result.name.toLowerCase());
  result.connected = null;
  return result;
}
function bluetoothDevices(callback) {
  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];
      if (_linux) {
        const btFiles = util.getFilesInPath("/var/lib/bluetooth/");
        btFiles.forEach((element) => {
          const filename = path.basename(element);
          const pathParts = element.split("/");
          const macAddr1 = pathParts.length >= 6 ? pathParts[pathParts.length - 2] : null;
          const macAddr2 = pathParts.length >= 7 ? pathParts[pathParts.length - 3] : null;
          if (filename === "info") {
            try {
              const infoFile = fs.readFileSync(element, { encoding: "utf8" }).split("\n");
              result.push(parseLinuxBluetoothInfo(infoFile, macAddr1, macAddr2));
            } catch {
              util.noop();
            }
          }
        });
        try {
          const hdicon = execSync("hcitool con", util.execOptsLinux).toString().toLowerCase();
          for (let i = 0; i < result.length; i++) {
            if (result[i].macDevice && result[i].macDevice.length > 10 && hdicon.indexOf(result[i].macDevice.toLowerCase()) >= 0) {
              result[i].connected = true;
            }
          }
        } catch {
          util.noop();
        }
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
      if (_darwin) {
        let cmd = "system_profiler SPBluetoothDataType -json";
        exec(cmd, (error, stdout) => {
          if (!error) {
            try {
              const outObj = JSON.parse(stdout.toString());
              if (outObj.SPBluetoothDataType && outObj.SPBluetoothDataType.length && outObj.SPBluetoothDataType[0] && outObj.SPBluetoothDataType[0]["device_title"] && outObj.SPBluetoothDataType[0]["device_title"].length) {
                let macAddr2 = null;
                if (outObj.SPBluetoothDataType[0]["local_device_title"] && outObj.SPBluetoothDataType[0].local_device_title.general_address) {
                  macAddr2 = outObj.SPBluetoothDataType[0].local_device_title.general_address.toLowerCase().replace(/-/g, ":");
                }
                outObj.SPBluetoothDataType[0]["device_title"].forEach((element) => {
                  const obj = element;
                  const objKey = Object.keys(obj);
                  if (objKey && objKey.length === 1) {
                    const innerObject = obj[objKey[0]];
                    innerObject.device_name = objKey[0];
                    const bluetoothDevice = parseDarwinBluetoothDevices(innerObject, macAddr2);
                    result.push(bluetoothDevice);
                  }
                });
              }
              if (outObj.SPBluetoothDataType && outObj.SPBluetoothDataType.length && outObj.SPBluetoothDataType[0] && outObj.SPBluetoothDataType[0]["device_connected"] && outObj.SPBluetoothDataType[0]["device_connected"].length) {
                const macAddr2 = outObj.SPBluetoothDataType[0].controller_properties && outObj.SPBluetoothDataType[0].controller_properties.controller_address ? outObj.SPBluetoothDataType[0].controller_properties.controller_address.toLowerCase().replace(/-/g, ":") : null;
                outObj.SPBluetoothDataType[0]["device_connected"].forEach((element) => {
                  const obj = element;
                  const objKey = Object.keys(obj);
                  if (objKey && objKey.length === 1) {
                    const innerObject = obj[objKey[0]];
                    innerObject.device_name = objKey[0];
                    innerObject.device_isconnected = "attrib_Yes";
                    const bluetoothDevice = parseDarwinBluetoothDevices(innerObject, macAddr2);
                    result.push(bluetoothDevice);
                  }
                });
              }
              if (outObj.SPBluetoothDataType && outObj.SPBluetoothDataType.length && outObj.SPBluetoothDataType[0] && outObj.SPBluetoothDataType[0]["device_not_connected"] && outObj.SPBluetoothDataType[0]["device_not_connected"].length) {
                const macAddr2 = outObj.SPBluetoothDataType[0].controller_properties && outObj.SPBluetoothDataType[0].controller_properties.controller_address ? outObj.SPBluetoothDataType[0].controller_properties.controller_address.toLowerCase().replace(/-/g, ":") : null;
                outObj.SPBluetoothDataType[0]["device_not_connected"].forEach((element) => {
                  const obj = element;
                  const objKey = Object.keys(obj);
                  if (objKey && objKey.length === 1) {
                    const innerObject = obj[objKey[0]];
                    innerObject.device_name = objKey[0];
                    innerObject.device_isconnected = "attrib_No";
                    const bluetoothDevice = parseDarwinBluetoothDevices(innerObject, macAddr2);
                    result.push(bluetoothDevice);
                  }
                });
              }
            } catch {
              util.noop();
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_windows) {
        util.powerShell("Get-CimInstance Win32_PNPEntity | select PNPClass, Name, Manufacturer, Status, Service, ConfigManagerErrorCode, Present | fl").then((stdout, error) => {
          if (!error) {
            const parts = stdout.toString().split(/\n\s*\n/);
            parts.forEach((part) => {
              const lines = part.split("\n");
              const service = util.getValue(lines, "Service", ":");
              const errorCode = util.getValue(lines, "ConfigManagerErrorCode", ":");
              const pnpClass = util.getValue(lines, "PNPClass", ":").toLowerCase();
              if (pnpClass === "bluetooth" && errorCode === "0" && service === "") {
                result.push(parseWindowsBluetooth(lines));
              }
            });
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      }
      if (_freebsd || _netbsd || _openbsd || _sunos) {
        resolve(null);
      }
    });
  });
}
bluetooth.bluetoothDevices = bluetoothDevices;
(function(exports) {
  const lib_version = require$$0.version;
  const util2 = util$i;
  const system2 = system$1;
  const osInfo2 = osinfo;
  const cpu2 = cpu$1;
  const memory$1 = memory;
  const battery$1 = battery;
  const graphics2 = graphics$1;
  const filesystem$1 = filesystem;
  const network$1 = network;
  const wifi$1 = wifi;
  const processes2 = processes$1;
  const users2 = users$1;
  const internet$1 = internet;
  const docker$1 = docker;
  const vbox = virtualbox;
  const printer2 = printer$1;
  const usb2 = usb$1;
  const audio2 = audio$1;
  const bluetooth$1 = bluetooth;
  const _platform2 = process.platform;
  const _windows2 = _platform2 === "win32";
  const _freebsd2 = _platform2 === "freebsd";
  const _openbsd2 = _platform2 === "openbsd";
  const _netbsd2 = _platform2 === "netbsd";
  const _sunos2 = _platform2 === "sunos";
  if (_windows2) {
    util2.getCodepage();
    util2.getPowershell();
  }
  function version2() {
    return lib_version;
  }
  function getStaticData(callback) {
    return new Promise((resolve) => {
      process.nextTick(() => {
        const data = {};
        data.version = version2();
        Promise.all([
          system2.system(),
          system2.bios(),
          system2.baseboard(),
          system2.chassis(),
          osInfo2.osInfo(),
          osInfo2.uuid(),
          osInfo2.versions(),
          cpu2.cpu(),
          cpu2.cpuFlags(),
          graphics2.graphics(),
          network$1.networkInterfaces(),
          memory$1.memLayout(),
          filesystem$1.diskLayout(),
          audio2.audio(),
          bluetooth$1.bluetoothDevices(),
          usb2.usb(),
          printer2.printer()
        ]).then((res) => {
          data.system = res[0];
          data.bios = res[1];
          data.baseboard = res[2];
          data.chassis = res[3];
          data.os = res[4];
          data.uuid = res[5];
          data.versions = res[6];
          data.cpu = res[7];
          data.cpu.flags = res[8];
          data.graphics = res[9];
          data.net = res[10];
          data.memLayout = res[11];
          data.diskLayout = res[12];
          data.audio = res[13];
          data.bluetooth = res[14];
          data.usb = res[15];
          data.printer = res[16];
          if (callback) {
            callback(data);
          }
          resolve(data);
        });
      });
    });
  }
  function getDynamicData(srv, iface, callback) {
    if (util2.isFunction(iface)) {
      callback = iface;
      iface = "";
    }
    if (util2.isFunction(srv)) {
      callback = srv;
      srv = "";
    }
    return new Promise((resolve) => {
      process.nextTick(() => {
        iface = iface || network$1.getDefaultNetworkInterface();
        srv = srv || "";
        let functionProcessed = (() => {
          let totalFunctions = 15;
          if (_windows2) {
            totalFunctions = 13;
          }
          if (_freebsd2 || _openbsd2 || _netbsd2) {
            totalFunctions = 11;
          }
          if (_sunos2) {
            totalFunctions = 6;
          }
          return function() {
            if (--totalFunctions === 0) {
              if (callback) {
                callback(data);
              }
              resolve(data);
            }
          };
        })();
        const data = {};
        data.time = osInfo2.time();
        data.node = process.versions.node;
        data.v8 = process.versions.v8;
        cpu2.cpuCurrentSpeed().then((res) => {
          data.cpuCurrentSpeed = res;
          functionProcessed();
        });
        users2.users().then((res) => {
          data.users = res;
          functionProcessed();
        });
        processes2.processes().then((res) => {
          data.processes = res;
          functionProcessed();
        });
        cpu2.currentLoad().then((res) => {
          data.currentLoad = res;
          functionProcessed();
        });
        if (!_sunos2) {
          cpu2.cpuTemperature().then((res) => {
            data.temp = res;
            functionProcessed();
          });
        }
        if (!_openbsd2 && !_freebsd2 && !_netbsd2 && !_sunos2) {
          network$1.networkStats(iface).then((res) => {
            data.networkStats = res;
            functionProcessed();
          });
        }
        if (!_sunos2) {
          network$1.networkConnections().then((res) => {
            data.networkConnections = res;
            functionProcessed();
          });
        }
        memory$1.mem().then((res) => {
          data.mem = res;
          functionProcessed();
        });
        if (!_sunos2) {
          battery$1().then((res) => {
            data.battery = res;
            functionProcessed();
          });
        }
        if (!_sunos2) {
          processes2.services(srv).then((res) => {
            data.services = res;
            functionProcessed();
          });
        }
        if (!_sunos2) {
          filesystem$1.fsSize().then((res) => {
            data.fsSize = res;
            functionProcessed();
          });
        }
        if (!_windows2 && !_openbsd2 && !_freebsd2 && !_netbsd2 && !_sunos2) {
          filesystem$1.fsStats().then((res) => {
            data.fsStats = res;
            functionProcessed();
          });
        }
        if (!_windows2 && !_openbsd2 && !_freebsd2 && !_netbsd2 && !_sunos2) {
          filesystem$1.disksIO().then((res) => {
            data.disksIO = res;
            functionProcessed();
          });
        }
        if (!_openbsd2 && !_freebsd2 && !_netbsd2 && !_sunos2) {
          wifi$1.wifiNetworks().then((res) => {
            data.wifiNetworks = res;
            functionProcessed();
          });
        }
        internet$1.inetLatency().then((res) => {
          data.inetLatency = res;
          functionProcessed();
        });
      });
    });
  }
  function getAllData(srv, iface, callback) {
    return new Promise((resolve) => {
      process.nextTick(() => {
        let data = {};
        if (iface && util2.isFunction(iface) && !callback) {
          callback = iface;
          iface = "";
        }
        if (srv && util2.isFunction(srv) && !iface && !callback) {
          callback = srv;
          srv = "";
          iface = "";
        }
        getStaticData().then((res) => {
          data = res;
          getDynamicData(srv, iface).then((res2) => {
            for (let key in res2) {
              if ({}.hasOwnProperty.call(res2, key)) {
                data[key] = res2[key];
              }
            }
            if (callback) {
              callback(data);
            }
            resolve(data);
          });
        });
      });
    });
  }
  function get(valueObject, callback) {
    return new Promise((resolve) => {
      process.nextTick(() => {
        const blocked = ["get", "getStaticData", "getDynamicData", "getAllData", "observe", "powerShellStart", "powerShellRelease"];
        const isGettable = (key) => ({}).hasOwnProperty.call(exports, key) && typeof exports[key] === "function" && typeof valueObject[key] === "string" && blocked.indexOf(key) < 0;
        const allPromises = Object.keys(valueObject).filter((func) => isGettable(func)).map((func) => {
          const params = valueObject[func].substring(valueObject[func].lastIndexOf("(") + 1, valueObject[func].lastIndexOf(")"));
          let funcWithoutParams = func.indexOf(")") >= 0 ? func.split(")")[1].trim() : func;
          funcWithoutParams = func.indexOf("|") >= 0 ? func.split("|")[0].trim() : funcWithoutParams;
          if (params) {
            return exports[funcWithoutParams](params);
          } else {
            return exports[funcWithoutParams]("");
          }
        });
        Promise.all(allPromises).then((data) => {
          const result = {};
          let i = 0;
          for (let key in valueObject) {
            if ({}.hasOwnProperty.call(valueObject, key) && isGettable(key) && data.length > i) {
              if (valueObject[key] === "*" || valueObject[key] === "all") {
                result[key] = data[i];
              } else {
                let keys = valueObject[key];
                let filter2 = "";
                let filterParts = [];
                if (keys.indexOf(")") >= 0) {
                  keys = keys.split(")")[1].trim();
                }
                if (keys.indexOf("|") >= 0) {
                  filter2 = keys.split("|")[1].trim();
                  filterParts = filter2.split(":");
                  keys = keys.split("|")[0].trim();
                }
                keys = keys.replace(/,/g, " ").replace(/ +/g, " ").split(" ");
                if (data[i]) {
                  if (Array.isArray(data[i])) {
                    const partialArray = [];
                    data[i].forEach((element) => {
                      let partialRes = {};
                      if (keys.length === 1 && (keys[0] === "*" || keys[0] === "all")) {
                        partialRes = element;
                      } else {
                        keys.forEach((k) => {
                          if ({}.hasOwnProperty.call(element, k)) {
                            partialRes[k] = element[k];
                          }
                        });
                      }
                      if (filter2 && filterParts.length === 2) {
                        if ({}.hasOwnProperty.call(partialRes, filterParts[0].trim())) {
                          const val = partialRes[filterParts[0].trim()];
                          if (typeof val === "number") {
                            if (val === parseFloat(filterParts[1].trim())) {
                              partialArray.push(partialRes);
                            }
                          } else if (typeof val === "string") {
                            if (val.toLowerCase() === filterParts[1].trim().toLowerCase()) {
                              partialArray.push(partialRes);
                            }
                          }
                        }
                      } else {
                        partialArray.push(partialRes);
                      }
                    });
                    result[key] = partialArray;
                  } else {
                    const partialRes = {};
                    keys.forEach((k) => {
                      if ({}.hasOwnProperty.call(data[i], k)) {
                        partialRes[k] = data[i][k];
                      }
                    });
                    result[key] = partialRes;
                  }
                } else {
                  result[key] = {};
                }
              }
              i++;
            }
          }
          if (callback) {
            callback(result);
          }
          resolve(result);
        });
      });
    });
  }
  function observe(valueObject, interval, callback) {
    let _data = null;
    const result = setInterval(() => {
      get(valueObject).then((data) => {
        if (JSON.stringify(_data) !== JSON.stringify(data)) {
          _data = Object.assign({}, data);
          callback(data);
        }
      });
    }, interval);
    return result;
  }
  exports.version = version2;
  exports.system = system2.system;
  exports.bios = system2.bios;
  exports.baseboard = system2.baseboard;
  exports.chassis = system2.chassis;
  exports.time = osInfo2.time;
  exports.osInfo = osInfo2.osInfo;
  exports.versions = osInfo2.versions;
  exports.shell = osInfo2.shell;
  exports.uuid = osInfo2.uuid;
  exports.cpu = cpu2.cpu;
  exports.cpuFlags = cpu2.cpuFlags;
  exports.cpuCache = cpu2.cpuCache;
  exports.cpuCurrentSpeed = cpu2.cpuCurrentSpeed;
  exports.cpuTemperature = cpu2.cpuTemperature;
  exports.currentLoad = cpu2.currentLoad;
  exports.fullLoad = cpu2.fullLoad;
  exports.mem = memory$1.mem;
  exports.memLayout = memory$1.memLayout;
  exports.battery = battery$1;
  exports.graphics = graphics2.graphics;
  exports.fsSize = filesystem$1.fsSize;
  exports.fsOpenFiles = filesystem$1.fsOpenFiles;
  exports.blockDevices = filesystem$1.blockDevices;
  exports.fsStats = filesystem$1.fsStats;
  exports.disksIO = filesystem$1.disksIO;
  exports.diskLayout = filesystem$1.diskLayout;
  exports.networkInterfaceDefault = network$1.networkInterfaceDefault;
  exports.networkGatewayDefault = network$1.networkGatewayDefault;
  exports.networkInterfaces = network$1.networkInterfaces;
  exports.networkStats = network$1.networkStats;
  exports.networkConnections = network$1.networkConnections;
  exports.wifiNetworks = wifi$1.wifiNetworks;
  exports.wifiInterfaces = wifi$1.wifiInterfaces;
  exports.wifiConnections = wifi$1.wifiConnections;
  exports.services = processes2.services;
  exports.processes = processes2.processes;
  exports.processLoad = processes2.processLoad;
  exports.users = users2.users;
  exports.inetChecksite = internet$1.inetChecksite;
  exports.inetLatency = internet$1.inetLatency;
  exports.dockerInfo = docker$1.dockerInfo;
  exports.dockerImages = docker$1.dockerImages;
  exports.dockerContainers = docker$1.dockerContainers;
  exports.dockerContainerStats = docker$1.dockerContainerStats;
  exports.dockerContainerProcesses = docker$1.dockerContainerProcesses;
  exports.dockerVolumes = docker$1.dockerVolumes;
  exports.dockerAll = docker$1.dockerAll;
  exports.vboxInfo = vbox.vboxInfo;
  exports.printer = printer2.printer;
  exports.usb = usb2.usb;
  exports.audio = audio2.audio;
  exports.bluetoothDevices = bluetooth$1.bluetoothDevices;
  exports.getStaticData = getStaticData;
  exports.getDynamicData = getDynamicData;
  exports.getAllData = getAllData;
  exports.get = get;
  exports.observe = observe;
  exports.powerShellStart = util2.powerShellStart;
  exports.powerShellRelease = util2.powerShellRelease;
})(lib);
const si = /* @__PURE__ */ getDefaultExportFromCjs(lib);
var require$1 = module$1.createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require$1("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array, u16 = Uint16Array, i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j = b[i]; j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2), fl = _a.b, revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0), fd = _b.b;
_b.r;
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
  var x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var hMap = function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v = le[cd[i] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
};
var flt = new u8(288);
for (var i = 0; i < 144; ++i)
  flt[i] = 8;
for (var i = 144; i < 256; ++i)
  flt[i] = 9;
for (var i = 256; i < 280; ++i)
  flt[i] = 7;
for (var i = 280; i < 288; ++i)
  flt[i] = 8;
var fdt = new u8(32);
for (var i = 0; i < 32; ++i)
  fdt[i] = 5;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i = 1; i < a.length; ++i) {
    if (a[i] > m)
      m = a[i];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i = 0; i < hcLen; ++i) {
          clt[clim[i]] = bits(dat, pos + i * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i = 0; i < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i = sym - 257, b = fleb[i];
          add = bits(dat, pos, (1 << b) - 1) + fl[i];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i = 0; ; ) {
    var c = d[i++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i + eb > d.length)
      return { s: r, r: slc(d, i - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
  }
};
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i = 0; i < dat.length; i += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  for (var i = 0; i < c; ++i) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}
const pluginDirectories = () => [
  { directory: path$6.join(require$$3$1.app.getPath("userData"), "plugins"), source: "managed", removable: true },
  // 开发期构建的插件包固定进入项目沙盒，避免把可再生的 ZIP 混入源码或用户正式仓库。
  { directory: path$6.join(process.cwd(), "sandbox", "plugins"), source: "sandbox", removable: true },
  { directory: path$6.join(process.cwd(), "plugins"), source: "workspace", removable: false }
];
const isSafePluginEntry = (entry) => {
  const normalized = path$6.posix.normalize(entry.replaceAll("\\", "/"));
  return normalized !== "." && normalized !== ".." && !normalized.startsWith("../") && !path$6.posix.isAbsolute(normalized);
};
const readPluginPackage = (archivePath, meta) => {
  const file = path$6.basename(archivePath);
  try {
    if (fs$c.statSync(archivePath).size > 50 * 1024 * 1024) throw new Error("插件包超过 50 MB 限制");
    const archive = unzipSync(new Uint8Array(fs$c.readFileSync(archivePath)));
    if (Object.values(archive).reduce((total, bytes) => total + bytes.byteLength, 0) > 100 * 1024 * 1024) {
      throw new Error("插件包解压后超过 100 MB 限制");
    }
    const packageFile = archive["package.json"];
    if (!packageFile) throw new Error("ZIP 根目录缺少 package.json");
    const bundle = JSON.parse(strFromU8(packageFile));
    if (bundle.apiVersion !== 1 || !Array.isArray(bundle.plugins)) throw new Error("插件 API 版本不兼容");
    const plugins = bundle.plugins;
    if (!plugins.length || !plugins.every((plugin) => plugin.apiVersion === 1 && /^[a-z0-9][a-z0-9-]*$/.test(plugin.id) && Boolean(plugin.version && plugin.name && plugin.entry) && isSafePluginEntry(plugin.entry))) throw new Error("包中包含无效插件定义");
    if (new Set(plugins.map((plugin) => plugin.id)).size !== plugins.length) throw new Error("包中存在重复插件 ID");
    return plugins.map((plugin) => ({ ...plugin, file, ...meta }));
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
};
const loadPluginPackages = () => pluginDirectories().flatMap(({ directory, ...meta }) => {
  if (!fs$c.existsSync(directory)) return [];
  return fs$c.readdirSync(directory).filter((file) => file.endsWith(".zip")).flatMap((file) => {
    try {
      return readPluginPackage(path$6.join(directory, file), meta);
    } catch (error) {
      console.warn(`[plugins] ignored ${file}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  });
});
if (started) {
  require$$3$1.app.quit();
}
const primaryInstance = !started && require$$3$1.app.requestSingleInstanceLock();
if (!primaryInstance) require$$3$1.app.quit();
let quitting = false;
require$$3$1.app.on("before-quit", () => {
  quitting = true;
});
let preferences;
const disableHardwareAcceleration = process.env.WTTCH_DISABLE_HARDWARE_ACCELERATION === "1";
if (disableHardwareAcceleration) {
  require$$3$1.app.disableHardwareAcceleration();
  require$$3$1.app.commandLine.appendSwitch("disable-gpu");
  require$$3$1.app.commandLine.appendSwitch("in-process-gpu");
}
if (!require$$3$1.app.isPackaged && process.env.WTTCH_DISABLE_SANDBOX === "1") {
  require$$3$1.app.commandLine.appendSwitch("no-sandbox");
}
const CUSTOM_CHROME = process.platform === "win32";
const MACOS_CHROME = process.platform === "darwin";
const devServerUrl = require$$3$1.app.isPackaged ? void 0 : void 0;
const IPC = {
  minimize: "win:minimize",
  toggleMaximize: "win:toggle-maximize",
  close: "win:close",
  toggleDevTools: "win:toggle-devtools",
  maximizedChanged: "win:maximized-changed",
  systemStats: "system:stats",
  showNotification: "notifications:show",
  floatingOpen: "floating-widget:open",
  floatingUpdate: "floating-widget:update",
  floatingClose: "floating-widget:close",
  pluginPackages: "plugins:list",
  pluginInstall: "plugins:install",
  pluginRemove: "plugins:remove"
};
const floatingWidgets = /* @__PURE__ */ new Map();
const safeFloatingPluginId = (value) => typeof value === "string" && /^[a-z0-9][a-z0-9-]*$/.test(value);
const floatingSize = (value, fallback, min, max2) => typeof value === "number" && Number.isFinite(value) ? Math.round(Math.max(min, Math.min(max2, value))) : fallback;
const setFloatingVisibleOnAllWorkspaces = (window2, visible) => {
  try {
    window2.setVisibleOnAllWorkspaces(visible, { visibleOnFullScreen: true });
  } catch (error) {
    console.warn("[floating-widget] visible-on-all-workspaces is unavailable:", error);
  }
};
const applyFloatingOptions = (window2, options2 = {}) => {
  if (options2.width !== void 0 || options2.height !== void 0) {
    const [currentWidth, currentHeight] = window2.getSize();
    window2.setSize(
      floatingSize(options2.width, currentWidth, 180, 900),
      floatingSize(options2.height, currentHeight, 100, 700),
      true
    );
  }
  if (options2.alwaysOnTop !== void 0) {
    window2.setAlwaysOnTop(options2.alwaysOnTop, "floating");
    setFloatingVisibleOnAllWorkspaces(window2, options2.alwaysOnTop);
  }
  if (options2.locked !== void 0) {
    window2.setMovable(!options2.locked);
    window2.setResizable(!options2.locked);
  }
};
require$$3$1.ipcMain.handle(IPC.floatingOpen, async (_event, pluginId, options2 = {}) => {
  if (!safeFloatingPluginId(pluginId)) throw new Error("无效的浮动 Widget 插件 ID");
  const existing = floatingWidgets.get(pluginId);
  if (existing && !existing.isDestroyed()) {
    applyFloatingOptions(existing, options2);
    existing.show();
    existing.focus();
    return true;
  }
  const width = floatingSize(options2.width, 320, 180, 900);
  const height = floatingSize(options2.height, 190, 100, 700);
  const workArea = require$$3$1.screen.getDisplayNearestPoint(require$$3$1.screen.getCursorScreenPoint()).workArea;
  const floatingWindow = new require$$3$1.BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + 24,
    minWidth: 180,
    minHeight: 100,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    skipTaskbar: true,
    show: false,
    resizable: options2.locked !== true,
    movable: options2.locked !== true,
    alwaysOnTop: options2.alwaysOnTop !== false,
    webPreferences: { preload: path$6.join(__dirname, "preload.js"), backgroundThrottling: false }
  });
  floatingWidgets.set(pluginId, floatingWindow);
  setFloatingVisibleOnAllWorkspaces(floatingWindow, options2.alwaysOnTop !== false);
  floatingWindow.on("closed", () => floatingWidgets.delete(pluginId));
  const hash = `/floating/${pluginId}`;
  try {
    if (devServerUrl) ;
    else await floatingWindow.loadFile(path$6.join(__dirname, `../renderer/${"main_window"}/index.html`), { hash });
    if (floatingWindow.isDestroyed()) return false;
    floatingWindow.show();
    floatingWindow.focus();
    return floatingWindow.isVisible();
  } catch (error) {
    floatingWidgets.delete(pluginId);
    if (!floatingWindow.isDestroyed()) floatingWindow.destroy();
    console.error(`[floating-widget] failed to open ${pluginId}:`, error);
    throw error;
  }
});
require$$3$1.ipcMain.handle(IPC.floatingUpdate, (_event, pluginId, options2 = {}) => {
  if (!safeFloatingPluginId(pluginId)) return false;
  const floatingWindow = floatingWidgets.get(pluginId);
  if (!floatingWindow || floatingWindow.isDestroyed()) return false;
  applyFloatingOptions(floatingWindow, options2);
  return true;
});
require$$3$1.ipcMain.handle(IPC.floatingClose, (_event, pluginId) => {
  if (!safeFloatingPluginId(pluginId)) return false;
  const floatingWindow = floatingWidgets.get(pluginId);
  if (!floatingWindow || floatingWindow.isDestroyed()) return false;
  floatingWindow.close();
  return true;
});
require$$3$1.ipcMain.handle(IPC.showNotification, (_event, input) => {
  const title = typeof (input == null ? void 0 : input.title) === "string" ? input.title.trim().slice(0, 120) : "";
  const body = typeof (input == null ? void 0 : input.body) === "string" ? input.body.trim().slice(0, 500) : "";
  if (!title || !require$$3$1.Notification.isSupported()) return false;
  new require$$3$1.Notification({ title, body, silent: input.silent === true }).show();
  return true;
});
require$$3$1.ipcMain.handle(IPC.pluginPackages, () => loadPluginPackages());
require$$3$1.ipcMain.handle(IPC.pluginInstall, async () => {
  const result = await require$$3$1.dialog.showOpenDialog({
    title: "加载 wttch-hub 插件包",
    properties: ["openFile"],
    filters: [{ name: "wttch-hub 插件包", extensions: ["zip"] }]
  });
  if (result.canceled || !result.filePaths[0]) return { installed: [], cancelled: true };
  const source = result.filePaths[0];
  readPluginPackage(source, { source: "managed", removable: true });
  const managedDirectory = pluginDirectories()[0].directory;
  fs$c.mkdirSync(managedDirectory, { recursive: true });
  const destination = path$6.join(managedDirectory, path$6.basename(source));
  if (path$6.resolve(source) !== path$6.resolve(destination)) fs$c.copyFileSync(source, destination);
  return { installed: readPluginPackage(destination, { source: "managed", removable: true }) };
});
require$$3$1.ipcMain.handle(IPC.pluginRemove, (_event, file) => {
  const managedDirectory = pluginDirectories()[0].directory;
  const target = path$6.join(managedDirectory, path$6.basename(file));
  if (path$6.dirname(target) !== managedDirectory || !target.endsWith(".zip")) throw new Error("无效的插件包路径");
  if (fs$c.existsSync(target)) fs$c.unlinkSync(target);
  return loadPluginPackages();
});
require$$3$1.ipcMain.handle(IPC.systemStats, async () => {
  const [load, memory2, io, networkInterface] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.disksIO(),
    si.networkInterfaceDefault()
  ]);
  const graphics2 = await si.graphics();
  const network2 = networkInterface ? await si.networkStats(networkInterface) : [];
  const networkStats2 = network2[0];
  return {
    cpu: load.currentLoad,
    gpu: graphics2.controllers.reduce((total, controller) => total + (controller.utilizationGpu ?? 0), 0) / Math.max(1, graphics2.controllers.length),
    memory: memory2.used / memory2.total * 100,
    readBytes: io.rIO_sec,
    writeBytes: io.wIO_sec,
    downloadBytes: (networkStats2 == null ? void 0 : networkStats2.rx_sec) ?? 0,
    uploadBytes: (networkStats2 == null ? void 0 : networkStats2.tx_sec) ?? 0
  };
});
if (CUSTOM_CHROME || MACOS_CHROME) {
  require$$3$1.ipcMain.on(IPC.minimize, (event) => {
    var _a2;
    (_a2 = require$$3$1.BrowserWindow.fromWebContents(event.sender)) == null ? void 0 : _a2.minimize();
  });
  require$$3$1.ipcMain.on(IPC.toggleMaximize, (event) => {
    const win = require$$3$1.BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  require$$3$1.ipcMain.on(IPC.close, (event) => {
    var _a2;
    (_a2 = require$$3$1.BrowserWindow.fromWebContents(event.sender)) == null ? void 0 : _a2.close();
  });
}
require$$3$1.ipcMain.on(IPC.toggleDevTools, (event) => {
  const win = require$$3$1.BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.webContents.isDevToolsOpened()) {
    win.webContents.closeDevTools();
  } else {
    win.webContents.openDevTools({ mode: "detach" });
  }
});
const ICONFONT_UPSTREAM = "https://www.iconfont.cn/api/icon/search.json";
require$$3$1.ipcMain.handle("iconfont:search", async (_event, body) => {
  try {
    const res = await require$$3$1.net.fetch(ICONFONT_UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://www.iconfont.cn/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        ...process.env.ICONFONT_COOKIE ? { Cookie: `EGG_SESS_ICONFONT=${process.env.ICONFONT_COOKIE}` } : {}
      },
      body
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch (err2) {
    return {
      status: 0,
      text: "",
      error: err2 instanceof Error ? err2.message : String(err2)
    };
  }
});
let workbenchWindow;
let systemTray;
const createWindow = () => {
  if (workbenchWindow && !workbenchWindow.isDestroyed()) return workbenchWindow;
  const mainWindow = new require$$3$1.BrowserWindow({
    icon: getApplicationIconPath(),
    width: 960,
    height: 640,
    minWidth: 600,
    minHeight: 420,
    frame: !CUSTOM_CHROME,
    // Layered transparent windows are unreliable with the software renderer
    // used by this project's Windows default. Keep macOS translucency, but
    // use a normal opaque compositor surface on Windows.
    transparent: MACOS_CHROME,
    backgroundColor: CUSTOM_CHROME ? "#f2f2f3" : void 0,
    ...process.platform === "darwin" ? {
      titleBarStyle: "hiddenInset",
      vibrancy: "titlebar",
      visualEffectState: "active",
      backgroundColor: "#00000000"
    } : {},
    show: false,
    webPreferences: {
      preload: path$6.join(__dirname, "preload.js"),
      // Alarm plugins keep their load-lifecycle scheduler active while the
      // window is minimized or fully covered.
      backgroundThrottling: false
    }
  });
  workbenchWindow = mainWindow;
  mainWindow.on("query-session-end", () => {
    quitting = true;
  });
  mainWindow.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    if (shouldHideOnClose(preferences.get(), quitting, Boolean(systemTray))) mainWindow.hide();
    else require$$3$1.app.quit();
  });
  mainWindow.on("closed", () => {
    if (workbenchWindow === mainWindow) workbenchWindow = void 0;
    systemTray == null ? void 0 : systemTray.refresh();
  });
  mainWindow.on("show", () => systemTray == null ? void 0 : systemTray.refresh());
  mainWindow.on("hide", () => systemTray == null ? void 0 : systemTray.refresh());
  if (CUSTOM_CHROME) {
    const reportMaximized = () => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC.maximizedChanged, mainWindow.isMaximized());
      }
    };
    mainWindow.on("maximize", reportMaximized);
    mainWindow.on("unmaximize", reportMaximized);
  }
  let shownInitially = false;
  const showInitially = () => {
    if (shownInitially || mainWindow.isDestroyed()) return;
    shownInitially = true;
    mainWindow.show();
  };
  mainWindow.once("ready-to-show", showInitially);
  const loadMainWindow = mainWindow.loadFile(
    path$6.join(__dirname, `../renderer/${"main_window"}/index.html`)
  );
  void loadMainWindow.then(showInitially, (error) => {
    console.error("[window] failed to load main page:", error);
    showInitially();
  });
  if (process.env.WTTCH_DIAG === "1") {
    mainWindow.webContents.on("console-message", (_e, ...rest) => {
      console.log("[renderer]", ...rest.map((v) => {
        if (typeof v === "object") {
          try {
            return JSON.stringify(v);
          } catch {
            return String(v);
          }
        }
        return v;
      }));
    });
    mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription) => {
      console.error("[diag] did-fail-load", errorCode, errorDescription);
    });
    mainWindow.webContents.on("render-process-gone", (_e, details) => {
      console.error("[diag] render-process-gone", JSON.stringify(details));
    });
    mainWindow.webContents.on("did-finish-load", async () => {
      const sleep = (ms2) => new Promise((r) => setTimeout(r, ms2));
      const snap = async () => {
        try {
          return await mainWindow.webContents.executeJavaScript(`({
            href: location.href,
            title: document.title,
            bodyText: document.body.innerText.slice(0, 90),
            toolCards: document.querySelectorAll('.tool-card').length,
            appShell: !!document.querySelector('.app-shell'),
            activeLabel: document.querySelector('.nav-item.router-link-active .nav-label')?.textContent?.trim(),
          })`);
        } catch (err2) {
          return { evalFailed: String(err2) };
        }
      };
      const tour = [
        { name: "01-home", hash: "#/home", wait: 1200 },
        { name: "02-tools", hash: "#/tools", wait: 1e3 },
        { name: "03-folderart", hash: "#/tools/folderart", wait: 1800 },
        { name: "04-packetdraw", hash: "#/tools/packetdraw", wait: 1600 },
        { name: "05-radixconv", hash: "#/tools/radixconv", wait: 1200 },
        { name: "06-bitparser", hash: "#/tools/bitparser", wait: 1400 }
      ];
      for (const stop of tour) {
        try {
          await mainWindow.webContents.executeJavaScript(
            `location.hash = ${JSON.stringify(stop.hash)}; 'ok'`
          );
          await sleep(stop.wait);
          const state = await snap();
          console.log(`[diag] view ${stop.name}`, JSON.stringify(state));
          if (!process.env.WTTCH_DIAG_NO_SHOT) {
            const img = await mainWindow.webContents.capturePage();
            fs$c.mkdirSync(".diag", { recursive: true });
            fs$c.writeFileSync(path$6.join(".diag", `${stop.name}.png`), img.toPNG());
            console.log(`[diag] shot ${stop.name}`);
          }
        } catch (err2) {
          console.error(`[diag] tour stop failed ${stop.name}`, err2);
        }
      }
      try {
        const probe = await mainWindow.webContents.executeJavaScript(`(async () => {
          if (!window.iconFontSearch) return { skipped: true };
          var params = new URLSearchParams({ q: 'edit', sortType: 'updated_at', page: '1', pageSize: '5', fromCollection: '-1', fills: '', t: String(Date.now()) }).toString();
          var res = await window.iconFontSearch(params);
          var out = { status: res.status, error: res.error || null };
          try { var j = JSON.parse(res.text); out.code = j.code; out.icons = (j.data && j.data.icons ? j.data.icons.length : 0); } catch (e) { out.parseError = String(e); }
          return out;
        })()`);
        console.log("[diag] iconfont probe", JSON.stringify(probe));
      } catch (err2) {
        console.error("[diag] iconfont probe failed", err2);
      }
    });
  }
  return mainWindow;
};
const showWorkbench = () => {
  const window2 = createWindow();
  if (window2.isMinimized()) window2.restore();
  window2.show();
  window2.focus();
};
require$$3$1.app.on("ready", () => {
  var _a2;
  if (!primaryInstance || quitting) return;
  preferences = createPreferences(require$$3$1.app.getPath("userData"));
  const rendererUrl = node_url.pathToFileURL(path$6.join(__dirname, `../renderer/${"main_window"}/index.html`)).href;
  const isAppUrl = (input) => {
    try {
      const actual = new URL(input);
      const expected = new URL(rendererUrl);
      return actual.protocol === expected.protocol && actual.host === expected.host && actual.pathname === expected.pathname;
    } catch {
      return false;
    }
  };
  registerAiIpc(isAppUrl);
  registerWechatIpc(isAppUrl);
  registerDataIpc(isAppUrl, preferences, () => Boolean(systemTray), () => {
    for (const window2 of floatingWidgets.values()) window2.destroy();
    floatingWidgets.clear();
  });
  if (process.platform === "darwin") (_a2 = require$$3$1.app.dock) == null ? void 0 : _a2.setIcon(getApplicationIconPath());
  try {
    systemTray = createSystemTray({
      show: showWorkbench,
      hide: () => workbenchWindow == null ? void 0 : workbenchWindow.hide(),
      isVisible: () => Boolean(workbenchWindow && !workbenchWindow.isDestroyed() && workbenchWindow.isVisible()),
      quit: () => require$$3$1.app.quit()
    });
  } catch (error) {
    console.error("[tray] 初始化失败：", error);
  }
  createWindow();
});
require$$3$1.app.on("will-quit", () => {
  systemTray == null ? void 0 : systemTray.destroy();
  systemTray = void 0;
});
require$$3$1.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    require$$3$1.app.quit();
  }
});
require$$3$1.app.on("activate", () => {
  if (primaryInstance && require$$3$1.app.isReady() && !quitting) showWorkbench();
});
require$$3$1.app.on("second-instance", () => {
  if (require$$3$1.app.isReady() && !quitting) showWorkbench();
});
//# sourceMappingURL=main.js.map
