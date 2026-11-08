// 僅接受能以 JSON number 無損往返的 decimal(18,4)。
export function parseProductionQuantity(value: string, unit: string | null | undefined): number | null {
  if (!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/.test(value)) return null;
  const scaled = (text: string) => {
    const [whole, fraction = ''] = text.split('.');
    return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'));
  };
  const number = Number(value);
  const serialized = String(number);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(serialized) || scaled(value) !== scaled(serialized)) return null;
  if (unit === 'PCS' && !Number.isInteger(number)) return null;
  return number;
}
