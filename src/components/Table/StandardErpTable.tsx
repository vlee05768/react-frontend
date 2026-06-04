import { Table, theme } from 'antd';
import type { TableProps } from 'antd';

export interface StandardErpTableProps<RecordType> extends Omit<TableProps<RecordType>, 'columns'> {
  columns: any[];
  selectedRowId?: string | number | null; // 當前 Drawer 展開檢視的 record ID/Code
  selectedRowKey?: string;                // 用於比對的 key 欄位（預設為 'id'，若為廠商客戶則是 'code'）
  deletingRowId?: string | number | null; // 正在進行刪除的行，用以觸發刪除動畫高亮
}

/**
 * ERP 專用的統一表格元件。
 * 內建 border、標準自適應高度、分頁顯示、檢視選取高亮與刪除高亮。
 */
export default function StandardErpTable<RecordType extends object>({
  columns,
  selectedRowId,
  selectedRowKey = 'id',
  deletingRowId,
  rowClassName,
  ...restProps
}: StandardErpTableProps<RecordType>) {
  const { token } = theme.useToken();
  
  // 統一封裝分頁行為，自動帶入 showSizeChanger 與 showTotal 格式，維持全系統一致性
  const unifiedPagination = restProps.pagination !== false && restProps.pagination !== undefined ? {
    current: restProps.pagination?.current,
    pageSize: restProps.pagination?.pageSize,
    total: restProps.pagination?.total,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 筆資料`,
    ...restProps.pagination
  } : false;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 注入 ERP Table 捲軸與選取高亮的 CSS 設定，避免因外部 flex 排版而高度塌陷 */}
      <style>{`
        .ant-table-wrapper { height: 100%; display: flex; flex-direction: column; }
        .ant-spin-nested-loading { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .ant-spin { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .ant-spin-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .ant-table { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .ant-table-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .ant-table-body { flex: 1; overflow-x: auto !important; overflow-y: auto !important; max-height: none !important; }
        .ant-table-pagination { margin-top: auto !important; margin-bottom: 0 !important; }
        .ant-table-thead > tr > th { text-align: center !important; }
        .ant-table-cell-ellipsis, .ant-table-cell-ellipsis * {
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 100% !important;
        }
        .selected-table-row > td { background-color: ${token.controlItemBgActive} !important; }
        .deleting-row-highlight > td { background-color: ${token.colorErrorBg} !important; opacity: 0.6; }
      `}</style>
      
      <Table<RecordType>
        bordered
        scroll={{ x: 'max-content', y: 300 }} // y: 300 為觸發 .ant-table-body 高度自適應的關鍵，不可移除
        rowClassName={(record, index) => {
          const r = record as any;
          // 根據 selectedRowKey 或常見 ERP 主鍵欄位名稱，識別當前 record ID
          const recordId = r[selectedRowKey] || r.id || r.code || r.documentNumber || r.moldCode;
          let cls = '';
          
          if (selectedRowId !== undefined && selectedRowId !== null && String(recordId) === String(selectedRowId)) {
            cls += 'selected-table-row ';
          }
          if (deletingRowId !== undefined && deletingRowId !== null && String(recordId) === String(deletingRowId)) {
            cls += 'deleting-row-highlight ';
          }
          
          if (rowClassName) {
            cls += (typeof rowClassName === 'function' ? rowClassName(record, index, 0) : rowClassName) + ' ';
          }
          
          return cls.trim();
        }}
        columns={columns}
        {...restProps}
        pagination={unifiedPagination}
      />
    </div>
  );
}
