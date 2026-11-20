import { DELAY_STATUSES, MODES } from '@akl-delays/shared';
import { useId, type ReactElement } from 'react';
import { modeLabel, statusLabel } from '../../components/index.ts';
import type { Filters } from './filters.ts';
import type { SetFilter } from './useFilters.ts';

export interface FilterFormProps {
  filters: Filters;
  onChange: SetFilter;
}

export function FilterForm({ filters, onChange }: FilterFormProps): ReactElement {
  const modeId = useId();
  const statusId = useId();
  return (
    <form
      className="filters"
      aria-label="Filter the services"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div>
        <label htmlFor={modeId}>Mode</label>
        <select
          id={modeId}
          name="mode"
          value={filters.mode ?? ''}
          onChange={(event) => {
            onChange('mode', event.target.value);
          }}
        >
          <option value="">All modes</option>
          {MODES.map((mode) => (
            <option key={mode} value={mode}>
              {modeLabel(mode)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={statusId}>Status</label>
        <select
          id={statusId}
          name="status"
          value={filters.status ?? ''}
          onChange={(event) => {
            onChange('status', event.target.value);
          }}
        >
          <option value="">All statuses</option>
          {DELAY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
