<script setup lang="ts">
import { RouterLink } from 'vue-router';
import {
  Binary,
  Braces,
  ChevronRight,
  FolderOpen,
  Network,
  Sparkles,
} from 'lucide-vue-next';
import type { Component } from 'vue';

interface ToolCard {
  to: string;
  name: string;
  icon: Component;
  desc: string;
  tags: string[];
  /** [icon color, tile background tint