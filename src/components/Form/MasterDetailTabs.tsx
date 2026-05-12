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
  disableTabSwitching?: boolean; // 是否全面停用分頁切換
  heightOffset?: number; // 控制內部高度的偏移量，預設 180
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
  disableTabSwitching = false,
  heightOffset = 180,
  detailTabs = [],
}) => {
  const isViewMode = !isCreateMode && !isEditMode;

  // Automatically switch back to master_info if entering create or edit mode
  // while on a detail tab (to prevent getting stuck on a disabled tab)
  useEffect(() => {
    if ((isCreateMode || isEditMode) && activeTab !== 'master_info') {
      onTabChange('master_info');
    }
  }, [isCreateMode, isEditMode, activeTab, onTabChange]);

  const items: any[] = [
    {
      key: 'master_info',
      label: '主要資訊',
      forceRender: true,
      disabled: disableTabSwitching,
      children: (
        <div style={{ height: `calc(100vh - ${heightOffset}px)`, overflowY: "auto", overflowX: "hidden", paddingRight: "8px", margin: "0 -8px 0 0" }}>
          {masterContent}
        </div>
      ),
    },
  ];

  if (showAttachments && entityType) {
    items.push({
      key: 'sys_attachments',
      label: '附件管理',
      disabled: disableTabSwitching || !isViewMode || !viewId,
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
        disabled: disableTabSwitching || tab.disabled || !isViewMode || !viewId,
        children: tab.children,
      });
    });
  }

  return (
    <Tabs 
      activeKey={activeTab} 
      onChange={onTabChange} 
      items={items} 
      tabBarGutter={16}
    />
  );
};
