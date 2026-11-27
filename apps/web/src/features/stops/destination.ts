// AT writes a trip as "Botany To Britomart Via Panmure". A rider at a stop wants where it goes.
export function destination(headsign: string | null): string {
  if (headsign === null) return 'Unknown';
  const to = headsign.toLowerCase().lastIndexOf(' to ');
  return to === -1 ? headsign : headsign.slice(to + 4);
}
