import React from 'react';
import { Link } from 'react-router-dom';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { EllipsisText } from './EllipsisText';
import { TableText, type TableTextTooltipMode } from './TableTextContent';
export { TableText } from './TableTextContent';
export type { TableTextProps, TableTextValue, TableTextTooltipMode } from './TableTextContent';

export interface TableTextOptions {
  /** 預設單行；大於 1 保留換行並限制行數。ellipsis:false 完全交由 renderer。 */
  maxLines?: number;
  showHint?: boolean;
  tooltipMode?: TableTextTooltipMode;
  /** 短欄頭的完整名稱／單位說明。 */
  headerHint?: string;
}

export type ErpColumnsType<T> = (ColumnsType<T>[number] & TableTextOptions)[];

const normalized = new WeakSet<object>();

type TextElementProps = { children?: React.ReactNode; style?: React.CSSProperties; dangerouslySetInnerHTML?: unknown; tabIndex?: number; role?: string };
const textTags = new Set(['span', 'a', 'div', 'p', 'strong', 'em', 'small', 'code']);

function plainText(node: React.ReactNode, boundary = { links: 0 }): string | undefined {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    const parts = node.map(child => plainText(child, boundary));
    return parts.every(part => part !== undefined) ? parts.join('') : undefined;
  }
  if (!React.isValidElement<TextElementProps>(node)) return undefined;
  if (node.type !== Link && !(typeof node.type === 'string' && textTags.has(node.type))) return undefined;
  // 明確多行／富文節點、未知元件與輸入控制器皆保留自己的設計。
  if (node.props.dangerouslySetInnerHTML || (node.props.style?.whiteSpace && node.props.style.whiteSpace !== 'nowrap') || node.props.style?.WebkitLineClamp) return undefined;
  // 單一文字連結可以省略；多連結或其他互動容器必須保留操作區。
  if (node.type === Link || node.type === 'a') {
    if (++boundary.links > 1) return undefined;
  } else if (node.props.tabIndex !== undefined || node.props.role || Object.keys(node.props).some(key => /^on[A-Z]/.test(key))) {
    return undefined;
  }
  return plainText(node.props.children, boundary);
}

function singleLineChildren(node: React.ReactNode): React.ReactNode {
  if (typeof node === 'string') return node.replace(/\r\n|\r|\n/g, ' ');
  if (Array.isArray(node)) return node.map(singleLineChildren);
  if (React.isValidElement<TextElementProps>(node)) return React.cloneElement(node, {}, singleLineChildren(node.props.children));
  return node;
}

/** 只處理已知純文字容器／連結，不把互動 renderer 當文字裁切或複製。 */
export function renderTableText(content: React.ReactNode, options: TableTextOptions = {}, hint?: string): React.ReactNode {
  const tooltipMode = options.tooltipMode ?? (options.showHint === undefined ? 'overflow' : options.showHint ? 'always' : 'never');
  if (typeof content === 'string' || typeof content === 'number') return <TableText value={content} maxLines={options.maxLines} tooltipMode={tooltipMode} tooltipContent={hint} />;
  if (!React.isValidElement<TextElementProps>(content)) return <EllipsisText text={content} maxLines={options.maxLines} showHint={options.showHint} hint={hint} />;
  const text = plainText(content);
  if (text === undefined) return content;
  const maxLines = options.maxLines ?? 1;
  return <TableText value={text} maxLines={maxLines} tooltipMode={tooltipMode} tooltipContent={hint}
    renderContent={() => maxLines === 1 ? singleLineChildren(content) : content} />;
}

/** 只修改文字呈現；保留 sorter、filter、onCell、固定欄與原始 renderer 參數。 */
export function normalizeTableColumns<T>(columns: ColumnsType<T>): ColumnsType<T> {
  return columns.map(column => {
    if (normalized.has(column)) return column;
    const config = column as ColumnType<T> & TableTextOptions;
    const renderTitle = (title: React.ReactNode) => {
      const fullTitle = config.headerHint ?? plainText(title) ?? '';
      const hint = config.sorter && config.showHint
        ? `${fullTitle}\n點擊可排序，按住 Shift 鍵可啟用多欄位排序`
        : config.headerHint;
      // 明確的欄頭補充說明沿用 always；一般欄名採實際溢出提示。
      return renderTableText(title, { tooltipMode: config.tooltipMode ?? (config.showHint === false ? 'never' : hint !== undefined || config.showHint ? 'always' : 'overflow') }, hint);
    };
    const rawTitle = column.title;
    const title: ColumnType<T>['title'] = typeof rawTitle === 'function'
      ? props => renderTitle(rawTitle(props))
      : renderTitle(rawTitle);
    const result = 'children' in column
      ? { ...column, title, children: normalizeTableColumns(column.children) }
      : {
          ...column,
          title,
          // 原生排序提示只作用於圖示，避免遮住完整欄名 hint；自訂設定仍優先。
          showSorterTooltip: config.showSorterTooltip ?? { target: 'sorter-icon' as const },
          // 原生 td ellipsis 會裁切按鈕／多行例外，省略交由文字元件處理。
          ellipsis: false,
          render: (value: unknown, record: T, index: number) => {
            const content = config.render ? config.render(value, record, index) : value as React.ReactNode;
            if (config.ellipsis === false) return content;
            if (content && typeof content === 'object' && !React.isValidElement(content) && 'children' in content) {
              return { ...content, children: renderTableText(content.children, config) };
            }
            return renderTableText(content as React.ReactNode, config);
          },
        };
    normalized.add(result);
    return result;
  });
}
