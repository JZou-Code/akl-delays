import { DELAY_STATUSES, MODES, type Summary } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { modeLabel, StatusBadge } from '../../components/index.ts';

export function SummaryCounts({ modes }: { modes: Summary['modes'] }): ReactElement {
  return (
    <table className="counts">
      <caption>Services by status and mode</caption>
      <thead>
        <tr>
          <th scope="col">Status</th>
          {MODES.map((mode) => (
            <th scope="col" key={mode}>
              {modeLabel(mode)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DELAY_STATUSES.map((status) => (
          <tr key={status}>
            <th scope="row">
              <StatusBadge status={status} />
            </th>
            {MODES.map((mode) => (
              <td key={mode}>{modes[mode][status]}</td>
            ))}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">All</th>
          {MODES.map((mode) => (
            <td key={mode}>{modes[mode].total}</td>
          ))}
        </tr>
      </tfoot>
    </table>
  );
}
