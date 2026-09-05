/**
 * 文件说明：按插件 ID 串行执行生命周期任务，避免异步激活、释放和禁用之间发生竞态。
 */

/**
 * 为每个插件维护独立的生命周期队列。
 * 同一插件的加载、激活、释放和禁用按调用顺序执行，避免异步回调交叉修改状态；
 * 不同插件仍可并行启动，因此慢插件不会阻塞其他插件。
 */
export const createLifecycleQueue = () => {
  const pending = new Map<string, Promise<void>>();
  return <T>(id: string, operation: () => Promise<T>): Promise<T> => {
    const result = (pending.get(id) ?? Promise.resolve()).then(operation);
    // 队列尾部吸收错误，让后续清理仍可执行；调用方收到的 result 保留原始异常。
    const settled = result.then(() => undefined, () => undefined);
    pending.set(id, settled);
    void settled.then(() => {
      // 只有当前尾任务可以删除队列，较早完成的任务不能误删后来排入的操作。
      if (pending.get(id) === settled) pending.delete(id);
    });
    return result;
  };
};
