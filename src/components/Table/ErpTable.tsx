import React from 'react';
import { Table as AntTable } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { normalizeTableColumns } from './tableText';

// 相容既有 Table.Column／ColumnGroup 宣告，不改動表格編輯器與 Summary。
function columnsFromChildren<T>(children: React.ReactNode): ColumnsType<T> {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<ColumnType<T> & { children?: React.ReactNode }>(child)) return [];
    if (child.type === React.Fragment) return columnsFromChildren<T>(child.props.children);
    const { children: nested, ...props } = child.props;
    const key = child.key ?? undefined;
    return child.type === AntTable.ColumnGroup
      ? [{ ...props, key, children: columnsFromChildren<T>(nested) }]
      : [{ ...props, key }];
  });
}

/** 全站表格文字規範入口；只處理欄位文字，原封不動轉送表格互動與版面 props。 */
function ErpTable<T extends object>(props: TableProps<T>) {
  const { columns, children, ...rest } = props;
  return <AntTable<T> tableLayout="fixed" {...rest} columns={normalizeTableColumns(columns ?? columnsFromChildren<T>(children))} />;
}

export default Object.assign(ErpTable, {
  Column: AntTable.Column,
  ColumnGroup: AntTable.ColumnGroup,
  Summary: AntTable.Summary,
  SELECTION_ALL: AntTable.SELECTION_ALL,
  SELECTION_INVERT: AntTable.SELECTION_INVERT,
  SELECTION_NONE: AntTable.SELECTION_NONE,
  EXPAND_COLUMN: AntTable.EXPAND_COLUMN,
  SELECTION_COLUMN: AntTable.SELECTION_COLUMN,
});
