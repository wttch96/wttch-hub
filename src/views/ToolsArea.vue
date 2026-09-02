<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronLeft } from 'lucide-vue-next';

// ToolsArea is the nested layout under /tools. At /tools it simply hosts the
// tool-library page; on /tools/<tool> it shows a slim bar with a way back to
// the library and hosts the embedded tool beneath it.
const route = useRoute();
const router = useRouter();

const isTool = computed(() => route.meta.tool === true);
// Whole-page-scroll tools (e.g. radixconv) keep a scrollable body; self-scroll
// tools (paned editors) fill the area exactly and manage their own overflow.
const flow = computed(() => route.meta.flow === true);
const toolTitle = computed(() => (route.meta.title as string | undefined) ?? '');
</script>

<template>
  <div
    class="tools-area"
    :class="{ tool: isTool }"
  >
    <header
      v-if="isTool"
      class="tool-bar"
    >
      <button
        type="button"
        class="tool-back"
        title="返回小工具库"
        @click="router.push('/tools')"
      >
        <ChevronLeft
          :size="15"
          :stroke-width="2.2"
        />
        <span>小工具库</span>
      </button>
      <span class="tool-title">{{ toolTitle }}</span>
    </header>

    <div
      class="tool-body"
      :class="{ embedded: isTool, flow }"
    >
      <RouterView v-slot="{ Component }">
        <Transition
          name="view"
          mode="out-in"
        >
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>
  </div>
</template>

<style scoped>
.tools-area {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--content-bg);
}

/* Slim macOS-style bar shown above an embedded tool. */
.tool-bar {
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  border-bottom: 1px solid var(--hairline);
  background: rgba(0, 0, 0, 0.02);
  user-select: none;
}

.tool-back {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px 3px 5px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.tool-back:hover {
  background: rgba(0, 0, 0, 0.05);
}

.tool-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* Embedded (paned) tools: give them exactly the available area and let them
   scroll internally, so there is no double scrollbar. Their own scoped rules
   can't beat this specificity, so e.g. folderart's height:100vh is overridden. */
.tool-body.embedded:not(.flow) {
  display: flex;
  overflow: hidden;
}

.tool-body.embedded:not(.flow) > * {
  flex: 1;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

/* Whole-page-scroll tools still get the .embedded chrome (back bar) but keep
   a normal flowing child that can grow taller than the viewport. */
.tool-body.embedded.flow > * {
  min-height: 100%;
}

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
