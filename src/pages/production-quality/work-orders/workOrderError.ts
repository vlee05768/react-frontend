export type BomShortageDetail = {
  code: string;
  type: '捲材' | '片材';
  requisitioned: number;
  required: number;
};

export type BomShortageError = {
  details: BomShortageDetail[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isAllowedText = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0 && value.length <= 120
);

export function parseBomShortageError(message: string): BomShortageError | undefined {
  const firstBrace = message.indexOf('{');
  const lastBrace = message.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return undefined;

  try {
    const parsed: unknown = JSON.parse(message.slice(firstBrace, lastBrace + 1));
    if (!isRecord(parsed) || parsed.isBOMError !== true || !Array.isArray(parsed.details)) {
      return undefined;
    }

    const details = parsed.details.flatMap((item): BomShortageDetail[] => {
      if (!isRecord(item)) return [];
      const type = item.type === '捲材' || item.type === '片材' ? item.type : undefined;
      if (!isAllowedText(item.code) || !type || !isFiniteNumber(item.requisitioned) || !isFiniteNumber(item.required)) {
        return [];
      }
      return [{
        code: item.code,
        type,
        requisitioned: item.requisitioned,
        required: item.required,
      }];
    });

    return details.length > 0 ? { details } : undefined;
  } catch {
    return undefined;
  }
}
