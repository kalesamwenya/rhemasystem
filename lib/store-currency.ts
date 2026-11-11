export const storeCurrency = 'ZMW';

export function formatStoreMoney(value: number | string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new Error('A valid store amount is required.');
  }
  return `ZMW ${amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
