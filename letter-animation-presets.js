/*
 * Reusable letter-animation presets.
 *
 * Add another named object with this shape when a new page needs the same
 * treatment, then let that page's initializer select the preset by name.
 * Asset patterns use one-based {frame} numbers and zero-based {region} numbers.
 */
window.PortfolioAnimationPresets = Object.freeze({
  mixedLetterO: Object.freeze({
    frameDurationMs: 150,
    imageScale: 1.1,
    order: 'random',
    composition: 'mixed',
    sourceCount: 4,
    regionCount: 4,
    minimumSourcesPerComposition: 2,
    baseLayer: 'o-pink.svg',
    accentLayerPattern: 'o_{frame}-accent-{region}.svg',
    interaction: Object.freeze({
      toggleOnDesktopHover: true,
      toggleOnTouchOrKeyboard: true,
      pauseWhenOffscreen: true,
      pauseWhenDocumentHidden: true,
      respectReducedMotion: true,
    }),
  }),
});
