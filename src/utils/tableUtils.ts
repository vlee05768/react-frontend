import type { FieldConfig, TableColumnConfig } from '@/components/Form/types';
import { EllipsisText } from '@/components/Table/EllipsisText';
import React from 'react';
import { Tooltip } from 'antd';
import dayjs from 'dayjs';

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
      const rawTitle = typeof config.label === 'function' ? config.label({ values: {} as TValues }) : config.label;
      
      // 如果支援排序且啟用 showHint，則包裝表頭 Title 加上 Tooltip 提示
      const title = (tableProps.sortable && tableProps.showHint) ? (
        React.createElement(Tooltip, {
          title: "點擊可排序，按住 Shift 鍵可啟用多欄位排序",
          placement: "top"
        }, React.createElement('span', { style: { cursor: 'pointer', textDecoration: 'underline dotted var(--ant-color-text-quaternary, #bfbfbf)', textUnderlineOffset: '4px' } }, rawTitle))
      ) : rawTitle;
      
      // 根據型別設定預設對齊 (數字預設靠右，其餘靠左)
      let defaultAlign: 'left' | 'center' | 'right' = 'left';
      if (typeof config.componentType === 'string' && config.componentType === 'InputNumber') {
        defaultAlign = 'right';
      }

      // 預設 render 函數
      let render = tableProps.render;
      if (config.name === 'serialNumber' && !render) {
        render = (value: any, record: any, index: number) => {
          const serial = record?.serialNumber || record?.SerialNumber || value;
          if (serial !== undefined && serial !== null && serial !== '') {
            return serial;
          }
          const line = record?.lineNumber || record?.LineNumber;
          if (line !== undefined && line !== null && line !== '') {
            return line;
          }
          return index + 1;
        };
      }

      // 預設將未自訂 render 的數值欄位進行內容格式化 (千分位、最多4位小數、空值 blank 處理)
      const isNumericField = 
        (tableProps.align === 'right' || 
        defaultAlign === 'right' ||
        config.componentType === 'InputNumber' ||
        /qty|quantity|price|amount|total|tax|sum|subtotal|count|rate|weight/i.test(String(config.name))) &&
        !/taxid/i.test(String(config.name));

      if (isNumericField && !render) {
        render = (value: any) => {
          if (value === null || value === undefined || value === '') {
            return '';
          }
          const num = Number(value);
          return isNaN(num) ? value : num.toLocaleString('zh-TW', { maximumFractionDigits: 4 });
        };
      }

      // 預設所有 Table column 欄位皆加上 ellipsis: true
      const isEllipsis = tableProps.ellipsis !== false;
      if (isEllipsis) {
        const originalRender = render;
        render = (value: any, record: any, index: number) => {
          const content = originalRender ? originalRender(value, record, index) : value;
          return React.createElement(EllipsisText, { text: content, maxWidth: tableProps.width ? (typeof tableProps.width === 'number' ? tableProps.width - 32 : 300) : 300 });
        };
      }

      return {
        title,
        dataIndex: config.name,
        key: config.name,
        width: tableProps.width,
        align: tableProps.align || defaultAlign,
        render: render,
        sorter: tableProps.sortable === true ? true : (tableProps.sortable ? tableProps.sortable : undefined),
        fixed: tableProps.fixed,
        ellipsis: isEllipsis,
      };
    });

  // 如果有提供 Action 欄位，根據其 fixed 屬性決定放最右邊或最左邊 (預設無 fixed 或非 right 則放最左邊)
  if (actionColumn) {
    if (actionColumn.fixed === 'right') {
      columns.push(actionColumn);
    } else {
      columns.unshift(actionColumn);
    }
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
  sortRules?: string,
  options?: { showAudit?: boolean }
) {
  const sortMap = parseSortRules(sortRules);

  let configs = [...columnConfigs];
  
  // 決定是否顯示建檔與更新資訊 (稽核欄位)
  // 預設只要有傳入 sortRules (即 arguments.length >= 3) 且沒有被顯式設為 false，或者是顯式設為 true，就顯示
  const shouldShowAudit = options?.showAudit ?? (arguments.length >= 3 || sortRules !== undefined);
  const hasAuditFields = configs.some(c => c.name === 'createdAt' || c.name === 'createdBy');
  
  if (shouldShowAudit && !hasAuditFields) {
    configs.push(
      {
        label: '建檔人員',
        name: 'createdBy' as any,
        sortable: true,
        width: 110,
        align: 'center',
      },
      {
        label: '建檔時間',
        name: 'createdAt' as any,
        sortable: true,
        width: 150,
        align: 'center',
        render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
      },
      {
        label: '更新人員',
        name: 'updatedBy' as any,
        sortable: true,
        width: 110,
        align: 'center',
      },
      {
        label: '更新時間',
        name: 'updatedAt' as any,
        sortable: true,
        width: 150,
        align: 'center',
        render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
      }
    );
  }

  const columns = configs.map(config => {
    // 預設 render 函數
    let render = config.render;

    // 自動為 serialNumber 欄位注入備用渲染器
    if (config.name === 'serialNumber' && !render) {
      render = (value: any, record: any, index: number) => {
        const serial = record?.serialNumber || record?.SerialNumber || value;
        if (serial !== undefined && serial !== null && serial !== '') {
          return serial;
        }
        const line = record?.lineNumber || record?.LineNumber;
        if (line !== undefined && line !== null && line !== '') {
          return line;
        }
        return index + 1;
      };
    }

    // 預設將未自訂 render 的數值欄位進行內容格式化 (千分位、最多4位小數、空值 blank 處理)
    const isNumericField = 
      (config.align === 'right' || 
      /qty|quantity|price|amount|total|tax|sum|subtotal|count|rate|weight/i.test(String(config.name))) &&
      !/taxid/i.test(String(config.name));

    if (isNumericField && !render) {
      render = (value: any) => {
        if (value === null || value === undefined || value === '') {
          return '';
        }
        const num = Number(value);
        return isNaN(num) ? value : num.toLocaleString('zh-TW', { maximumFractionDigits: 4 });
      };
    }

    // 預設所有 Table column 欄位皆加上 ellipsis: true
    const isEllipsis = config.ellipsis !== false;
    if (isEllipsis) {
      const originalRender = render;
      render = (value: any, record: TValues, index: number) => {
        // 如果原本就有提供 render，先取得它的結果，否則直接使用 value
        const content = originalRender ? originalRender(value, record, index) : value;
        return React.createElement(EllipsisText, { text: content, maxWidth: config.width ? (typeof config.width === 'number' ? config.width - 32 : 300) : 300 });
      };
    }

    // 判斷當前此欄位的受控 sortOrder
    const currentSortOrder = sortMap[config.name] || null;

    // 如果支援排序且啟用 showHint，則包裝表頭 Title 加上 Tooltip 提示
    const title = (config.sortable && config.showHint) ? (
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
      ellipsis: isEllipsis,
    };
  });

  if (actionColumn) {
    if (actionColumn.fixed === 'right') {
      columns.push(actionColumn);
    } else {
      columns.unshift(actionColumn);
    }
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

/**
 * 根據欄位名稱與表格設定檔，取得欄位的中文名稱（含稽核欄位支援）。
 */
export function getColumnLabel(field: string, columnConfigs: any[]): string {
  const auditLabels: Record<string, string> = {
    createdBy: '建檔人員',
    createdAt: '建檔時間',
    updatedBy: '更新人員',
    updatedAt: '更新時間',
  };
  
  if (auditLabels[field]) {
    return auditLabels[field];
  }
  
  const config = columnConfigs.find(c => c.name === field || c.key === field || c.dataIndex === field);
  return config ? (config.label || config.title) : field;
}

