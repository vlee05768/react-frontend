import { expect, it } from 'vitest';
import { isProductionPostingPaused } from './productionPostingPolicy';

it('Production 完成過帳預設為開放', () => {
  expect(isProductionPostingPaused()).toBe(false);
});
