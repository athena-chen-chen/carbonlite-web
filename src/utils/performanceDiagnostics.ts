export function startDevTiming(label: string) {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return () => {};
  }

  const timingLabel = `CarbonLite:${label}:${Date.now()}`;
  console.time(timingLabel);

  return () => {
    console.timeEnd(timingLabel);
  };
}
