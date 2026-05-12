import React from 'react';
import { FormOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface ActionBarProps {
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  actions?: React.ReactNode;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  actions
}) => {
  const formatAuditDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
  };

  return (
    <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-800 bg-transparent flex justify-between items-center transition-colors">
      <div className="flex items-center gap-4 text-[13px] text-gray-600 dark:text-gray-400">
        {(createdBy || createdAt) && (
          <div className="flex items-center gap-1.5">
            <FormOutlined className="text-gray-400 dark:text-gray-500" />
            <span>資料建立：{createdBy || '系統'} {createdAt ? `(${formatAuditDate(createdAt)})` : ''}</span>
          </div>
        )}
        
        {((createdBy || createdAt) && (updatedBy || updatedAt)) && (
          <div className="text-gray-300 dark:text-gray-600">|</div>
        )}

        {(updatedBy || updatedAt) && (
          <div className="flex items-center gap-1.5">
            <EditOutlined className="text-gray-400 dark:text-gray-500" />
            <span>最後修改：{updatedBy || '系統'} {updatedAt ? `(${formatAuditDate(updatedAt)})` : ''}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {actions}
      </div>
    </div>
  );
};
