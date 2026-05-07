import type { FieldConfig, TableColumnConfig } from '@/components/Form/types';
import { EllipsisText } from '@/components/Table/EllipsisText';
import React from 'react';

/**
 * 將 FieldConfig 陣列轉換為 Ant Design Table 支援的 columns 格式。
 * @param fieldConfigs 表單與表格整合的設定檔
 * @param actionColumn 客製化的操作欄位 (例如: 編輯、刪除按鈕)，會固定插入到最前面
 * @returns Ant Design Table columns
 */
export function generateTableColumns<TValues>(
  fieldConfigs: FieldConfig<TValues>[],
  actionColumn?: any
) {
  const columns = fieldConfigs
    // 過濾掉不顯示於 Table 的欄位
    .filter(config => {
      if (config.table === false) return false;
      if (typeof config.table === 'object' && config.table.show === false) return false;
      return true;
    })
    .map(config => {
      const tableProps = typeof config.table === 'object' ? config.table : {} as TableColumnConfig<TValues>;
      
      // 動態 Label 解析，在 Table header 通常只取純字串 (傳入空物件當 context)
      const title = typeof config.label === 'function' ? config.label({ values: {} as TValues }) : config.label;
      
      // 根據型別設定預設對齊 (數字預設靠右，其餘靠左)
      let defaultAlign: 'left' | 'center' | 'right' = 'left';
      if (typeof config.componentType === 'string' && config.componentType === 'InputNumber') {
        defaultAlign = 'right';
      }

      return {
        title,
        dataIndex: config.name,
        key: config.name,
        width: tableProps.width,
        align: tableProps.align || defaultAlign,
        render: tableProps.render,
        sorter: tableProps.sortable ? true : undefined,
        fixed: tableProps.fixed,
      };
    });

  // 如果有提供 Action 欄位，預設放到最左邊 (可根據專案習慣調整，有些人喜歡放最右邊)
  if (actionColumn) {
    columns.unshift(actionColumn);
  }

  return columns;
}


/**
 * [新架構] 將 TableColumnConfig 陣列轉換為 Ant Design Table 支援的 columns 格式。
 */
export function buildTableColumns<TValues>(
  columnConfigs: TableColumnConfig<TValues>[],
  actionColumn?: any
) {
  const columns = columnConfigs.map(config => {
    // 預設 render 函數
    let render = config.render;

    // 若設定了 ellipsis 且沒有提供自訂 render，或是在 custom render 之外想套用 tooltip
    // 在這裡我們可以覆寫 render，讓它自動包裝 EllipsisText
    if (config.ellipsis) {
      const originalRender = config.render;
      render = (value: any, record: TValues, index: number) => {
        // 如果原本就有提供 render，先取得它的結果，否則直接使用 value
        const content = originalRender ? originalRender(value, record, index) : value;
        return React.createElement(EllipsisText, { text: content, maxWidth: config.width ? config.width - 32 : 300 });
      };
    }

    return {
      title: config.label,
      dataIndex: config.name,
      key: config.name,
      width: config.width,
      align: config.align || 'left',
      render: render,
      sorter: config.sortable ? true : undefined,
      fixed: config.fixed,
    };
  });

  if (actionColumn) {
    columns.unshift(actionColumn);
  }

  return columns;
}
