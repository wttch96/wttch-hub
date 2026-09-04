<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Bug } from 'lucide-vue-next';
import Sidebar from './components/Sidebar.vue';
import SheetHost from './components/SheetHost.vue';
import ToastHost from './components/ToastHost.vue';
import { pluginRuntime } from './plugins/runtime';

const appName = 'wttch-hub';

const route = useRoute();
const isFloatingWindow = computed(() => route.meta.floating === true);
const floatingPluginId = computed(() => typeof route.params.pluginId === 'string' ? route.params.pluginId : '');
// Keep nested layouts mounted while switching their child routes. Re-keying
// ToolsArea for every /tools/* navigation races its own child transition and
// can make Vue remove the same DOM node twice (parentNode is null).
const rootViewKey = computed(() => route.matched[0]?.path ?? route.path);

// The bottom status bar names where you are; its right-hand debug button toggles
// the Chrome DevTools (opened detached so the custom window keeps its shape).
const pageLabel = computed(() => {
  const statusbar = route.meta?.statusbar as { label?: string } | undefined;
  if (statusbar?.label) return statusbar.label;
  const title = route.meta?.title as string | undefined;
  if (route.meta?.tool && title) return `小工具 · ${title}`;
  const byName: Record<string, string> = {
    home: '主页',
    tools: '工具库',
    settings: '设置',
    plugins: '插件',
  };
  return byName[String(route.name)] ?? String(route.name ?? '');
});

// Windows draws all controls in the renderer. macOS keeps native traffic lights
// but uses the renderer for the shared translucent titlebar surface.
const controls = window.windowControls;
const customChrome = controls?.platform === 'win32';
const macOS = controls?.platform === 'darwin';

const isMaximized = ref(false);
let unsubscribe: (() => void) | undefined;
let releaseRoutePlugin: (() => Promise<void>) | undefined;
let routeActivation = 0;

onMounted(async () => {
  if (isFloatingWindow.value) {
    // A floating renderer only loads the theme plus its own plugin. Loading
    // every plugin here would start a second alarm scheduler.
    await pluginRuntime.initialize(['theme']);
    if (floatingPluginId.value) releaseRoutePlugin = await pluginRuntime.acquire(floatingPluginId.value, 'floating-widget', route.fullPath);
    return;
  }
  // Keep the zoom glyph and rounded corners in sync with the real window state.
  unsubscribe = controls?.onMaximizedChange((maximized) => {
    isMaximized.value = maximized;
  });
  await pluginRuntime.initialize();
});

watch(() => route.meta?.pluginId as string | undefined, async (pluginId) => {
  if (isFloatingWindow.value) return;
  const activation = ++routeActivation;
  await releaseRoutePlugin?.();
  releaseRoutePlugin = undefined;
  if (!pluginId) return;
  const acquired = await pluginRuntime.acquire(pluginId, 'route', route.fullPath);
  if (activation !== routeActivation) await acquired(); else releaseRoutePlugin = acquired;
}, { immediate: true });

onBeforeUnmount(() => {
  unsubscribe?.();
  void releaseRoutePlugin?.();
  void pluginRuntime.shutdown();
});

const minimize = () => controls?.minimize();
const toggleMaximize = () => controls?.toggleMaximize();
const close = () => controls?.close();
const toggleDevTools = () => controls?.toggleDevTools();

// Native behaviour on both platforms: double-clicking the title bar toggles
// between maximized and restored. On Windows a frame:false window does not
// always translate a double-click on a -webkit-app-region: drag area into a
// maximize on its own, so handle it explicitly here (clicks over the traffic
// lights are excluded - those mirror the native caption buttons).
const onTitleDblClick = (event: MouseEvent) => {
  if ((event.target as HTMLElement | null)?.closest('.traffic-lights')) return;
  toggleMaximize();
};
</script>

