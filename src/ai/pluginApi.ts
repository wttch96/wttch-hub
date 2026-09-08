/**
 * 为每个插件创建带权限检查的 AI 客户端，合并默认提示词等参数，
 * 并跟踪请求及取消资源。
 */

import type { AiBridge } from './contracts';
import type {
  AiChatRequest,
  AiResult,
  AiStatus,
  AiToolRegistration,
  Disposable,
  PluginAiApi,
  ToolPlugin,
} from '@wttch-hub/plugin-api';
import { aiFailure } from './shared';
import { registerAiTool } from './tools';

/** 将已通过可用性检查的宿主桥接对象交给具体业务操作执行。 */
type AiAction<T> = (host: AiBridge) => Promise<AiResult<T>>;

/**
 * 插件专属 AI API 的实现。
 *
 * 每个实例固定绑定一个插件 owner；所有公开调用都会重新校验插件的
 * 能力和启用状态，因此插件禁用后，已有 API 引用也无法发起新请求。
 */
export class PluginAiApiClient implements PluginAiApi {
  /**
   * 宿主以 owner 区分不同插件的请求。该值只由插件 ID 构造，
   * 插件代码无法伪造其他插件的 owner 来调用取消等操作。
   */
  private readonly owner: string;

  /**
   * 正在执行的请求 ID。用于阻止同一插件以相同 ID 并发提交，
   * 避免取消、状态和返回结果无法对应到唯一请求。
   */
  private readonly requests = new Set<string>();

  constructor(
    private readonly plugin: ToolPlugin,
    private readonly enabled: () => boolean,
    private readonly bridge: () => AiBridge | undefined,
    private readonly subscriptions: Disposable[] = [],
  ) {
    this.owner = `plugin:${plugin.id}`;
  }

  /** 获取宿主 AI 服务状态；调用前会校验插件 AI 权限及启用状态。 */
  getStatus = () => this.run(host => host.getStatus());

  /**
   * 发起连接测试。未传入请求 ID 时生成 UUID，便于宿主侧追踪与取消。
   * 测试请求同样纳入生命周期订阅列表，插件卸载时可被统一取消。
   */
  test = (requestId = crypto.randomUUID()) =>
    this.run(host => this.track(host, requestId, () => host.test(this.owner, requestId)));

  /**
   * 发起对话请求：调用参数覆盖插件声明的默认 AI 参数；
   * 但未定义的调用参数不会覆盖默认值，requestId 始终由本次调用确定。
   */
  chat = (request: AiChatRequest) =>
    this.run(async host => {
      const requestId = request.requestId ?? crypto.randomUUID();
      return this.track(host, requestId, () =>
        host.chat(this.owner, this.createChatRequest(request, requestId)),
      );
    });

  registerTool = (tool: AiToolRegistration) => {
    // 工具注册会影响全局工具表，未授权插件必须保持无副作用。
    if (!this.isAllowed()) return this.emptyDisposable();

    const registration = registerAiTool(tool);
    // 插件卸载时，运行时会遍历 subscriptions，借此自动注销工具。
    return this.trackDisposable(registration);
  };

  /**
   * 允许取消已发出的请求，即使插件随后被禁用；但仍只能取消本插件 owner
   * 下的请求。桥接不可用或宿主调用失败时，统一返回 false，不向插件抛异常。
   */
  cancel = async (requestId: string) => {
    if (!this.plugin.capabilities?.ai) return false;
    try {
      return (await this.bridge()?.cancel(this.owner, requestId)) ?? false;
    } catch {
      return false;
    }
  };

  onDidChange = (listener: (status: AiStatus) => void) => {
    // 未获授权时不建立 IPC 监听，返回可安全 dispose 的空对象以保持 API 一致。
    if (!this.isAllowed()) return this.emptyDisposable();

    const subscription = this.bridge()?.onDidChange(status => {
      // 监听建立后插件可能被禁用；此时不再将宿主状态传给插件。
      if (this.enabled()) listener(status);
    });
    // 浏览器预览等无桥接环境下，subscription 为空且不需要清理。
    return subscription ? this.trackDisposable(subscription) : this.emptyDisposable();
  };

  /** 每次操作实时检查权限，避免旧 API 引用绕过插件禁用状态。 */
  private isAllowed(): boolean {
    return Boolean(this.plugin.capabilities?.ai && this.enabled());
  }

  private async run<T>(action: AiAction<T>): Promise<AiResult<T>> {
    if (!this.isAllowed()) {
      return aiFailure('FORBIDDEN', `插件 ${this.plugin.id} 未声明 AI 能力或已被禁用。`);
    }

    // bridge 是惰性获取的：桌面应用关闭或预览环境中可能不存在。
    const host = this.bridge();
    if (!host) return aiFailure('UNAVAILABLE', 'AI 服务需要在桌面应用中运行。');

    try {
      return await action(host);
    } catch {
      // 桥接层异常不能泄露给插件，转为 API 约定的可恢复失败结果。
      return aiFailure('UNAVAILABLE', '宿主 AI 服务暂时不可用。', true);
    }
  }

  private async track<T>(
    host: AiBridge,
    requestId: string,
    action: () => Promise<AiResult<T>>,
  ): Promise<AiResult<T>> {
    // 相同 ID 尚未完成时拒绝重复调用，避免后一次请求覆盖前一次清理资源。
    if (this.requests.has(requestId)) return aiFailure('BUSY', '该请求 ID 正在使用中。', true);

    this.requests.add(requestId);
    // 将取消器交由插件生命周期管理；dispose 不等待 IPC 返回，防止卸载流程被阻塞。
    const cancellation = {
      dispose: () => {
        void host.cancel(this.owner, requestId).catch(() => undefined);
      },
    };
    this.subscriptions.push(cancellation);

    try {
      return await action();
    } finally {
      // 无论成功、失败或抛异常，均释放并发占位及生命周期中的取消器。
      this.requests.delete(requestId);
      this.removeSubscription(cancellation);
    }
  }

  private createChatRequest(request: AiChatRequest, requestId: string): AiChatRequest {
    return {
      // 插件清单中的配置作为默认值，例如 systemPrompt、temperature。
      ...this.plugin.ai,
      // 只覆盖显式传入的字段，undefined 不会意外清空默认配置。
      ...Object.fromEntries(Object.entries(request).filter(([, value]) => value !== undefined)),
      // 避免插件默认值覆盖本次请求使用的 ID。
      requestId,
    } as typeof request;
  }

  private trackDisposable(subscription: Disposable): Disposable {
    // 用包装对象而非直接保存 subscription，确保手动 dispose 也会移出数组。
    const owned: Disposable = {
      dispose: () => {
        subscription.dispose();
        this.removeSubscription(owned);
      },
    };
    this.subscriptions.push(owned);
    return owned;
  }

  private removeSubscription(subscription: Disposable): void {
    const index = this.subscriptions.indexOf(subscription);
    if (index >= 0) this.subscriptions.splice(index, 1);
  }

  private emptyDisposable(): Disposable {
    return {
      dispose() {
        /* 未授权或无宿主桥接时无需释放任何资源。 */
      },
    };
  }
}

/**
 * 兼容既有运行时装配代码的工厂函数。
 * 新代码如需直接访问实现细节可实例化 PluginAiApiClient；对外仍只暴露 PluginAiApi 接口。
 */
export const createPluginAiApi = (
  plugin: ToolPlugin,
  enabled: () => boolean,
  bridge: () => AiBridge | undefined,
  subscriptions: Disposable[] = [],
): PluginAiApi => new PluginAiApiClient(plugin, enabled, bridge, subscriptions);
