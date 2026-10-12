/*
 * Reusable letter-animation presets.
 *
 * Add another named object with this shape when a new page needs the same
 * treatment, then let that page's initializer select the preset by name.
 * Asset patterns use one-based {frame} numbers and zero-based {region} numbers.
 */
window.PortfolioAnimationPresets = Object.freeze({
  mixedLetterL: Object.freeze({
    frameDurationMs: 230,
    imageScale: 1.1,
    order: 'random',
    composition: 'mixed',
    sourceCount: 4,
    regionCount: 3,
    minimumSourcesPerComposition: 2,
    baseLayers: ['l_1-base.svg', 'l_2-base.svg', 'l_3-base.svg', 'l_4-base.svg'],
    accentLayerPattern: 'l_{frame}-accent-{region}.svg',
    interaction: Object.freeze({
      pauseOnDesktopHover: false,
      pauseOnPress: true,
      pauseWhenOffscreen: true,
      pauseWhenDocumentHidden: true,
      respectReducedMotion: true,
    }),
  }),
  mixedLetterO: Object.freeze({
    frameDurationMs: 230,
    imageScale: 1.1,
    order: 'random',
    composition: 'mixed',
    sourceCount: 4,
    regionCount: 4,
    minimumSourcesPerComposition: 2,
    baseLayers: ['o-pink.svg', 'o_2-pink.svg', 'o_3-pink.svg', 'o_4-pink.svg'],
    accentLayerPattern: 'o_{frame}-accent-{region}.svg',
    interaction: Object.freeze({
      pauseOnDesktopHover: false,
      pauseOnPress: true,
      pauseWhenOffscreen: true,
      pauseWhenDocumentHidden: true,
      respectReducedMotion: true,
    }),
  }),
  mixedLetterH: Object.freeze({
    frameDurationMs: 230,
    imageScale: 1.1,
    order: 'random',
    composition: 'mixed',
    sourceCount: 4,
    regionCount: 4,
    minimumSourcesPerComposition: 2,
    baseLayers: ['h_1-base.svg', 'h_2-base.svg', 'h_3-base.svg', 'h_4-base.svg'],
    accentLayerPattern: 'h_{frame}-accent-{region}.svg',
    interaction: Object.freeze({
      pauseOnDesktopHover: false,
      pauseOnPress: true,
      pauseWhenOffscreen: true,
      pauseWhenDocumentHidden: true,
      respectReducedMotion: true,
    }),
  }),
});
