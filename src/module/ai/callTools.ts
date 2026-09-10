/**
 * 文件说明：维护渲染器侧的 AI 工具注册表。模型只接收可序列化的声明，
 * 实际操作仍由拥有插件状态的插件执行，避免把插件存储或 UI 权限交给主进程。
 */

import type { AiToolCall, AiToolDefinition, Disposable } from '@wttch-hub/plugin-api';

/**
 * 已经注册的 AI 工具定义，包含实际调用方法。
 */
export type RegisteredAiTool = AiToolDefinition & {
  /**
   * 实际调用方法，接收参数并返回结果。
   *
   * @remarks
   * 这个方法会在插件的上下文中执行，因此可以访问插件的状态和能力。
   * 但是请注意，参数必须是可序列化的对象，不能包含函数或循环引用。
   * @param args 调用参数，必须符合工具定义中的参数结构。
   * @returns 返回值可以是任意类型，但必须是可序列化的对象。
   * @throws 如果参数不符合要求，或者执行过程中发生错误，会抛出异常。
   */
  invoke(args: Record<string, unknown>): Promise<unknown> | unknown;
};

/**
 * 维护已注册的 AI 工具的全局注册表。
 *
 * @remarks
 * 这个注册表是全局的，所有插件共享同一个注册表。
 * 插件可以通过 registerAiTool 注册工具，也可以通过 invokeRegisteredAiTool 调用工具。
 * 注册表中的工具名称必须唯一，否则后注册的工具会覆盖之前的工具。
 * 插件卸载时，会自动清理注册表中该插件注册的工具。
 * 这个注册表只维护工具的声明和调用方法，不会存储插件的状态或 UI 权限。
 * 因此，模型只能接收工具的声明，而实际操作仍由拥有插件状态的插件执行。
 * 这样可以避免把插件存储或 UI 权限交给主进程，提高安全性。
 */
export class AiToolRegistry {
  private readonly tools = new Map<string, RegisteredAiTool>();

  /**
   * 注册一个新的 AI 工具。
   *
   * @param tool 已经注册的 AI 工具定义，包含名称、描述、参数结构和调用方法。
   * @returns 一个可释放的对象，用于清理注册的工具。
   */
  register(tool: RegisteredAiTool): Disposable {
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(tool.name)) {
      throw new Error('AI 工具名称无效');
    }

    this.tools.set(tool.name, tool);

    return {
      /**
       * 释放注册的 AI 工具。
       */
      dispose: () => {
        if (this.tools.get(tool.name) === tool) {
          this.tools.delete(tool.name);
        }
      },
    };
  }

  /**
   * 获取所有已注册的 AI 工具的声明。
   * @returns 已注册的 AI 工具的声明数组，每个声明包含名称、描述和参数结构。
   */
  definitions(): AiToolDefinition[] {
    // 防止 invoke 不能被序列化
    return [...this.tools.values()].map(({ name, description, schema }) => ({
      // 只暴露名称、描述和参数，隐藏执行逻辑和内部配置
      name,
      description,
      schema,
    }));
  }

  /**
   * 调用已注册的 AI 工具。
   * @param call 工具调用请求，包含工具名称和参数。
   * @returns 工具的执行结果。
   */
  async invoke(call: AiToolCall): Promise<unknown> {
    const tool = this.tools.get(call.name);
    if (!tool) throw new Error(`AI 工具不存在：${call.name}`);
    return tool.invoke(call.args);
  }
}

/** 共享注册表；保留函数导出以兼容现有调用方。 */
/** 全局唯一的 AI 工具注册表，供内置聊天与插件 API 共同使用。 */
export const registry = new AiToolRegistry();
