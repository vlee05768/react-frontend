import React from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface ActionProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  recordName?: string; // 用於刪除提示
}

// 統一操作按鈕樣式與行為
export const TableActions: React.FC<ActionProps> = ({ onView, onEdit, onDelete, recordName = '此資料' }) => {
  return (
    <div className="flex space-x-2">
      {onView && (
        <Tooltip title="檢視 (Alt+V)">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={(e) => { e.stopPropagation(); onView(); }} 
            className="text-blue-400 hover:text-blue-300"
            size="small"
          />
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip title="編輯 (Alt+E)">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={(e) => { e.stopPropagation(); onEdit(); }} 
            className="text-green-500 hover:text-green-400"
            size="small"
          />
        </Tooltip>
      )}
      {onDelete && (
        <Popconfirm
          title={`確定要刪除 ${recordName} 嗎？`}
          onConfirm={(e) => { e?.stopPropagation(); onDelete(); }}
          onCancel={(e) => e?.stopPropagation()}
          okText="確定"
          cancelText="取消"
        >
          <Tooltip title="刪除 (Del)">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={(e) => e.stopPropagation()} // 防止觸發列點擊
              size="small"
            />
          </Tooltip>
        </Popconfirm>
      )}
    </div>
  );
};
