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
