export function getSignalMetricBarClass(value: number): string {
  const percentage = Math.min(100, Math.max(0, value));

  if (percentage < 40) return "bg-red-500";
  if (percentage < 70) return "bg-amber-400";
  return "bg-emerald-500";
}
