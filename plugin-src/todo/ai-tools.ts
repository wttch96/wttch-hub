/**
 * 为 ai 声明的工具调用的原始函数。
 */
import {
  addTodo,
  todoState,
  AddTodoArgSchema,
  RemoveTodoArgSchema,
  RemoveTodoArg,
  removeTodo,
  moveTodo,
  addLane,
} from './store';
import { z } from 'zod';
import type { AiToolRegistration } from '@wttch-hub/plugin-api';

export const addTodoTool: AiToolRegistration<typeof AddTodoArgSchema> = {
  name: 'add',
  description: '新增一条待办。laneId 省略时放入待处理泳道。',
  schema: AddTodoArgSchema,
  invoke: args => {
    const added = addTodo(args);
    if (!added) throw new Error('无法新增待办，请检查标题和泳道 ID');
    return todoState.items.at(-1);
  },
};

export const todoListTool: AiToolRegistration = {
  name: 'list',
  description: '查看当前待办和泳道，用于确认可操作的待办 ID、泳道 ID 与状态。',
  schema: z.object({}),
  invoke: () => ({ lanes: todoState.lanes, items: todoState.items }),
};

export const removeToolTool: AiToolRegistration<typeof RemoveTodoArgSchema> = {
  name: 'delete',
  description: '按待办 ID 删除一条待办。',
  schema: RemoveTodoArgSchema,
  invoke: (args: RemoveTodoArg) => {
    if (typeof args.id !== 'string' || !todoState.items.some(item => item.id === args.id))
      throw new Error('找不到该待办');
    removeTodo(args.id);
    return { deleted: args.id };
  },
};

const MoveTodoArgSchema = z.object({
  id: z.string(),
  laneId: z.string(),
  beforeId: z.string().optional(),
});

type MoveTodoArg = z.infer<typeof MoveTodoArgSchema>;

export const moveTodoTool: AiToolRegistration<typeof MoveTodoArgSchema> = {
  name: 'move',
  description: '把待办移动到指定泳道；可选 beforeId 将它放到另一待办之前。',
  schema: MoveTodoArgSchema,
  invoke: (args: MoveTodoArg) => {
    if (
      typeof args.id !== 'string' ||
      typeof args.laneId !== 'string' ||
      !moveTodo(args.id, args.laneId, typeof args.beforeId === 'string' ? args.beforeId : undefined)
    )
      throw new Error('无法移动待办，请检查待办和泳道 ID');
    return todoState.items.find(item => item.id === args.id);
  },
};

const AddTodoLaneArgSchema = z.object({
  title: z.string(),
});

type AddTodoLaneArg = z.infer<typeof AddTodoLaneArgSchema>;

export const addTodoLaneTool: AiToolRegistration<typeof AddTodoLaneArgSchema> = {
  name: 'add_lane',
  description: '为待办添加一个泳道.',
  schema: AddTodoLaneArgSchema,
  invoke: (args: AddTodoLaneArg) => {
    const result = addLane(args.title);
    if (!result) throw new Error('添加泳道失败!');
    // Tool responses must be serializable content. Returning `undefined` makes
    // LangChain create an empty tool message, which cannot be sent back to the
    // provider in the next agent turn.
    return todoState.lanes.find(lane => lane.title === args.title.trim());
  },
};
