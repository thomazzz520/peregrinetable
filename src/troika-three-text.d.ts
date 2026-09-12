/**
 * troika-three-text ships no types. Only preloadFont is imported directly
 * (drei owns the rest), so this declares that and nothing more.
 */
declare module "troika-three-text" {
  /**
   * Loads and parses a font ahead of first use, then invokes `callback`.
   *
   * There is deliberately no error channel: on a font it cannot parse —
   * woff2, notably — troika throws inside its worker and the callback is
   * simply never called. Anything awaiting it waits for ever. Race it
   * against a timeout.
   */
  export function preloadFont(
    options: { font?: string; characters?: string | string[]; sdfGlyphSize?: number },
    callback: () => void,
  ): void;
}
