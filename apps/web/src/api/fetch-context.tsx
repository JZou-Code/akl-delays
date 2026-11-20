import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import type { Fetch } from './client.ts';

const browserFetch: Fetch = (input, init) => globalThis.fetch(input, init);

const FetchContext = createContext<Fetch>(browserFetch);

export interface FetchProviderProps {
  fetch: Fetch;
  children: ReactNode;
}

export function FetchProvider({ fetch, children }: FetchProviderProps): ReactElement {
  return <FetchContext value={fetch}>{children}</FetchContext>;
}

export function useFetch(): Fetch {
  return useContext(FetchContext);
}
