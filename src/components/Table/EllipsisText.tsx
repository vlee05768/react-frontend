import React, { useRef } from 'react';
import { Tooltip } from 'antd';

export interface EllipsisTextProps {
  text?: string | React.ReactNode;
  maxWidth?: number | string;
  maxLines?: number;
  showHint?: boolean; // 新增：是否顯示 Hover 的 Tooltip
}

/**
 * 處理表格長文字或包含換行(\n)資料的元件
 * UX 模式:
 * 1. 預設將文字截斷為單行，若是包含換行符號(\n)，則將換行符號取代為空白，維持表格整齊。
 * 2. 滑鼠游標 Hover 時，彈出 Tooltip。Tooltip 內部使用 white-space: pre-wrap 保留原始換行格式。
 */
export const EllipsisText: React.FC<EllipsisTextProps> = ({ text, maxWidth = 300, maxLines = 1, showHint = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 處理非字串的情況 (例如 ReactNode)
  if (text === undefined || text === null || text === '') {
    return <>{text}</>;
  }

  // 判斷是否為純文字
  const isString = typeof text === 'string' || typeof text === 'number';
  const strValue = isString ? String(text) : '';
  
  // 單行預覽用：把換行取代成空白，以免把 Row 撐高
  const previewText = isString ? strValue.replace(/\n/g, ' ') : text;

  const contentNode = (
    <div
      ref={containerRef}
      style={{
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: maxWidth,
        // 確保如果是字串時單行顯示不要斷在奇怪的地方
        wordBreak: maxLines === 1 ? 'keep-all' : 'break-word',
        whiteSpace: maxLines === 1 ? 'nowrap' : 'normal',
      }}
    >
      {previewText}
    </div>
  );

  if (!showHint) {
    return contentNode;
  }

  return (
    <Tooltip
      title={
        <div 
          style={{ 
            whiteSpace: 'pre-wrap', // 保留原本的 \n
            wordBreak: 'break-word', 
            maxHeight: '400px', 
            overflowY: 'auto' 
          }}
        >
          {text}
        </div>
      }
      placement="topLeft"
      // 設定滑鼠只要移上去就提示，不用等太久
      mouseEnterDelay={0.3} 
    >
      {contentNode}
    </Tooltip>
  );
};
