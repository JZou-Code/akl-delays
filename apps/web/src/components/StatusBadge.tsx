import type { DelayStatus } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { statusLabel } from './format.ts';

export function StatusBadge({ status }: { status: DelayStatus }): ReactElement {
  return (
    <span className="status" data-status={status}>
      {statusLabel(status)}
    </span>
  );
}
