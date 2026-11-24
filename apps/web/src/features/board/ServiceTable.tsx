import type { ServiceDelay, SortKey } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { formatDelay, modeLabel, StatusBadge } from '../../components/index.ts';
import { routePath } from '../route/index.ts';
import type { Sort } from './sort.ts';
import type { SortBy } from './useSort.ts';

const COLUMNS: readonly { key: SortKey; label: string }[] = [
  { key: 'route', label: 'Route' },
  { key: 'mode', label: 'Mode' },
  { key: 'status', label: 'Status' },
  { key: 'delay', label: 'Delay' },
  { key: 'stop', label: 'Stop' },
];

export interface ServiceTableProps {
  services: readonly ServiceDelay[];
  sort: Sort;
  onSort: SortBy;
}

function ariaSort(sort: Sort, key: SortKey): 'ascending' | 'descending' | undefined {
  if (sort.key !== key) return undefined;
  return sort.order === 'asc' ? 'ascending' : 'descending';
}

export function ServiceTable({ services, sort, onSort }: ServiceTableProps): ReactElement {
  return (
    <table className="services">
      <caption className="visually-hidden">Services</caption>
      <thead>
        <tr>
          {COLUMNS.map(({ key, label }) => (
            <th key={key} scope="col" aria-sort={ariaSort(sort, key)}>
              <button
                type="button"
                onClick={() => {
                  onSort(key);
                }}
              >
                {label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {services.map((service) => (
          <tr key={service.tripId}>
            <th scope="row">
              <Link to={routePath(service.routeId)}>{service.routeName ?? service.routeId}</Link>
            </th>
            <td>{modeLabel(service.mode)}</td>
            <td>
              <StatusBadge status={service.status} />
            </td>
            <td className="delay">{formatDelay(service.delaySeconds, service.status)}</td>
            <td className="stop">{service.stopName ?? service.stopId ?? 'Unknown'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
