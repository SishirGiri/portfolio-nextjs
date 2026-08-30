// ════════════════════════════════════════════════════════
// QUALITY — graphics presets. Low → Ultra scales pixel
// ratio, shadows, draw distance, streaming radius, traffic
// density and rain; Ultra adds 2560px shadows + bloom.
// ════════════════════════════════════════════════════════

export const QUALITY_PRESETS = {
  low: {
    label: 'Low', pixelRatio: 1, shadows: false, shadowSize: 1024,
    traffic: 0.55, peds: 0.4, rainCount: 500, bloom: false,
    fogFar: 240, drawCars: 240, chunkRadius: 150,
  },
  medium: {
    label: 'Medium', pixelRatio: 1.5, shadows: true, shadowSize: 1536,
    traffic: 0.8, peds: 0.75, rainCount: 1100, bloom: false,
    fogFar: 330, drawCars: 330, chunkRadius: 210,
  },
  high: {
    label: 'High', pixelRatio: 2, shadows: true, shadowSize: 2048,
    traffic: 1.0, peds: 1.0, rainCount: 1800, bloom: true,
    fogFar: 430, drawCars: 430, chunkRadius: 290,
  },
  ultra: {
    label: 'Ultra', pixelRatio: 2, shadows: true, shadowSize: 2560,
    traffic: 1.2, peds: 1.2, rainCount: 2400, bloom: true,
    fogFar: 500, drawCars: 520, chunkRadius: 360,
  },
};
