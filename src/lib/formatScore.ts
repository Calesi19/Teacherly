export function formatScore(value: number): string {
  const floored = Math.floor((value + Number.EPSILON) * 10) / 10;
  return Number.isInteger(floored) ? String(floored) : floored.toFixed(1);
}

export function formatScorePercentage(score: number, maxScore: number): string {
  if (maxScore <= 0) return "0.0";
  return formatScore((score / maxScore) * 100);
}
