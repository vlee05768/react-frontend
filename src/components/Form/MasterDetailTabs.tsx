import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Tabs } from 'antd';
import { FileAttachmentZone } from '@/components/FileAttachment/FileAttachmentZone';

export interface MasterDetailTabsProps {
  activeTab: string;
  onTabChange: (key: string) => void;
  isCreateMode: boolean;
  isEditMode: boolean;
  viewId?: string | number | null;
  masterContent: ReactNode;
  entityType?: string; // e.g. "Material", "BusinessPartner"
  showAttachments?: boolean; // 新增控制是否顯示附件管理的屬性
  detailTabs?: {
    key: string;
    label: string;
    children: ReactNode;
    disabled?: boolean;
  }[];
}

export const MasterDetailTabs: React.FC<MasterDetailTabsProps> = ({
  activeTab,
  onTabChange,
  isCreateMode,
  isEditMode,
  viewId,
  masterContent,
  entityType,
  showAttachments = false,
  detailTabs = [],
}) => {
  const isViewMode = !isCreateMode && !isEditMode;

  // Automatically switch back to master_info if entering create or edit mode
  // while on the sys_attachments tab (to prevent getting stuck on a disabled tab)
  useEffect(() => {
    if ((isCreateMode || isEditMode) && activeTab === 'sys_attachments') {
      onTabChange('master_info');
    }
  }, [isCreateMode, isEditMode, activeTab, onTabChange]);

  const items: any[] = [
    {
      key: 'master_info',
      label: '主要資訊',
      forceRender: true,
      children: masterContent,
    },
  ];

  if (showAttachments && entityType) {
    items.push({
      key: 'sys_attachments',
      label: '附件管理',
      disabled: !isViewMode || !viewId,
      children: (
        <div style={{ padding: '16px 0' }}>
          {viewId && (
            <FileAttachmentZone 
              referenceType={entityType} 
              referenceId={String(viewId)} 
              readonly={false} 
            />
          )}
        </div>
      ),
    });
  }

  if (detailTabs && detailTabs.length > 0) {
    detailTabs.forEach((tab) => {
      items.push({
        key: tab.key,
        label: tab.label,
        disabled: tab.disabled || (!isViewMode && !isEditMode) || !viewId,
        children: tab.children,
      });
    });
  }

  return (
    <Tabs 
      activeKey={activeTab} 
      onChange={onTabChange} 
      items={items} 
    />
  );
};
