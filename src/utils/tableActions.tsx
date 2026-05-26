import React from 'react';
import { Button, Popconfirm, Tooltip, Modal, Space, theme } from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PrinterOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined 
} from '@ant-design/icons';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';

interface ActionProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onConfirm?: () => void;
  onCancelConfirm?: () => void;
  recordName?: string; // 用於刪除提示
  deleteConfirmType?: 'popconfirm' | 'modal'; // 'popconfirm' (預設, 基礎資料) 或 'modal' (交易單據)
  isPrinting?: boolean;
  isConfirming?: boolean;
  isCanceling?: boolean;
  extra?: React.ReactNode; // 支援自訂額外操作按鈕
}

// 統一操作按鈕樣式與行為
export const TableActions: React.FC<ActionProps> = ({ 
  onView, 
  onEdit, 
  onDelete, 
  onPrint,
  onConfirm,
  onCancelConfirm,
  recordName = '此資料',
  deleteConfirmType = 'popconfirm',
  isPrinting = false,
  isConfirming = false,
  isCanceling = false,
  extra
}) => {
  const { token } = theme.useToken();

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止表格行點擊事件冒泡
    if (!onDelete) return;

    if (deleteConfirmType === 'modal') {
      Modal.confirm({
        title: `確定要刪除 ${recordName} 嗎？`,
        content: '警告：此操作不可逆！刪除單據將同步刪除其關聯細項，並可能影響庫存及帳務流水！',
        okText: '確定刪除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        maskClosable: true,
        onOk: () => {
          onDelete();
        }
      });
    }
  };

  const iconStyle = { fontSize: TABLE_ACTION_ICON_SIZE };

  // 統一全站同用途按鈕的顏色樣式 (在亮色與深色模式下均有極佳易讀性與一致性)
  const styles = {
    view: { color: token.colorPrimary },             // 檢視：主題藍 (e.g. #1677ff)
    edit: { color: token.colorSuccess },             // 編輯：成功綠 (e.g. #52c41a)
    confirm: { color: token.colorInfo },             // 確認：資訊青/藍 (e.g. #13c2c2 或 #1677ff)
    cancel: { color: token.colorWarning },           // 取消：警告橘 (e.g. #fa8c16)
    print: { color: '#722ed1' },                      // 列印：極致紫 (e.g. #722ed1, 確保列印專屬感)
    delete: { color: token.colorError }              // 刪除：危險紅 (e.g. #ff4d4f)
  };

  return (
    <Space size="small" onClick={(e) => e.stopPropagation()} className="flex items-center">
      {extra}
      {onView && (
        <Tooltip title="檢視 (Alt+V)">
          <Button 
            type="text" 
            icon={<EyeOutlined style={iconStyle} />} 
            onClick={(e) => { e.stopPropagation(); onView(); }} 
            style={styles.view}
            className="flex items-center justify-center hover:opacity-80"
            size="small"
          />
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip title="編輯 (Alt+E)">
          <Button 
            type="text" 
            icon={<EditOutlined style={iconStyle} />} 
            onClick={(e) => { e.stopPropagation(); onEdit(); }} 
            style={styles.edit}
            className="flex items-center justify-center hover:opacity-80"
            size="small"
          />
        </Tooltip>
      )}
      {onConfirm && (
        <Tooltip title="確認單據">
          <Button 
            type="text" 
            icon={<CheckCircleOutlined style={iconStyle} />} 
            onClick={(e) => { e.stopPropagation(); onConfirm(); }} 
            loading={isConfirming}
            style={styles.confirm}
            className="flex items-center justify-center hover:opacity-80"
            size="small"
          />
        </Tooltip>
      )}
      {onCancelConfirm && (
        <Tooltip title="取消確認">
          <Button 
            type="text" 
            icon={<CloseCircleOutlined style={iconStyle} />} 
            onClick={(e) => { e.stopPropagation(); onCancelConfirm(); }} 
            loading={isCanceling}
            style={styles.cancel}
            className="flex items-center justify-center hover:opacity-80"
            size="small"
          />
        </Tooltip>
      )}
      {onPrint && (
        <Tooltip title="列印單據">
          <Button 
            type="text" 
            icon={<PrinterOutlined style={iconStyle} />} 
            onClick={(e) => { e.stopPropagation(); onPrint(); }} 
            loading={isPrinting}
            style={styles.print}
            className="flex items-center justify-center hover:opacity-80"
            size="small"
          />
        </Tooltip>
      )}
      {onDelete && (
        deleteConfirmType === 'popconfirm' ? (
          <Popconfirm
            title={`確定要刪除 ${recordName} 嗎？`}
            onConfirm={(e) => { e?.stopPropagation(); onDelete(); }}
            onCancel={(e) => e?.stopPropagation()}
            okText="確定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="刪除 (Del)">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined style={iconStyle} />} 
                style={styles.delete}
                onClick={(e) => e.stopPropagation()} // 防止觸發列點擊
                className="flex items-center justify-center hover:opacity-80"
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        ) : (
          <Tooltip title="刪除 (Del)">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined style={iconStyle} />} 
              style={styles.delete}
              onClick={handleDeleteClick}
              className="flex items-center justify-center hover:opacity-80"
              size="small"
            />
          </Tooltip>
        )
      )}
    </Space>
  );
};
