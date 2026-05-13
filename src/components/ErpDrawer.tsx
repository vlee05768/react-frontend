import { type ReactNode } from 'react';
import { Drawer, Button, Space, Tag, Typography } from 'antd';
import { ArrowLeft, Save, Edit3 } from 'lucide-react';

const { Text } = Typography;

export interface ErpDrawerProps {
  /** 控制 Drawer 的開關狀態 */
  open: boolean;
  /** 關閉時的 callback */
  onClose: () => void;
  /** Drawer 標題 */
  title: string;
  /** 當前單據或實體的狀態 (例如: 'Draft', 'Approved', 'Pending') */
  status?: string;
  /** 狀態標籤的顏色 (預設會根據 status 給予基本顏色，也可自定義) */
  statusColor?: string;
  /** 右上角是否顯示編輯按鈕 (若無提供 onEdit，則不顯示) */
  onEdit?: () => void;
  /** 是否處於編輯模式 */
  isEditing?: boolean;
  /** 左下角的稽核資訊 (例如: '建立人: Admin | 建立時間: 2024-05-13') */
  auditInfo?: ReactNode;
  /** 儲存動作 (若無提供，則不顯示儲存按鈕) */
  onSave?: () => void;
  /** 儲存按鈕是否處於 loading 狀態 */
  isSaving?: boolean;
  /** 內容區域 */
  children: ReactNode;
  /** Drawer 寬度 (預設 800) */
  width?: number | string;
}

export function ErpDrawer({
  open,
  onClose,
  title,
  status,
  statusColor = 'blue',
  onEdit,
  isEditing = false,
  auditInfo,
  onSave,
  isSaving = false,
  children,
  width = 800,
}: ErpDrawerProps) {
  
  // 渲染標題區塊 (Header)
  const renderTitle = () => (
    <div className="flex items-center justify-between w-full pr-8">
      <Space size="middle">
        <Text strong className="text-lg">{title}</Text>
        {status && <Tag color={statusColor}>{status}</Tag>}
      </Space>
      
      <Space>
        {onEdit && !isEditing && (
          <Button 
            type="primary" 
            ghost 
            icon={<Edit3 size={16} />} 
            onClick={onEdit}
          >
            編輯
          </Button>
        )}
      </Space>
    </div>
  );

  // 渲染底部操作區塊 (Footer)
  const renderFooter = () => (
    <div className="flex items-center justify-between w-full">
      <div className="text-gray-500 text-sm">
        {auditInfo}
      </div>
      <Space>
        <Button onClick={onClose} icon={<ArrowLeft size={16} />}>
          {isEditing ? '取消' : '返回'}
        </Button>
        {isEditing && onSave && (
          <Button 
            type="primary" 
            onClick={onSave} 
            loading={isSaving}
            icon={<Save size={16} />}
          >
            儲存
          </Button>
        )}
      </Space>
    </div>
  );

  return (
    <Drawer
      title={renderTitle()}
      placement="right"
      width={width}
      onClose={onClose}
      open={open}
      // ERP UX 憲法: Drawer 禁背景關閉
      maskClosable={false}
      footer={renderFooter()}
      className="erp-drawer"
    >
      <div className="p-4">
        {children}
      </div>
    </Drawer>
  );
}