<template>
  <main
    v-if="isFloatingWindow"
    class="floating-window"
  >
    <RouterView />
  </main>
  <div
    v-else
    class="window"
    :class="{ 'is-custom': customChrome, 'is-macos': macOS, 'is-maximized': isMaximized }"
  >
    <!-- macOS uses native traffic lights over this draggable titlebar. -->
    <header
      v-if="customChrome || macOS"
      class="titlebar"
      @dblclick="onTitleDblClick"
    >
      <div
        v-if="customChrome"
        class="traffic-lights"
      >
        <button
          type="button"
          class="tl close"
          title="关闭"
          aria-label="Close"
          @click="close"
        >
          <svg
            viewBox="0 0 10 10"
            class="tl-glyph"
          >
            <path d="M2.2 2.2 L7.8 7.8 M7.8 2.2 L2.2 7.8" />
          </svg>
        </button>
        <button
          type="button"
          class="tl minimize"
          title="最小化"
          aria-label="Minimize"
          @click="minimize"
        >
          <svg
            viewBox="0 0 10 10"
            class="tl-glyph"
          >
            <path d="M1.8 5 H8.2" />
          </svg>
        </button>
        <button
          type="button"
          class="tl zoom"
          :title="isMaximized ? '还原' : '最大化'"
          :aria-label="isMaximized ? 'Restore' : 'Maximize'"
          @click="toggleMaximize"
        >
          <svg
            v-if="isMaximized"
            viewBox="0 0 10 10"
            class="tl-glyph"
          >
            <rect
              x="0.9"
              y="0.9"
              width="5.6"
              height="5.6"
              rx="1.2"
            />
            <rect
              x="3.4"
              y="3.4"
              width="5.6"
              height="5.6"
              rx="1.2"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 10 10"
            class="tl-glyph"
          >
            <rect
              x="2.1"
              y="1.9"
              width="6"
              height="6"
              rx="1.2"
            />
          </svg>
        </button>
      </div>
      <span class="title">{{ appName }}</span>
    </header>

    <!-- App shell: collapsible sidebar + routed content -->
    <div class="shell">
      <Sidebar />

      <main class="content">
        <RouterView v-slot="{ Component }">
          <Transition
            name="view"
            mode="out-in"
          >
            <component
              :is="Component"
              :key="rootViewKey"
            />
          </Transition>
        </RouterView>
      </main>
    </div>

    <footer class="statusbar">
      <span class="status-left">{{ pageLabel }}</span>
      <span class="status-right">
        <button
          type="button"
          class="status-btn"
          title="开关 Chrome DevTools"
          aria-label="Toggle Chrome DevTools"
          @click="toggleDevTools"
        >
          <Bug
            :size="13"
            stroke-width="2"
          />
        </button>
      </span>
    </footer>

    <ToastHost />
    <SheetHost />
  </div>
</template>

<style scoped>
.floating-window { width: 100%; height: 100%; overflow: hidden; background: transparent; }
.window {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--window-bg);
  color: var(--text);
}

/* The window is transparent; rounding the root makes an irregular shape. */
.window.is-custom {
  border-radius: 12px;
}
.window.is-custom.is-maximized {
  border-radius: 0;
}

.titlebar {
  position: relative;
  flex: 0 0 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Whole bar can move the window; the buttons below opt back out. */
  -webkit-app-region: drag;
  user-select: none;
  background: var(--theme-titlebar-bg);
  -webkit-backdrop-filter: blur(22px) saturate(125%);
  backdrop-filter: blur(22px) saturate(125%);
  border-bottom: 1px solid var(--hairline);
}

.window.is-macos .titlebar {
  padding-left: 76px;
  padding-right: 76px;
  background: var(--theme-titlebar-bg);
}

.title {
  max-width: 100%;
  padding: 0 100px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.traffic-lights {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 16px;
  -webkit-app-region: no-drag;
}

.tl {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.12);
  -webkit-app-region: no-drag;
}

.tl-glyph {
  display: block;
  width: 7px;
  height: 7px;
  opacity: 0;
}
.tl:hover .tl-glyph {
  opacity: 1;
}

/* Traffic light glyphs share a white stroke. */
.tl-glyph :deep(*) {
  fill: none;
  stroke: #fff;
  stroke-width: 1.5;
  stroke-linecap: round;
}

.tl.close {
  background: #ff5f57;
}
.tl.close:hover {
  background: #e44b45;
}
.tl.minimize {
  background: #febc2e;
}
.tl.minimize:hover {
  background: #e0a323;
}
.tl.zoom {
  background: #28c840;
}
.tl.zoom:hover {
  background: #21b135;
}

.shell {
  display: flex;
  flex: 1;
  min-height: 0;
}

.content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: var(--content-bg);
  -webkit-backdrop-filter: blur(22px) saturate(125%);
  backdrop-filter: blur(22px) saturate(125%);
}

/* Snappy macOS-style page transition. */
.view-enter-active,
.view-leave-active {
  transition:
    opacity 0.13s ease,
    transform 0.13s ease;
}
.view-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.view-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

/* Bottom status bar: current page on the left, DevTools toggle on the right. */
.statusbar {
  flex: 0 0 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 8px 0 12px;
  background: var(--sidebar-bg);
  border-top: 1px solid var(--hairline);
  color: var(--text-secondary);
  font-size: 11px;
  user-select: none;
}

.status-left {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.status-right {
  display: flex;
  align-items: center;
}

.status-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.status-btn:hover {
  background: var(--accent-weak);
}
.status-btn:active {
  background: var(--hairline);
}

</style>
