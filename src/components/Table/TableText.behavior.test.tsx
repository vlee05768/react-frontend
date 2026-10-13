import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Link } from 'react-router-dom';
import { renderTableText } from './tableText';
import { TableText } from './TableTextContent';
import { EllipsisText } from './EllipsisText';

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('TableText 公開介面', () => {
  it('短文字預設不顯示提示、不增加 tab stop；零不是空值', async () => {
    const { container } = render(<TableText value={0} emptyText="無資料" />);
    const preview = container.querySelector('[data-table-text]')!;
    expect(preview.textContent).toBe('0');
    expect(preview).not.toHaveAttribute('tabindex');
    fireEvent.mouseEnter(preview);
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('單行隱藏換行能用鍵盤提示，提示保存格式化後完整文字', async () => {
    const { container } = render(<TableText value={12} format={() => '金額\r\n12 元'} renderContent={text => <strong>{text}</strong>} />);
    const preview = container.querySelector('[data-table-text]')!;
    expect(preview.textContent).toBe('金額 12 元');
    expect(preview).toHaveAttribute('tabindex', '0');
    fireEvent.focus(preview);
    expect((await screen.findByRole('tooltip')).textContent).toBe('金額\r\n12 元');
  });

  it.each(['overflow', 'always', 'never'] as const)('自訂提示依 %s 模式，不因提供提示就強制顯示', async mode => {
    const { container } = render(<TableText value="短文" tooltipContent={<strong>額外說明</strong>} tooltipMode={mode} />);
    fireEvent.mouseEnter(container.querySelector('[data-table-text]')!);
    if (mode === 'always') expect((await screen.findByRole('tooltip')).textContent).toBe('額外說明');
    else {
      await new Promise(resolve => setTimeout(resolve, 400));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    }
  });

  it('量測實際寬高溢出，ResizeObserver／resize／內容變更重測並清理', () => {
    let width = 80;
    let height = 48;
    const active = new Map<MockResizeObserver, ResizeObserverCallback>();
    const instances: MockResizeObserver[] = [];
    class MockResizeObserver {
      readonly callback: ResizeObserverCallback;
      readonly notify = vi.fn(() => {
        active.get(this)?.([], this as unknown as ResizeObserver);
      });
      readonly observe = vi.fn(() => active.set(this, this.callback));
      readonly disconnect = vi.fn(() => active.delete(this));
      constructor(callback: ResizeObserverCallback) {
        this.callback = vi.fn(callback);
        instances.push(this);
      }
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const notifyActive = () => act(() => active.forEach((_, observer) => observer.notify()));
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => width);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(48);
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => height);
    const { container, rerender, unmount } = render(<TableText value={'第一行\n第二行'} renderContent={text => <strong>{text}</strong>} maxLines={2} maxWidth={100} align="right" />);
    const preview = () => container.querySelector('[data-table-text]')!;
    expect(preview().textContent).toBe('第一行\n第二行');
    expect(preview()).not.toHaveAttribute('tabindex');
    expect(preview()).toHaveStyle({ WebkitLineClamp: '2', maxWidth: '100px', textAlign: 'right' });
    width = 200;
    notifyActive();
    expect(preview()).toHaveAttribute('tabindex', '0');
    width = 80;
    fireEvent(window, new Event('resize'));
    expect(preview()).not.toHaveAttribute('tabindex');
    height = 72;
    rerender(<TableText value={'三行\n第二行\n第三行'} maxLines={2} />);
    expect(preview()).toHaveAttribute('tabindex', '0');
    // JSX 內容在量測 state 更新時重新建立，但不能重建 observer/listener。
    expect(instances).toHaveLength(1);
    expect(active.size).toBe(1);
    height = 48;
    rerender(<TableText value="相同文字" renderContent={text => <a href="/target">{text}</a>} tooltipMode="always" />);
    expect(preview()).not.toHaveAttribute('tabindex');
    rerender(<TableText value="相同文字" renderContent={text => <strong>{text}</strong>} tooltipMode="always" maxLines={3} maxWidth={200} align="center" />);
    expect(preview()).toHaveAttribute('tabindex', '0');
    expect(preview()).toHaveStyle({ WebkitLineClamp: '3', maxWidth: '200px', textAlign: 'center' });
    rerender(<TableText value="相同文字" maxLines={3} maxWidth={200} />);
    expect(preview()).not.toHaveAttribute('tabindex');
    height = 72;
    rerender(<TableText value="相同文字" maxLines={2} maxWidth={100} />);
    expect(preview()).toHaveAttribute('tabindex', '0');
    expect(instances).toHaveLength(1);
    const resizeListeners = add.mock.calls.filter(([type]) => type === 'resize');
    expect(resizeListeners).toHaveLength(1);
    unmount();
    expect(active.size).toBe(0);
    const next = render(<TableText value="重新掛載" />);
    expect(instances).toHaveLength(2);
    expect(active.size).toBe(1);
    vi.mocked(instances[0].callback).mockClear();
    act(() => instances[0].notify());
    expect(instances[0].callback).not.toHaveBeenCalled();
    next.unmount();
    expect(active.size).toBe(0);
    for (const observer of instances) {
      expect(observer.disconnect).toHaveBeenCalledOnce();
      vi.mocked(observer.callback).mockClear();
      observer.notify();
      expect(observer.callback).not.toHaveBeenCalled();
    }
    for (const [, listener] of add.mock.calls.filter(([type]) => type === 'resize')) {
      expect(remove).toHaveBeenCalledWith('resize', listener);
    }
  });

  it('空值顯示 emptyText，不對空值呼叫 format；never 也抑制換行提示', () => {
    const format = vi.fn();
    const { container } = render(<TableText value={null} emptyText={'無資料\n請補齊'} format={format} tooltipMode="never" />);
    expect(container.textContent).toBe('無資料 請補齊');
    expect(format).not.toHaveBeenCalled();
    expect(container.querySelector('[data-table-text]')).not.toHaveAttribute('tabindex');
  });

  it.each([true, false, undefined])('EllipsisText 相容 showHint=%s，省略不強制短文字提示', async showHint => {
    const { container } = render(<EllipsisText text="短文字" showHint={showHint} />);
    const preview = container.querySelector('[data-table-text]')!;
    fireEvent.mouseEnter(preview);
    if (showHint === true) expect((await screen.findByRole('tooltip')).textContent).toBe('短文字');
    else {
      await new Promise(resolve => setTimeout(resolve, 400));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    }
  });

  it('已知 Link 原 ref／事件保留，提示只有文字，且不增加重複 tab stop', async () => {
    const ref = React.createRef<HTMLAnchorElement>();
    const onClick = vi.fn(event => event.preventDefault());
    const { container } = render(<MemoryRouter>{renderTableText(<Link ref={ref} to="/target" onClick={onClick}>{'名稱\n第二行'}</Link>)}</MemoryRouter>);
    const link = screen.getByRole('link');
    expect(ref.current).toBe(link);
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-table-text]')).not.toHaveAttribute('tabindex');
    fireEvent.focus(link);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toBe('名稱\n第二行');
    expect(tooltip.querySelector('a')).toBeNull();
  });
});