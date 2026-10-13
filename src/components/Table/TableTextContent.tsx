import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Tooltip } from 'antd';
import './tableText.css';

export type TableTextValue = string | number | null | undefined;
export type TableTextTooltipMode = 'overflow' | 'always' | 'never';

export interface TableTextProps {
  value: TableTextValue;
  format?: (value: string | number) => string;
  /** 接收已格式化、依行數處理的預覽文字；完整提示不從 JSX 推測。 */
  renderContent?: (text: string) => React.ReactNode;
  tooltipContent?: React.ReactNode;
  tooltipMode?: TableTextTooltipMode;
  maxLines?: number;
  maxWidth?: number | string;
  align?: 'left' | 'center' | 'right';
  emptyText?: string;
}

/** 純文字與客製文字的共同量測、預覽及提示核心。 */
export function TableText({ value, format, renderContent, tooltipContent, tooltipMode = 'overflow', maxLines = 1, maxWidth = '100%', align, emptyText = '' }: TableTextProps) {
  const empty = value === null || value === undefined || value === '';
  const fullText = empty ? emptyText : format ? format(value) : String(value);
  const lines = Number.isFinite(maxLines) ? Math.max(1, Math.floor(maxLines)) : 1;
  const singleLine = lines === 1;
  const previewText = singleLine ? fullText.replace(/\r\n|\r|\n/g, ' ') : fullText;
  const content = renderContent ? renderContent(previewText) : previewText;
  const [element, setElement] = useState<HTMLSpanElement | null>(null);
  const [measured, setMeasured] = useState({ overflow: false, interactive: false });

  const measure = useCallback(() => {
    if (!element) return;
    const overflow = element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
    const interactive = !!element.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    setMeasured(previous => previous.overflow === overflow && previous.interactive === interactive ? previous : { overflow, interactive });
  }, [element]);

  // 訂閱只跟著 DOM 節點；內容或量測 state 更新不重建 observer/listener。
  useLayoutEffect(() => {
    if (!element) return;
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [element, measure]);

  // 每次 DOM commit 重測，涵蓋同文字但 JSX／樣式改變；相同量測不更新 state。
  useLayoutEffect(() => { measure(); });

  const hasHiddenNewline = singleLine && /[\r\n]/.test(fullText);
  const title = tooltipContent === undefined ? fullText : tooltipContent;
  const hasTitle = title !== null && title !== undefined && title !== false && title !== '';
  const enabled = hasTitle && tooltipMode !== 'never' && (tooltipMode === 'always' || measured.overflow || hasHiddenNewline);
  const preview = (
    <span
      ref={setElement}
      data-table-text=""
      className={`erp-table-text-preview erp-table-text-preview--${singleLine ? 'single-line' : 'multi-line'}`}
      tabIndex={enabled && !measured.interactive ? 0 : undefined}
      // eslint-disable-next-line react/forbid-dom-props -- 僅使用呼叫端可配置的寬度、行數及對齊。
      style={{ maxWidth, WebkitLineClamp: singleLine ? undefined : lines, textAlign: align }}
    >
      {content}
    </span>
  );
  // 保持同一個 DOM 節點，避免提示啟閉時 observer 留在被替換的 preview。
  return <Tooltip title={enabled ? <div className="erp-table-text-hint">{title}</div> : undefined} placement="topLeft" mouseEnterDelay={0.3} trigger={['hover', 'focus']}>{preview}</Tooltip>;
}