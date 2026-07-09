import React from "react";
import { Modal, Table, Tag, Button, Typography, App } from "antd";
import { useQuery } from "@tanstack/react-query";
import { getApiV1WorkOrderRequisitionSelectableRolls } from "@/api/generated/sdk.gen";
import { buildTableColumns } from "@/utils/tableUtils";

interface RollSubstitutionPickerProps {
  visible: boolean;
  materialCode: string;
  requiredWidth?: number;
  selectedRollNos: string[];
  onCancel: () => void;
  onSelect: (selectedRolls: any[]) => void;
}

export const RollSubstitutionPicker: React.FC<RollSubstitutionPickerProps> = ({
  visible,
  materialCode,
  requiredWidth,
  selectedRollNos,
  onCancel,
  onSelect,
}) => {
  const { message } = App.useApp();
  const [localSelectedRowKeys, setLocalSelectedRowKeys] = React.useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (visible) {
      setLocalSelectedRowKeys(selectedRollNos);
    }
  }, [visible, selectedRollNos]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["selectable-rolls", materialCode, requiredWidth],
    queryFn: () => getApiV1WorkOrderRequisitionSelectableRolls({
      query: {
        materialCode,
        requiredWidth: requiredWidth || undefined,
      } as any
    }),
    enabled: visible && !!materialCode,
  });

  const list = (response?.data as any)?.data || [];

  const columns = [
    {
      title: "物料卡號 (LPN)",
      dataIndex: "rollNo",
      key: "rollNo",
      width: 200,
    },
    {
      title: "批次號",
      dataIndex: "lotNo",
      key: "lotNo",
      width: 150,
    },
    {
      title: "剩餘長度 (M)",
      dataIndex: "currentQtyAux",
      key: "currentQtyAux",
      width: 120,
      render: (v: number) => <strong>{v?.toFixed(2)}</strong>,
    },
    {
      title: "原始長度 (M)",
      dataIndex: "originalQtyAux",
      key: "originalQtyAux",
      width: 120,
      render: (v: number) => <span className="text-gray-400">{v?.toFixed(2)}</span>,
    },
    {
      title: "寬度 (mm)",
      dataIndex: "widthMm",
      key: "widthMm",
      width: 100,
      render: (v: number) => `${v} mm`,
    },
    {
      title: "厚度 (mm)",
      dataIndex: "measuredThicknessMm",
      key: "measuredThicknessMm",
      width: 100,
      render: (v: number) => v != null ? `${v} mm` : "-",
    },
    {
      title: "匹配判定",
      dataIndex: "matchStatus",
      key: "matchStatus",
      width: 140,
      render: (status: string) => {
        if (status === "Exact") {
          return <Tag color="success">🟢 完全符合 (Exact)</Tag>;
        } else if (status === "Wider") {
          return <Tag color="orange">🟡 寬度替代 (Wider)</Tag>;
        } else {
          return <Tag color="error">🔴 寬度不足 (窄)</Tag>;
        }
      },
    },
  ];

  const handleRowSelectionChange = (_newSelectedRowKeys: React.Key[], selectedRowsList: any[]) => {
    const validKeys: React.Key[] = [];
    const validRows: any[] = [];

    selectedRowsList.forEach((row) => {
      if (row.matchStatus !== "Narrower") {
        validKeys.push(row.rollNo);
        validRows.push(row);
      } else {
        message.warning(`物料卡 ${row.rollNo} 寬度不足，無法領用！`);
      }
    });

    setLocalSelectedRowKeys(validKeys);
    setSelectedRows(validRows);
  };

  const handleOk = () => {
    onSelect(selectedRows);
    onCancel();
  };

  return (
    <Modal
      title={
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            🔮 智慧領料：一卷一卡 LPN 挑選器
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
            原料代碼：{materialCode} {requiredWidth ? `| 需求規格寬度: ${requiredWidth} mm` : ""}
          </Typography.Text>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={1000}
      centered
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="ok" type="primary" onClick={handleOk} disabled={localSelectedRowKeys.length === 0}>
          確認選中 ({localSelectedRowKeys.length}) 卷
        </Button>,
      ]}
    >
      <div style={{ marginTop: "12px" }}>
        <Table
          loading={isLoading}
          dataSource={list}
          columns={buildTableColumns(columns as any)}
          rowKey="rollNo"
          size="small"
          pagination={false}
          scroll={{ y: 380 }}
          rowSelection={{
            type: "checkbox",
            selectedRowKeys: localSelectedRowKeys,
            onChange: handleRowSelectionChange,
            getCheckboxProps: (record: any) => ({
              disabled: record.matchStatus === "Narrower",
              name: record.rollNo as string,
            }),
          }}
        />
      </div>
    </Modal>
  );
};
