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
