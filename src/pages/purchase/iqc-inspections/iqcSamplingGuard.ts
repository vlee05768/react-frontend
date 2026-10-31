type Sample = { isOk?: boolean | null; inspectionItems?: { isOk?: boolean | null }[] };

export function hasSamplingDefect(samples: readonly Sample[] | null | undefined): boolean {
  return samples?.some(sample => sample.isOk === false || sample.inspectionItems?.some(item => item.isOk === false)) ?? false;
}

export function blocksSamplingReduction(saved: readonly Sample[] | null | undefined, current: readonly Sample[], previousCount: number, nextCount: number): boolean {
  return nextCount < previousCount && (hasSamplingDefect(saved) || hasSamplingDefect(current));
}

/** Only samples created in this editing session and unchanged may be discarded. */
export function markNewBlankSample<T extends object>(sample: T): T & { _blankSnapshot: string } {
  return { ...sample, _blankSnapshot: JSON.stringify(sample) };
}

export function updateSampleGroupLot<T extends { supplierLotNo?: string }>(sample: T, supplierLotNo: string): T {
  if (canRemoveBlankSamples([sample])) {
    const { _blankSnapshot, ...rest } = sample as T & { _blankSnapshot: string };
    return markNewBlankSample({ ...rest, supplierLotNo }) as unknown as T;
  }
  return { ...sample, supplierLotNo };
}

export function canRemoveBlankSamples(samples: readonly any[]): boolean {
  return samples.every(({ _blankSnapshot, ...sample }) =>
    typeof _blankSnapshot === 'string' && !sample.sampleId && JSON.stringify(sample) === _blankSnapshot);
}
