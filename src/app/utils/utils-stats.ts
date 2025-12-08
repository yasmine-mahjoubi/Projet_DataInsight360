// analysis-utils.ts

// ========== 1. STATISTIQUES DESCRIPTIVES ==========

export function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function minValue(values: number[]): number {
  return Math.min(...values);
}

export function maxValue(values: number[]): number {
  return Math.max(...values);
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function variance(values: number[]): number {
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
}

export function std(values: number[]): number {
  return Math.sqrt(variance(values));
}


// ========== 2. OUTLIERS (IQR) ==========

export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * (p / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[index];

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function detectOutliers(values: number[]) {
  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqr = q3 - q1;

  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  const outliers = values.filter(v => v < lower || v > upper);

  // Utilisation de tes fonctions existantes
  const min = minValue(values);
  const max = maxValue(values);
  const med = median(values);

  return {
    min,
    q1,
    median: med,
    q3,
    max,
    iqr,
    lower,
    upper,
    outliers
  };
}

// ========== 3. CORRÉLATION (PEARSON) ==========

export function covariance(x: number[], y: number[]): number {
  const meanX = mean(x);
  const meanY = mean(y);

  return x.reduce((sum, _, i) => sum + (x[i] - meanX) * (y[i] - meanY), 0) / x.length;
}

export function correlation(x: number[], y: number[]): number {
  return covariance(x, y) / (std(x) * std(y));
}


// ========== 4. HISTOGRAMME ==========

export function histogram(values: number[], nbBins = 10) {
  const minV = minValue(values);
  const maxV = maxValue(values);
  const binSize = (maxV - minV) / nbBins;

  const bins = Array(nbBins).fill(0);
  const labels = [];

  for (let i = 0; i < nbBins; i++) {
    const start = minV + i * binSize;
    const end = start + binSize;
    labels.push(`${start.toFixed(1)} - ${end.toFixed(1)}`);
  }

  values.forEach(v => {
    let index = Math.floor((v - minV) / binSize);
    if (index === nbBins) index--;
    bins[index]++;
  });

  return { bins, labels, min: minV, max: maxV, binSize };

}