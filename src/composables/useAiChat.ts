/**
 * 文件说明：为工作台提供共享的聊天抽屉开关与 AI 会话实例，让不同入口复用同一聊天状态。
 */

import { ref } from 'vue';
import { createChatSession } from '../ai/chatSession';
import { useAiService } from './useAiService';

const opened = ref(false);
const ai = useAiService();
// 关闭抽屉保留当前会话，应用重启后清空；聊天内容不会自动写入磁盘。
const session = createChatSession({ chat: ai.chat, cancel: (id) => ai.cancel('builtin-chat', id) });
export const useAiChat = () => ({
  opened,
  session,
  open: () => { opened.value = true; },
  close: () => { opened.value = false; },
});
