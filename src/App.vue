<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Sidebar from './components/Sidebar.vue';

const appName = 'wttch-hub';

// Custom chrome is drawn only on Windows (see src/main.ts); on macOS/Linux the
// OS provides the native frame and its own window controls, so we render a
// plain page underneath.
const controls = window.windowControls;
const customChrome = controls?.platform === 'win32';

const isMaximized = ref(false);
let unsubscribe: (() => void) | undefined;

onMounted(() => {
  // Keep the zoom glyph and rounded corners in sync with the real window state.
  unsubscribe = controls?.onMaximizedChange((maximized) => {
    isMaximized.value = maximized;
  });
});

onBeforeUnmount(() => {
  unsubscribe?.();
});

const minimize = () => controls?.minimize();
const toggleMaximize = () => controls?.toggleMaximize();
const close = () => controls?.close();
</script>

<template>
  <div
    class="window"
    :class="{ 'is-custom': customChrome, 'is-maximized': isMaximized }"
  >
    <!-- macOS-style title bar, only drawn when there is no native frame -->
    <header
      v-if="customChrome"
      class="titlebar"
    >
      <div class="traffic-lights">
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
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
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
  background: rgba(0, 0, 0, 0.035);
  border-bottom: 1px solid var(--hairline);
}

.title {
  max-width: 100%;
  padding: 0 100px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.55);
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
</style>
