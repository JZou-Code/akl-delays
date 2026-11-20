import type { Mode, ModeSummary, ServiceDelay } from '@akl-delays/shared';

function emptyModeSummary(): ModeSummary {
  return { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };
}

export function summariseModes(services: readonly ServiceDelay[]): Record<Mode, ModeSummary> {
  const modes: Record<Mode, ModeSummary> = {
    bus: emptyModeSummary(),
    train: emptyModeSummary(),
    ferry: emptyModeSummary(),
  };
  for (const service of services) {
    if (service.mode === null) continue;
    const summary = modes[service.mode];
    summary[service.status] += 1;
    summary.total += 1;
  }
  return modes;
}
