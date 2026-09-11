import { reactive } from 'vue';
import type { PluginLifecycleContext } from '@wttch-hub/plugin-api';

export const networkConfig = reactive({
  connectionType: 'udp' as 'udp' | 'tcp',
  tcpMode: 'client' as 'client' | 'server',
  localHost: '0.0.0.0',
  localPort: 9000,
  remoteHost: '127.0.0.1',
  remotePort: 9000,
});

class Context {
  context?: PluginLifecycleContext;
}

export const instance = new Context();
