export function isFirefox(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox');
}

// Firefox's WebGL/compositor path is measurably slower than Chromium's for
// heavy multi-pass postprocessing, so give it a lower pixel ratio ceiling.
export function maxPixelRatio(cap = 2): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio, isFirefox() ? Math.min(cap, 1.5) : cap);
}
