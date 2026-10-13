/// <reference types="node" />
import { Button, Tag } from 'antd';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Link } from 'react-router-dom';
import Table from './ErpTable';
import StandardErpTable from './StandardErpTable';
import { normalizeTableColumns } from './tableText';
import { EllipsisText } from './EllipsisText';
import { readFileSync } from 'node:fs';
import { buildTableColumns, generateTableColumns } from '@/utils/tableUtils';

const getComputedStyle = window.getComputedStyle.bind(window);
const tableTextStyles = readFileSync('src/components/Table/tableText.css', 'utf8');
beforeEach(() => {
  const stylesheet = document.createElement('style');
  stylesheet.dataset.tableTextTest = '';
  stylesheet.textContent = tableTextStyles;
  document.head.appendChild(stylesheet);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getComputedStyle(element));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  document.head.querySelector('[data-table-text-test]')?.remove();
});

describe('實際表格文字與操作', () => {
  it.each(['新設定', '舊設定'])('%s 一般文字有完整提示且明確多行例外仍保留換行', async kind => {
    const columns = kind === '新設定'
      ? buildTableColumns([{ name: 'name', label: '名稱', width: 120 }, { name: 'notes', label: '多行', width: 120, maxLines: 2 }])
      : generateTableColumns([{ name: 'name', label: '名稱', componentType: 'Input', table: { name: 'name', label: '名稱', width: 120 } }, { name: 'notes', label: '多行', componentType: 'TextArea', table: { name: 'notes', label: '多行', width: 120, maxLines: 2 } }]);
    const { container } = render(<StandardErpTable rowKey="id" pagination={false} columns={columns} dataSource={[{ id: 1, name: '內容\r\n第二行', notes: '備註\n第二行' }]} />);
    const previews = container.querySelectorAll('tbody tr[data-row-key] [data-table-text]');
    expect(previews[1]).toHaveStyle({ whiteSpace: 'pre-wrap', WebkitLineClamp: '2' });
    expect(previews[1].textContent).toBe('備註\n第二行');
    fireEvent.mouseEnter(previews[0]);
    expect((await screen.findByRole('tooltip')).textContent).toBe('內容\r\n第二行');
  });

  it('純文字 renderer 單行省略但按鈕/Tag 不被裁切或複製至提示', () => {
    const onClick = vi.fn();
    const { container } = render(<StandardErpTable rowKey="id" pagination={false}
      columns={[{ title: '名稱', dataIndex: 'name', render: () => '格式化\n文字' }, { title: '操作', render: () => <div style={{ display: 'inline-flex', height: 24 }}><Tag>標籤</Tag><Button size="small" onClick={onClick}>執行</Button></div> }]}
      dataSource={[{ id: 1, name: '原始' }]} />);
    expect(container.querySelector('tbody tr[data-row-key] [data-table-text]')?.textContent).toBe('格式化 文字');
    fireEvent.click(screen.getByRole('button', { name: /執\s*行/ }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /執\s*行/ }).closest('[data-table-text]')).toBeNull();
    expect(screen.getByText('標籤').closest('[data-table-text]')).toBeNull();
  });

  it.each(['多 Link', '多 a', '混合 Link/a', 'Link 與互動 span'])('%s 操作容器不被文字裁切，onCell 與連結事件保留', kind => {
    const onClick = vi.fn(event => event.preventDefault());
    const onCellClick = vi.fn();
    const first = kind === '多 a'
      ? <a href="/first" onClick={onClick}>第一個</a>
      : <Link to="/first" onClick={onClick}>第一個</Link>;
    const second = kind === '多 Link'
      ? <Link to="/second" onClick={onClick}>第二個</Link>
      : kind === 'Link 與互動 span'
        ? <span role="button" tabIndex={0} onClick={onClick}>第二個</span>
        : <a href="/second" onClick={onClick}>第二個</a>;
    const onCell = vi.fn(() => ({ onClick: onCellClick, colSpan: 2, 'data-operation-cell': kind }));
    const { container } = render(<MemoryRouter><Table rowKey="id" pagination={false}
      columns={[{ title: '操作', onCell, render: () => <div>{first}<span> / </span>{second}</div> }]}
      dataSource={[{ id: 1 }]} /></MemoryRouter>);
    const cell = container.querySelector('tbody td')!;
    expect(cell.querySelector('[data-table-text]')).toBeNull();
    expect(cell).toHaveAttribute('colspan', '2');
    expect(cell).toHaveAttribute('data-operation-cell', kind);
    expect(onCell).toHaveBeenCalledWith({ id: 1 }, 0);
    fireEvent.click(screen.getByText('第一個'));
    fireEvent.click(screen.getByText('第二個'));
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onCellClick).toHaveBeenCalledTimes(2);
    expect(screen.getByText('第一個')).toHaveAttribute('href', '/first');
    if (kind !== 'Link 與互動 span') expect(screen.getByText('第二個')).toHaveAttribute('href', '/second');
  });

  it('已知純文字 span/Link 保留樣式、24px 結構與點擊，提示保留換行', async () => {
    const onClick = vi.fn(event => event.preventDefault());
    const { container } = render(<MemoryRouter><Table rowKey="id" pagination={false}
      columns={[{ title: '名稱', dataIndex: 'name', width: 100, render: (v: string) => <span className="font-mono" style={{ lineHeight: '24px' }}>{v}</span> }, { title: '連結', width: 100, render: () => <Link to="/target" onClick={onClick}>{'商品\r\n名稱'}</Link> }]}
      dataSource={[{ id: 1, name: '原始\n內容' }]} /></MemoryRouter>);
    const cells = container.querySelectorAll('tbody tr[data-row-key] [data-table-text]');
    expect(cells).toHaveLength(2);
    expect(cells[0].querySelector('.font-mono')).toBeInTheDocument();
    expect(cells[0]).toHaveStyle({ lineHeight: '24px', whiteSpace: 'nowrap' });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/target');
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
    fireEvent.mouseEnter(link);
    expect((await screen.findByRole('tooltip')).textContent).toBe('商品\r\n名稱');
  });

  it('明確多行元件、ellipsis:false 與未知 custom renderer 不被覆蓋', () => {
    function Custom() { return <div style={{ whiteSpace: 'pre-wrap' }}>自訂{'\n'}兩行</div>; }
    const { container } = render(<Table rowKey="id" pagination={false} columns={[
      { title: '例外', dataIndex: 'notes', ellipsis: false },
      { title: '特設行數', render: () => <EllipsisText text={'第一行\n第二行'} maxLines={2} /> },
      { title: '自訂', render: () => <Custom /> },
    ]} dataSource={[{ id: 1, notes: '原樣\n保留' }]} />);
    const row = container.querySelector('tr[data-row-key]')!;
    expect(row.querySelectorAll('[data-table-text]')).toHaveLength(1);
    expect(row.querySelector('[data-table-text]')).toHaveStyle({ whiteSpace: 'pre-wrap', WebkitLineClamp: '2' });
    expect(screen.getByText(/自訂\s*兩行/)).toHaveStyle({ whiteSpace: 'pre-wrap' });
    expect(row.querySelector('td')?.textContent).toBe('原樣\n保留');
  });

  it('JSX ColumnGroup/Column 與 Summary 維持表格契約', () => {
    const { container } = render(<Table rowKey="id" pagination={false} dataSource={[{ id: 1, name: '名稱\n第二行' }]} summary={() => <Table.Summary><Table.Summary.Row><Table.Summary.Cell index={0}>合計</Table.Summary.Cell></Table.Summary.Row></Table.Summary>}>
      <Table.ColumnGroup title="群組"><Table.Column title="名稱" dataIndex="name" width={120} /></Table.ColumnGroup>
    </Table>);
    expect(container.querySelector('tr[data-row-key] [data-table-text]')?.textContent).toBe('名稱 第二行');
    expect(screen.getByText('合計')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '群組' })).toBeInTheDocument();
  });

  it('舊式 RenderedCell 保留儲存格屬性且只格式化 children', () => {
    const columns = normalizeTableColumns<object>([{ title: '合併', dataIndex: 'name', render: () => ({ children: '完整\n內容', props: { colSpan: 2 } }) }]);
    const column = columns[0];
    if (!('render' in column) || !column.render) throw new Error('缺少 renderer');
    const cell = column.render('value', {}, 0);
    expect(cell).toMatchObject({ props: { colSpan: 2 } });
    if (!cell || typeof cell !== 'object' || !('children' in cell)) throw new Error('缺少 RenderedCell children');
    const { container } = render(<>{cell.children}</>);
    expect(container.querySelector('[data-table-text]')?.textContent).toBe('完整 內容');
  });

  it('短欄頭的完整 hint 保留單位與換行', async () => {
    const columns = buildTableColumns<{ id: number; length: number }>([{ name: 'length', label: '每卷／片長', width: 140, headerHint: '卷料：每卷長度(m)\n片料：片料長度(mm)' }]);
    const { container } = render(<Table rowKey="id" pagination={false} columns={columns} dataSource={[{ id: 1, length: 100 }]} />);
    const header = container.querySelector('thead [data-table-text]')!;
    expect(header).toHaveStyle({ whiteSpace: 'nowrap', textOverflow: 'ellipsis' });
    fireEvent.mouseEnter(header);
    expect((await screen.findByRole('tooltip')).textContent).toBe('卷料：每卷長度(m)\n片料：片料長度(mm)');
  });

  it('純文字 ReactNode 欄頭也有單行省略與完整提示', async () => {
    const { container } = render(<Table rowKey="id" pagination={false} columns={[{ title: <span className="font-semibold">{'很長欄名\n第二行'}</span>, dataIndex: 'name', width: 120 }]} dataSource={[]} />);
    const header = container.querySelector('thead [data-table-text]')!;
    expect(header).toHaveStyle({ whiteSpace: 'nowrap', textOverflow: 'ellipsis' });
    expect(header.querySelector('.font-semibold')).toBeInTheDocument();
    fireEvent.mouseEnter(header);
    expect((await screen.findByRole('tooltip')).textContent).toBe('很長欄名\n第二行');
  });

  it('排序欄的完整名稱與既有多欄排序說明合併提示', async () => {
    const columns = buildTableColumns([{ name: 'name', label: '名稱', width: 120, sortable: true, showHint: true }]);
    const { container } = render(<Table rowKey="id" pagination={false} columns={columns} dataSource={[]} />);
    const header = container.querySelector('thead [data-table-text]')!;
    fireEvent.mouseEnter(header);
    expect((await screen.findByRole('tooltip')).textContent).toBe('名稱\n點擊可排序，按住 Shift 鍵可啟用多欄位排序');
  });

  it('原生欄位預設單行省略，欄頭提示與排序/篩選仍可操作', async () => {
    const onChange = vi.fn();
    const text = '長文字'.repeat(50) + '\r\n完整第二行';
    const { container } = render(<StandardErpTable rowKey="id" pagination={false} onChange={onChange}
      columns={[{ title: '短欄名', dataIndex: 'name', width: 130, sorter: true, filters: [{ text: '第一筆', value: 'one' }] }]}
      dataSource={[{ id: 1, name: text }]} />);
    const preview = container.querySelector('tbody tr[data-row-key] [data-table-text]')!;
    expect(preview).toHaveStyle({ whiteSpace: 'nowrap', textOverflow: 'ellipsis' });
    fireEvent.mouseEnter(preview);
    expect((await screen.findByRole('tooltip')).textContent).toBe(text);
    fireEvent.mouseLeave(preview);
    const header = container.querySelector('thead [data-table-text]')!;
    expect(header).toHaveStyle({ whiteSpace: 'nowrap', overflow: 'hidden' });
    fireEvent.click(header);
    expect(onChange).toHaveBeenCalled();
    fireEvent.click(container.querySelector('.ant-table-filter-trigger')!);
    expect(await screen.findByText('第一筆')).toBeInTheDocument();
    fireEvent.click(screen.getByText('第一筆'));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onChange.mock.calls.at(-1)?.[1]).toEqual({ name: ['one'] });
  });
});
