import type { ServiceDelay } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { LoadNotice } from '../../components/index.ts';
import type { Polling } from '../../hooks/index.ts';
import { ServiceTable } from './ServiceTable.tsx';

export function BoardSection({ delays }: { delays: Polling<ServiceDelay[]> }): ReactElement {
  const { data } = delays;
  return (
    <section className="board">
      <h2>Services</h2>
      {data === undefined && <LoadNotice loading={delays.loading} error={delays.error} />}
      {data?.length === 0 && <p className="notice">The feed has no services right now.</p>}
      {data !== undefined && data.length > 0 && <ServiceTable services={data} />}
    </section>
  );
}
