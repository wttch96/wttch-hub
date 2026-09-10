type LogContext = Record<string, unknown>;
let enabled = false;

/** 统一主进程日志入口：仅输出 console，不落盘、不依赖 Electron 专用日志库。 */
export const initializeDebugLogger = (_userDataDirectory: string, initialEnabled: boolean) => {
  setDebugLoggingEnabled(initialEnabled);
};

export const setDebugLoggingEnabled = (value: boolean) => {
  enabled = value;
  if (value) {
    console.info('[debug] diagnostic console logging enabled');
  }
};

export const debugLog = (scope: string, event: string, context: LogContext = {}) => {
  if (!enabled) return;
  const message = `[${scope}] ${event}`;
  console.info(message, context);
};

export const debugError = (scope: string, event: string, error: unknown, context: LogContext = {}) => {
  // 错误始终可见，避免诊断开关关闭时再次吞掉异常。
  const message = `[${scope}] ${event}`;
  const details = {
    ...context,
    error: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
  };
  console.error(message, details);
};
