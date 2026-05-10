import { Tag } from 'antd';
import type { SearchFieldConfig } from '@/components/Form/types';
import type { ColumnsType } from 'antd/es/table';
import type { OrderDto, OrderItemDto } from '@/api/generated/types.gen';
import dayjs from 'dayjs';

export const searchConfig: SearchFieldConfig[] = [
  {
    name: 'orderNumber',
    label: '訂單號碼',
    componentType: 'Input',
    colSpan: 3,
  },
  {
    name: 'businessPartnerCode',
    label: '客戶',
    componentType: 'AsyncSelect',
    componentProps: { configKey: 'CUSTOMER' },
    colSpan: 3,
  },
  {
    name: 'status',
    label: '狀態',
    componentType: 'DictSelect',
    componentProps: { dictKey: 'ORDER_STATUS' },
    colSpan: 3,
  },
  {
    name: 'orderDate',
    label: '訂單日期',
    componentType: 'DateRangePicker',
    colSpan: 3,
  },
];

export const getColumns = (): ColumnsType<OrderDto> => [
  {
    title: '訂單號碼',
    dataIndex: 'orderNumber',
    key: 'orderNumber',
    width: 150,
  },
  {
    title: '狀態',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        Draft: 'default',
        Confirmed: 'processing',
        Finished: 'success',
      };
      const textMap: Record<string, string> = {
        Draft: '草稿',
        Confirmed: '已確認',
        Finished: '已結案',
      };
      return <Tag color={colorMap[status] || 'default'}>{textMap[status] || status}</Tag>;
    },
  },
  {
    title: '客戶代碼',
    dataIndex: 'businessPartnerCode',
    key: 'businessPartnerCode',
    width: 120,
  },
  {
    title: '客戶名稱',
    dataIndex: 'businessPartnerName',
    key: 'businessPartnerName',
    width: 200,
  },
  {
    title: '訂單日期',
    dataIndex: 'orderDate',
    key: 'orderDate',
    width: 120,
    render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
  },
  {
    title: '要求交期',
    dataIndex: 'requestedDeliveryDate',
    key: 'requestedDeliveryDate',
    width: 120,
    render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
  },
  {
    title: '客戶採購單號',
    dataIndex: 'customerPoNumber',
    key: 'customerPoNumber',
    width: 150,
  },
  {
    title: '總金額',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 120,
    align: 'right',
    render: (val: number) => (val != null ? val.toLocaleString() : '-'),
  },
];

export const getFormConfig = (): any[] => [
  {
    name: 'orderNumber',
    label: '訂單號碼',
    componentType: 'Input',
    colSpan: 2,
    editable: 'never',
  },
  {
    name: 'orderDate',
    label: '訂單日期',
    componentType: 'DatePicker',
    colSpan: 2,
    validation: {} as any, // FIXME
  },
  {
    name: 'businessPartnerCode',
    label: '客戶',
    componentType: 'AsyncSelect',
    componentProps: { configKey: 'CUSTOMER' },
    colSpan: 2,
    validation: {} as any, // FIXME
  },
  {
    name: 'partnerContactId',
    label: '聯絡人',
    componentType: 'AsyncSelect',
    componentProps: { configKey: 'CUSTOMER_CONTACT' },
    
    colSpan: 2,
  },
  {
    name: 'customerPoNumber',
    label: '客戶採購單號',
    componentType: 'Input',
    colSpan: 2,
  },
  {
    name: 'salespersonEmployeeCode',
    label: '業務員',
    componentType: 'DictSelect',
    componentProps: { dictKey: 'EMPLOYEE' },
    colSpan: 2,
  },
  {
    name: 'paymentTerms',
    label: '付款條件',
    componentType: 'Input',
    colSpan: 2,
  },
  {
    name: 'shippingAddress',
    label: '送貨地址',
    componentType: 'Input',
    colSpan: 2,
  },
  {
    name: 'requestedDeliveryDate',
    label: '要求交期',
    componentType: 'DatePicker',
    colSpan: 2,
  },
  {
    name: 'promisedDeliveryDate',
    label: '承諾交期',
    componentType: 'DatePicker',
    colSpan: 2,
  },
  {
    name: 'tag',
    label: '標籤',
    componentType: 'Input',
    colSpan: 2,
  },
  {
    name: 'notes',
    label: '備註',
    componentType: 'TextArea',
    colSpan: 1,
  },
];

export const getItemColumns = (isViewMode: boolean, onEdit: (record: OrderItemDto) => void, onDelete: (record: OrderItemDto) => void): ColumnsType<OrderItemDto> => [
  {
    title: '操作',
    key: 'action',
    width: 100,
    fixed: 'left',
    render: (_, record) => {
      if (isViewMode) return null;
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <a onClick={() => onEdit(record)}>編輯</a>
          <a style={{ color: 'red' }} onClick={() => onDelete(record)}>刪除</a>
        </div>
      );
    },
  },
  { title: '行號', dataIndex: 'lineNumber', width: 80 },
  { title: '類型', dataIndex: 'goodsType', width: 100, render: (val) => val === 'P' ? '產品' : val === 'M' ? '原物料' : '其他' },
  { title: '編碼', dataIndex: 'goodsCode', width: 150 },
  { title: '名稱', dataIndex: 'goodsName', width: 200 },
  { title: '客戶產品代碼', dataIndex: 'customerProductId', width: 150 },
  { title: '數量', dataIndex: 'quantity', width: 100, align: 'right' },
  { title: '單價', dataIndex: 'unitPrice', width: 100, align: 'right' },
  { title: '小計', dataIndex: 'lineAmount', width: 100, align: 'right' },
  { title: '要求交期', dataIndex: 'requestedDeliveryDate', width: 120, render: (d) => d ? dayjs(d).format('YYYY-MM-DD') : '-' },
];

export const getItemFormConfig = (): any[] => [
  {
    name: 'goodsType',
    label: '商品類型',
    componentType: 'DictSelect',
    componentProps: { dictKey: 'PRODUCT_TYPE' },
    colSpan: 2,
    validation: {} as any, // FIXME
  },
  {
    name: 'goodsCode',
    label: '商品編碼',
    componentType: 'AsyncSelect',
    componentProps: { configKey: 'PRODUCT' }, // Will be dynamic based on type
    colSpan: 2,
    validation: {} as any, // FIXME
  },
  { name: 'customerProductId', label: '客戶產品代碼', componentType: 'Input', colSpan: 2 },
  { name: 'quantity', label: '數量', componentType: 'InputNumber', colSpan: 2 },
  { name: 'unitPrice', label: '單價', componentType: 'InputNumber', colSpan: 2 },
  { name: 'spareQuantity', label: '備品數量', componentType: 'InputNumber', colSpan: 2 },
  { name: 'requestedDeliveryDate', label: '要求交期', componentType: 'DatePicker', colSpan: 2 },
  { name: 'promisedDeliveryDate', label: '承諾交期', componentType: 'DatePicker', colSpan: 2 },
  { name: 'isOutsource', label: '是否委外', componentType: 'Switch', colSpan: 2 },
  { name: 'priority', label: '優先順序', componentType: 'Input', colSpan: 2 },
  { name: 'notes', label: '備註', componentType: 'TextArea', colSpan: 1 },
];
