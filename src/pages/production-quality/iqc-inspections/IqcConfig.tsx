import type { TableColumnConfig } from '@/components/Form/types';
import { Tag } from 'antd';
import dayjs from 'dayjs';

export const iqcSearchConfig = (): any[] => [
  {
    name: 'iqcRecordId',
    label: '品檢單號',
    componentType: 'Input',
    colSpan: 2,
  },
  {
    name: 'lotNo',
    label: '批次代碼',
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
        { label: '加嚴全檢中 (FullInspecting)', value: 'FullInspecting' },
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
      return { color: "gold", text: "特採審核中" };
    case "CONCESSIONAPPROVED":
      return { color: "cyan", text: "特採核准入庫" };
    case "PARTIAL":
      return { color: "orange", text: "部分入庫" };
    case "REJECT":
      return { color: "error", text: "全部退回" };
    case "FULLINSPECTING":
      return { color: "processing", text: "加嚴全檢中" };
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
  { label: '批次代碼', name: 'lotNo', sortable: { multiple: 2 }, width: 130 },
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
    label: '判定狀態', 
    name: 'inspectionStatus', 
    sortable: { multiple: 3 },
    width: 110,
    align: 'center',
    render: (status: string) => getStatusTag(status)
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
