import React from "react";
import { Table } from "antd";
import type { WorkOrderDto, WorkOrderMaterialDto } from "@/api/generated/types.gen";
import { itemColumns } from "./WorkOrderConfig";
import { buildTableColumns } from "@/utils/tableUtils";

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
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4 p-[8px 12px]" style={{backgroundColor: 'var(--ant-color-fill-alter)', borderRadius: '6px'
      }}>
        <div style={{ color: 'var(--ant-color-text-secondary)' }}>
          目前共有 <span>{listData.length}</span> 筆應發料資料
        </div>
        <div style={{ color: 'var(--ant-color-text-description)', fontSize: '12px' }}>
          * 備料明細為系統根據 BOM 自動展開，不開放手動修改。如有特殊需求請透過領退料單處理。
        </div>
      </div>

      <div>
        <Table
          virtual
          scroll={{ x: 1200, y: 400 }}
          bordered
          size="small"
          rowKey="materialCode"
          dataSource={listData}
          columns={buildTableColumns(itemColumns)}
          pagination={false}
        />
      </div>
    </div>
  );
};
