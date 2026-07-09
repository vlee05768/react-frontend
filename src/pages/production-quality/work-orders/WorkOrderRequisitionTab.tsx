import React, { useState } from "react";
import { Table, Button, Tag, Space } from "antd";
import { PlusOutlined, EyeOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { getApiV1WorkOrderRequisitionWoByWorkOrderNumber } from "@/api/generated/sdk.gen";
import { buildTableColumns } from "@/utils/tableUtils";
import { WorkOrderRequisitionDrawer } from "./WorkOrderRequisitionDrawer";
import type { WorkOrderDto } from "@/api/generated/types.gen";

interface WorkOrderRequisitionTabProps {
  masterData: WorkOrderDto;
}

export const WorkOrderRequisitionTab: React.FC<WorkOrderRequisitionTabProps> = ({
  masterData,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDocNo, setSelectedDocNo] = useState<string | null>(null);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ["requisitions", masterData.workOrderNumber],
    queryFn: () => getApiV1WorkOrderRequisitionWoByWorkOrderNumber({
      path: { workOrderNumber: masterData.workOrderNumber! },
    }),
    enabled: !!masterData.workOrderNumber,
  });

  const list = (response?.data as any)?.data || [];

  const handleOpenCreate = () => {
    setSelectedDocNo(null);
    setDrawerOpen(true);
  };

  const handleOpenDetail = (docNo: string) => {
    setSelectedDocNo(docNo);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: "領料單號",
      dataIndex: "documentNumber",
      key: "documentNumber",
      width: 150,
      render: (v: string) => (
        <Button type="link" onClick={() => handleOpenDetail(v)} style={{ padding: 0 }}>
          {v}
        </Button>
      ),
    },
    {
      title: "單據日期",
      dataIndex: "documentDate",
      key: "documentDate",
      width: 120,
    },
    {
      title: "狀態",
      dataIndex: "confirmDate",
      key: "confirmDate",
      width: 130,
      render: (confirmDate: string) => {
        return confirmDate ? (
          <Tag color="success">🟢 已確認過帳</Tag>
        ) : (
          <Tag color="default">⚪ 草稿 (Draft)</Tag>
        );
      },
    },
    {
      title: "建立人員",
      dataIndex: "createdBy",
      key: "createdBy",
      width: 100,
    },
    {
      title: "備註說明",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: any, rec: any) => {
        const isDraft = !rec.confirmDate;
        return (
          <Space size="middle">
            <Button
              size="small"
              icon={isDraft ? <EditOutlined /> : <EyeOutlined />}
              onClick={() => handleOpenDetail(rec.documentNumber)}
            >
              {isDraft ? "編輯" : "詳情"}
            </Button>
          </Space>
        );
      },
    },
  ];

  // 整理製令的應發料號列表，傳入 drawer 用來做防呆限制
  const materialsList = Array.isArray(masterData.items)
    ? masterData.items.map((x: any) => ({
        materialCode: x.materialCode,
        materialName: x.materialName,
        materialForm: x.materialForm,
        widthMm: x.materialWidth, // 寬度規格
      }))
    : [];

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4 py-2 px-3" style={{ backgroundColor: "var(--ant-color-fill-alter)", borderRadius: "6px" }}>
        <div style={{ color: "var(--ant-color-text-secondary)" }}>
          此製令累計已建立 <span>{list.length}</span> 張領料單
        </div>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          🆕 新增製令領料單
        </Button>
      </div>

      <Table
        loading={isLoading}
        dataSource={list}
        columns={buildTableColumns(columns as any)}
        rowKey="documentNumber"
        size="small"
        bordered
        pagination={false}
      />

      <WorkOrderRequisitionDrawer
        open={drawerOpen}
        documentNumber={selectedDocNo}
        workOrderNumber={masterData.workOrderNumber!}
        materialsList={materialsList}
        onClose={() => {
          setDrawerOpen(false);
          refetch();
        }}
      />
    </div>
  );
};
