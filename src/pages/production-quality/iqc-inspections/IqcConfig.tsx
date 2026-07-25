import type { TableColumnConfig } from '@/components/Form/types';
import { Tag, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { AsyncSelect } from '@/components/Form/AsyncSelect';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getApiV1Employee } from '@/api/generated';

const EmployeeSelect: React.FC<{
  value?: string;
  disabled?: boolean;
  onChange?: (val: string) => void;
}> = ({ value, disabled, onChange }) => {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const res = await getApiV1Employee({
        query: { pageSize: -1 } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const options = useMemo(() => {
    if (!employees) return [];
    return employees
      .filter((e: any) => e.status === "Active" || e.status === "正常" || e.status === 1 || !e.status)
      .map((e: any) => ({
        label: `${e.name} (${e.employeeNo})`,
        value: e.employeeNo,
      }));
  }, [employees]);

  return (
    <Select
      showSearch
      loading={isLoading}
      placeholder="請選擇品檢人員"
      value={value || undefined}
      disabled={disabled}
      onChange={onChange}
      options={options}
      optionFilterProp="label"
      className="w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
    />
  );
};

export const iqcSearchConfig = (): any[] => [
  {
    name: 'iqcRecordId',
    label: '品檢單號',
    componentType: 'Input',
    colSpan: 2,
  },
  {
    name: 'inspectionStatus',
    label: '品檢判定',
    componentType: 'Select',
    componentProps: {
      options: [
        { label: '待檢驗 (Pending)', value: 'Pending' },
        { label: '檢驗中 (FullInspecting)', value: 'FullInspecting' },
        { label: '全部通過 (AllPass)', value: 'AllPass' },
        { label: '部分入庫 (Partial)', value: 'Partial' },
        { label: '全部退回 (Reject)', value: 'Reject' },
      ],
      allowClear: true,
    },
    colSpan: 2,
  },
  {
    name: 'materialCode',
    label: '物料料號',
    componentType: 'Input',
    colSpan: 2,
  },
  {
    name: 'checkDateRange',
    label: '品檢時間區間',
    componentType: 'DateRangePicker',
    colSpan: 2,
  },
  {
    name: 'inspectorId',
    label: '品檢人員',
    componentType: 'Input',
    colSpan: 2,
  },
];

export const getStatusTagProps = (status?: string | null) => {
  if (!status) return { color: "warning", text: "待檢驗" };
  switch (status.toUpperCase()) {
    case "ALLPASS":
      return { color: "success", text: "全部通過" };
    case "CONCESSIONPENDING":
      return { color: "error", text: "特採審核中" };
    case "CONCESSIONAPPROVED":
      return { color: "cyan", text: "特採核准入庫" };
    case "PARTIAL":
      return { color: "orange", text: "部分入庫" };
    case "REJECT":
      return { color: "error", text: "全部退回" };
    case "FULLINSPECTING":
      return { color: "processing", text: "檢驗中" };
    case "PENDING":
    default:
      return { color: "warning", text: "待檢驗" };
  }
};

export const getStatusTag = (status?: string | null) => {
  const props = getStatusTagProps(status);
  return <Tag color={props.color}>{props.text}</Tag>;
};

export const mainTableColumns = (): TableColumnConfig[] => [
  { label: '品檢單號', name: 'iqcRecordId', sortable: { multiple: 1 }, width: 140 },
  { label: '關聯進貨單', name: 'sourceDocNumber', width: 130 },
  { 
    label: '判定狀態', 
    name: 'inspectionStatus', 
    sortable: { multiple: 2 },
    width: 110,
    align: 'center',
    render: (status: string) => getStatusTag(status)
  },
  { 
    label: '料號', 
    name: 'materialCode', 
    width: 140,
    render: (val: string, record: any) => {
      const isRoll = record.materialForm === 'R';
      return (
        <span style={{ color: isRoll ? '#1677ff' : '#d46b08', fontWeight: 'bold' }}>
          {val}
        </span>
      );
    }
  },
  { 
    label: '型態', 
    name: 'materialForm', 
    width: 80,
    align: 'center',
    render: (form: string) => {
      if (form === 'R') {
        return <Tag color="blue" style={{ fontWeight: 'bold' }}>卷料</Tag>;
      } else if (form === 'S') {
        return <Tag color="orange" style={{ fontWeight: 'bold' }}>片料</Tag>;
      }
      return <Tag color="default">{form || '-'}</Tag>;
    }
  },
  { label: '原料名稱', name: 'materialName', width: 180, ellipsis: true },
  { 
    label: '到貨總量', 
    name: 'totalQty', 
    width: 110, 
    align: 'right',
    render: (val: number, record: any) => {
      const unit = record.materialForm === 'R' ? 'M' : 'PCS';
      return (
        <span className="font-bold text-emerald-600">
          {(val || 0).toLocaleString()} {unit}
        </span>
      );
    }
  },
  { 
    label: '抽樣/不合格卷數', 
    name: 'sampleSize', 
    width: 130, 
    align: 'center',
    render: (_, record: any) => {
      if (record.inspectionStatus === 'Pending') return '-';
      return `${record.sampleSize} 抽 / ${record.defectQty} 異常`;
    }
  },
  { 
    label: '品檢時間', 
    name: 'checkDate', 
    width: 140,
    render: (val: string, record: any) => {
      if (record.inspectionStatus === 'Pending') return '待檢';
      return val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-';
    }
  },
];

export const getIqcFormFields = (ctx: {
  isRollMaterial: boolean;
  isReadOnly: boolean;
  setRolls: React.Dispatch<React.SetStateAction<any[]>>;
  detail: any;
  inspectorId: string;
  setInspectorId: (val: string) => void;
  headerCoreDia: number | null;
  setHeaderCoreDia: (val: number | null) => void;
  incomingStorageCode: string;
  setIncomingStorageCode: (val: string) => void;
  totalLength: number;
}): any[] => {
  const {
    isRollMaterial,
    isReadOnly,
    setRolls,
    detail,
    inspectorId,
    setInspectorId,
    headerCoreDia,
    setHeaderCoreDia,
    incomingStorageCode,
    setIncomingStorageCode,
    totalLength
  } = ctx;

  return [
    {
      name: "iqcRecordId",
      label: "品檢單號",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "sourceDocNumber",
      label: "來源進貨單號",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "poLineNumber",
      label: "關聯採購項次",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },

    {
      name: "supplierCode",
      label: "供應商",
      componentType: "Custom",
      colSpan: 4,
      customRender: () => (
        <Input
          value={
            detail?.supplierCode
              ? `[${detail.supplierCode}] ${detail.supplierName || ""}`
              : ""
          }
          disabled
          className="w-full text-[var(--ant-color-text)] font-semibold"
        />
      ),
    },
    {
      name: "materialCode",
      label: "物料編碼",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "materialName",
      label: "物料名稱",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "inspectorId",
      label: "品檢人員工代碼",
      componentType: "Custom",
      colSpan: 4,
      required: true,
      customRender: (props: any) => (
        <EmployeeSelect
          value={props.value || inspectorId}
          disabled={isReadOnly}
          onChange={(val) => {
            setInspectorId(val);
            props.onChange(val);
          }}
        />
      ),
    },
    {
      name: "standardThickness",
      label: "標準厚度 (mm)",
      componentType: "InputNumber",
      editable: "never",
      colSpan: 6,
      componentProps: {
        className: "text-right",
      },
    },
    {
      name: "standardWidth",
      label: "標準寬度 (mm)",
      componentType: "InputNumber",
      editable: "never",
      colSpan: 6,
      componentProps: {
        className: "text-right",
      },
    },
    {
      name: "standardLength",
      label: isRollMaterial ? "標準長度 (M)" : "標準長度 (mm)",
      componentType: "InputNumber",
      editable: "never",
      colSpan: 6,
      componentProps: {
        className: "text-right",
      },
    },
    {
      name: "rollCount",
      label: isRollMaterial ? "到貨總卷數" : "數量",
      componentType: "InputNumber",
      editable: "never",
      colSpan: 6,
      componentProps: {
        className: "text-right",
      },
    },
    {
      name: "totalActualQty",
      label: isRollMaterial ? "到貨總長度" : "到貨總張數",
      componentType: "Custom",
      colSpan: 6,
      customRender: () => (
        <Input
          value={`${totalLength.toLocaleString()} ${isRollMaterial ? "M" : "PCS"}`}
          disabled
          className="w-full text-[var(--ant-color-text)] font-semibold text-right"
        />
      ),
    },
    {
      name: "measuredCoreDiaMm",
      label: "內管芯外徑 (mm)",
      componentType: "Custom",
      colSpan: 6,
      hidden: !isRollMaterial,
      customRender: (props: any) => (
        <InputNumber
          value={props.value !== undefined ? props.value : headerCoreDia}
          disabled={isReadOnly || !isRollMaterial}
          precision={1}
          style={{ width: "100%" }}
          className="w-full text-right"
          onChange={(val) => {
            const numVal = val != null ? Number(val) : null;
            setHeaderCoreDia(numVal);
            props.onChange(numVal);
            
            setRolls((prevRolls) =>
              prevRolls.map((r) => {
                const updatedItems = r.inspectionItems.map((i: any) => {
                  if (i.itemCode === "core_dia") {
                    return { ...i, measuredValue: numVal !== null ? String(numVal) : "" };
                  }
                  return i;
                });
                return {
                  ...r,
                  measuredCoreDiaMm: numVal,
                  inspectionItems: updatedItems,
                };
              }),
            );
          }}
        />
      ),
    },
    {
      name: "materialForm",
      label: "材料型態",
      componentType: "Select",
      editable: "never",
      colSpan: 6,
      componentProps: {
        options: [
          { label: "捲材 (Coil)", value: "R" },
          { label: "片材 (Sheet)", value: "S" },
        ],
      },
    },    
    {
      name: "incomingStorageCode",
      label: "入庫儲位",
      componentType: "Custom",
      colSpan: 4,
      required: true,
      customRender: (props: any) => (
        <AsyncSelect
          configKey="STORAGE"
          placeholder="請選擇入庫儲位"
          value={props.value || incomingStorageCode}
          disabled={isReadOnly}
          className="w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
          onChange={(val) => {
            setIncomingStorageCode(val || "");
            props.onChange(val || "");
          }}
          allowClear
        />
      ),
    },
  ];
};
