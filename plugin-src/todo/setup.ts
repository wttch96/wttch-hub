import { PluginComponentApi, PluginLifecycleContext } from '@wttch-hub/plugin-api';
import {
  addTodoLaneTool,
  addTodoTool,
  moveTodoTool,
  removeToolTool,
  todoListTool,
} from './ai-tools.ts';
import { connectTodoStore, disconnectTodoStore } from './store.ts';

/**
 * 主题扩展。
 *
 * 可以判断主题插件是否安装，如果安装可以依托于主题插件对本插件进行一些颜色上的定义。
 * 这些定义的颜色会自动放在主题的配置页面。
 *
 * 这个的具体定义要看 theme 插件的 extension.ts 文件，实际定义是在里面。
 */
type ThemeExtension = {
  registerColor(key: string, defaultValue: string, description?: string): { dispose(): void };
  getColor(key: string): string | undefined;
  onDidChange(listener: () => void): { dispose(): void };
};

const applyPriorityColors = (theme: ThemeExtension) => {
  const root = document.documentElement;
  root.style.setProperty('--todo-priority-low', theme.getColor('todo.priority-low') ?? '#168A45');
  root.style.setProperty(
    '--todo-priority-normal',
    theme.getColor('todo.priority-normal') ?? '#0A84FF',
  );
  root.style.setProperty('--todo-priority-high', theme.getColor('todo.priority-high') ?? '#E5484D');
};
/**
 * @internal
 */
export function setup(context: PluginLifecycleContext) {
  connectTodoStore(context as PluginComponentApi);
  context.subscriptions.push({ dispose: disconnectTodoStore });
  // 注册插件所有可用的工具
  context.ai.registerTools([
    addTodoTool,
    todoListTool,
    removeToolTool,
    moveTodoTool,
    addTodoLaneTool,
  ]);
  trySetupTheme(context);
}

function trySetupTheme(context: PluginLifecycleContext) {
  // 获取主题
  const theme = context.extensions.getExtension<ThemeExtension>('theme');
  if (!theme) return;
  context.subscriptions.push(
    ...[
      theme.registerColor('todo.priority-low', '#168A45', 'Todo 低优先级颜色'),
      theme.registerColor('todo.priority-normal', '#0A84FF', 'Todo 普通优先级颜色'),
      theme.registerColor('todo.priority-high', '#E5484D', 'Todo 高优先级颜色'),
      theme.onDidChange(() => applyPriorityColors(theme)),
    ],
  );
  applyPriorityColors(theme);
}
