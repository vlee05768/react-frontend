import React from 'react';
import { TableText } from './TableTextContent';

export interface EllipsisTextProps {
  text?: React.ReactNode;
  maxWidth?: number | string;
  /** 明確多行設計可指定大於 1；預設單行。 */
  maxLines?: number;
  showHint?: boolean;
  /** 短表頭可另外提供完整欄位意義，不改變資料值。 */
  hint?: string;
}

/** 表格純文字單行預覽；提示保留原始 CRLF／換行。未知互動節點原樣保留。 */
export function EllipsisText({ text, maxWidth = '100%', maxLines = 1, showHint, hint }: EllipsisTextProps) {
  if (text === undefined || text === null || text === '') return <>{text}</>;
  if (typeof text !== 'string' && typeof text !== 'number') return <>{text}</>;

  return <TableText value={text} maxWidth={maxWidth} maxLines={maxLines} tooltipContent={hint} tooltipMode={showHint === undefined ? 'overflow' : showHint ? 'always' : 'never'} />;
}
