import type { FieldConfig, TableColumnConfig } from '@/components/Form/types';
import { EllipsisText } from '@/components/Table/EllipsisText';
import React from 'react';
import { Tooltip } from 'antd';

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
        sorter: tableProps.sortable === true ? true : (tableProps.sortable ? tableProps.sortable : undefined),
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
 * 解析 SortRules 字串為鍵值對 map
 * 例如: "type:asc,code:desc" -> { type: 'ascend', code: 'descend' }
 */
export function parseSortRules(sortRules?: string): Record<string, 'ascend' | 'descend' | null> {
  const result: Record<string, 'ascend' | 'descend' | null> = {};
  if (!sortRules) return result;

  sortRules.split(',').forEach(rule => {
    const [field, order] = rule.split(':');
    if (field && order) {
      result[field] = order === 'asc' ? 'ascend' : 'descend';
    }
  });
  return result;
}

/**
 * [新架構] 將 TableColumnConfig 陣列轉換為 Ant Design Table 支援的 columns 格式。
 */
export function buildTableColumns<TValues>(
  columnConfigs: TableColumnConfig<TValues>[],
  actionColumn?: any,
  sortRules?: string
) {
  const sortMap = parseSortRules(sortRules);

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
        return React.createElement(EllipsisText, { text: content, maxWidth: config.width ? (typeof config.width === 'number' ? config.width - 32 : 300) : 300 });
      };
    }

    // 判斷當前此欄位的受控 sortOrder
    const currentSortOrder = sortMap[config.name] || null;

    // 如果支援排序，則包裝表頭 Title 加上 Tooltip 提示
    const title = config.sortable ? (
      React.createElement(Tooltip, {
        title: "點擊可排序，按住 Shift 鍵可啟用多欄位排序",
        placement: "top"
      }, React.createElement('span', { style: { cursor: 'pointer', textDecoration: 'underline dotted var(--ant-color-text-quaternary, #bfbfbf)', textUnderlineOffset: '4px' } }, config.label))
    ) : config.label;

    return {
      title: title,
      dataIndex: config.name,
      key: config.name,
      width: config.width,
      // 專案規範: 欄位名稱一律置中 (需透過 global CSS 或標籤，這裡僅設定列本身的 alignment，而 global css .ant-table-thead > tr > th 會強迫置中)
      align: config.align || 'left',
      render: render,
      sorter: config.sortable === true ? true : (config.sortable ? config.sortable : undefined),
      sortOrder: config.sortable ? currentSortOrder : undefined,
      fixed: config.fixed,
    };
  });

  if (actionColumn) {
    columns.unshift(actionColumn);
  }

  return columns;
}

/**
 * 將 Ant Design Table 的 sorter 轉換為後端能識別的多欄位排序規則字串
 * 返回格式如: "type:asc,code:desc"
 */
export function formatSorterToRules(sorter: any): string | undefined {
  if (!sorter) return undefined;

  // 1. 如果是多欄位排序，sorter 會是一個陣列
  if (Array.isArray(sorter)) {
    const activeSorts = sorter
      .filter((s: any) => s.field && s.order) // 過濾掉沒有被排序的欄位
      .map((s: any) => `${s.field}:${s.order === 'ascend' ? 'asc' : 'desc'}`);
    
    return activeSorts.length > 0 ? activeSorts.join(',') : undefined;
  }

  // 2. 如果是單一欄位排序，sorter 會是一個物件
  if (sorter.field && sorter.order) {
    return `${sorter.field}:${sorter.order === 'ascend' ? 'asc' : 'desc'}`;
  }

  return undefined;
}
