content = open('src/pages/production/workorders/WorkOrderItemsTab.tsx', 'r', encoding='utf-8').read()

# We will completely rewrite WorkOrderItemsTab.tsx to be read-only
new_content = """import React from "react";
import { Table } from "antd";
import type { WorkOrderDto, WorkOrderMaterialDto } from "@/api/generated/types.gen";
import { itemColumns } from "./WorkOrderConfig";

interface WorkOrderItemsTabProps {
  masterData: WorkOrderDto;
  isMasterViewMode: boolean;
  onEditingChange?: (isEditing: boolean) => void; // 保留 prop 避免父層報錯，但不會用到
}

export const WorkOrderItemsTab: React.FC<WorkOrderItemsTabProps> = ({
  masterData,
}) => {
  // Safe extraction using Array.isArray fallback
  const listData: WorkOrderMaterialDto[] = Array.isArray(masterData.items) 
    ? masterData.items 
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        padding: '8px 12px',
        backgroundColor: 'var(--ant-color-fill-alter)',
        borderRadius: '6px'
      }}>
        <div style={{ color: 'var(--ant-color-text-secondary)' }}>
          目前共有 <span>{listData.length}</span> 筆應發料資料
        </div>
        <div style={{ color: 'var(--ant-color-text-description)', fontSize: '12px' }}>
          * 備料明細為系統根據 BOM 自動展開，不開放手動修改。如有特殊需求請透過領退料單處理。
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Table
          bordered
          size="small"
          rowKey="materialCode"
          dataSource={listData}
          columns={itemColumns}
          pagination={false}
        />
      </div>
    </div>
  );
};
"""

with open('src/pages/production/workorders/WorkOrderItemsTab.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

