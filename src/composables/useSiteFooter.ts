/**
 * 文件说明：兼容原 wttch-labs 工具的页脚注册接口；工作台不显示站点页脚，因此返回无副作用的清理函数。
 */

// wttch-labs tools register their own per-page "site footer" section through
// this composable. wttch-hub has no such site footer, so the composable is a
// harmless no-op stub: registering a page keeps its exact call signature (and
// returns an unregister callback for onUnmounted) without mounting anything.
export interface SiteFooterLink {
  text: string;
  href: string;
}

export interface SiteFooterOptions {
  title?: string;
  links?: SiteFooterLink[];
  text?: string;
}

export function useSiteFooter(_options?: SiteFooterOptions): () => void {
  return () => {};
}
