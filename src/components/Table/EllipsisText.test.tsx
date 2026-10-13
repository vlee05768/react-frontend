/// <reference types="node" />
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EllipsisText } from './EllipsisText';
import { readFileSync } from 'node:fs';

const tableTextStyles = readFileSync('src/components/Table/tableText.css', 'utf8');
const getComputedStyle = window.getComputedStyle.bind(window);

beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getComputedStyle(element));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  // jsdom 不載入 Vite 的 CSS 模組；套用正式樣式以驗證實際呈現契約。
  const stylesheet = document.createElement('style');
  stylesheet.dataset.tableTextTest = '';
  stylesheet.textContent = tableTextStyles;
  document.head.appendChild(stylesheet);
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  document.head.querySelector('[data-table-text-test]')?.remove();
});

describe('表格文字預覽', () => {
  it('預設單行省略並以完整換行內容提示', async () => {
    const text = '很長的表格內容'.repeat(20) + '\r\n第二行\n第三行\r第四行';
    const { container } = render(<EllipsisText text={text} maxWidth={100} />);
    const preview = container.querySelector('[data-table-text]')!;
    expect(preview).toHaveStyle({ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', lineHeight: '24px' });
    expect(preview).toHaveStyle({ maxWidth: '100px' });
    expect(preview.textContent).toBe(text.replace(/\r\n|\r|\n/g, ' '));
    fireEvent.mouseEnter(preview);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toBe(text);
    expect(tooltip.firstElementChild).toHaveStyle({ whiteSpace: 'pre-wrap' });
  });

  it('動態寬度與明確多行保留行數及原始換行', () => {
    const { container } = render(<EllipsisText text={'第一行\n第二行'} maxWidth="12rem" maxLines={2} showHint={false} />);
    const preview = container.querySelector<HTMLSpanElement>('[data-table-text]')!;
    expect(preview.style.maxWidth).toBe('12rem');
    expect(preview.style.getPropertyValue('-webkit-line-clamp')).toBe('2');
    expect(getComputedStyle(preview).lineHeight).toBe('24px');
    expect(getComputedStyle(preview).whiteSpace).toBe('pre-wrap');
    expect(getComputedStyle(preview).wordBreak).toBe('break-word');
    expect(getComputedStyle(preview).display).toBe('-webkit-box');
    expect(preview.textContent).toBe('第一行\n第二行');
  });
});
