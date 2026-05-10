import { z } from 'zod';
import { Tag, Button, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { SearchFieldConfig } from '@/components/Form/types';
import type { ColumnsType } from 'antd/es/table';
import type { OrderDto, OrderItemDto } from '@/api/generated/types.gen';
import dayjs from 'dayjs';
import { ContactSelectWithCreate } from './components/ContactSelectWithCreate';

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
    title: '訂單編號',
    dataIndex: 'orderNumber',
    key: 'orderNumber',
    width: 150,
  },
  {
    title: '訂單日期',
    dataIndex: 'orderDate',
    key: 'orderDate',
    width: 120,
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
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
    width: 180,
    ellipsis: true,
  },
  {
    title: '訂單狀態',
    dataIndex: 'status',
    key: 'status',
    width: 100,
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
    title: '小計',
    dataIndex: 'subTotal',
    key: 'subTotal',
    width: 120,
    align: 'right',
    render: (val: number) => val != null ? Number(val.toFixed(2)).toLocaleString() : '0',
  },
  {
    title: '稅額',
    dataIndex: 'taxAmount',
    key: 'taxAmount',
    width: 100,
    align: 'right',
    render: (val: number) => val != null ? Number(val.toFixed(2)).toLocaleString() : '0',
  },
  {
    title: '總金額',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 120,
    align: 'right',
    render: (val: number) => val != null ? Number(val.toFixed(2)).toLocaleString() : '0',
  },
  {
    title: '交貨日期',
    dataIndex: 'requestedDeliveryDate',
    key: 'requestedDeliveryDate',
    width: 120,
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
  },
  {
    title: '承諾交貨日期',
    dataIndex: 'promisedDeliveryDate',
    key: 'promisedDeliveryDate',
    width: 140,
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
  },
  {
    title: '備註',
    dataIndex: 'notes',
    key: 'notes',
    ellipsis: true,
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
    validation: z.any().optional(),
  },
  {
    name: 'businessPartnerCode',
    label: '客戶',
    componentType: 'AsyncSelect',
    componentProps: { configKey: 'CUSTOMER' },
    editable: 'createOnly',
    onChange: (_value: any, _context: any, setValue: any, ...args: any[]) => {
      // 若變更了客戶，則清空聯絡人
      setValue('partnerContactId', undefined);
      
      const option = args[1];
      if (option && option.originalData) {
        const bp = option.originalData;
        if (bp.address) setValue('shippingAddress', bp.address);
        if (bp.paymentTerms) setValue('paymentTerms', bp.paymentTerms);
      }
    },
    colSpan: 2,
    validation: z.string().min(1, '客戶為必填'),
  },
  {
    name: 'partnerContactId',
    label: '聯絡人',
    componentType: 'Custom',
    customRender: (field: any, context: any, _setValue: any) => (
      <ContactSelectWithCreate
        value={field.value}
        onChange={field.onChange}
        disabled={field.disabled}
        businessPartnerCode={context.values.businessPartnerCode}
      />
    ),
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
    width: 80,
    align: 'center',
    fixed: 'left',
    render: (_, record) => {
      if (isViewMode) return null;
      return (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onDelete(record)} />
        </Space>
      );
    },
  },
  { title: '行號', dataIndex: 'lineNumber', width: 60, align: 'center' },
  { title: '類型', dataIndex: 'goodsType', width: 80, align: 'center', render: (val) => val === 'P' ? '產品' : val === 'M' ? '原物料' : '其他' },
  { title: '編碼', dataIndex: 'goodsCode', width: 140, align: 'center' },
  { title: '名稱', dataIndex: 'goodsName', width: 220, ellipsis: true },
  { title: '客戶產品代碼', dataIndex: 'customerProductId', width: 140, align: 'center' },
  { title: '數量', dataIndex: 'quantity', width: 100, align: 'right' },
  { title: '單價', dataIndex: 'unitPrice', width: 100, align: 'right' },
  { title: '小計', dataIndex: 'lineAmount', width: 100, align: 'right' },
  { title: '要求交期', dataIndex: 'requestedDeliveryDate', width: 120, align: 'center', render: (d) => d ? dayjs(d).format('YYYY-MM-DD') : '-' },
];

export const getItemFormConfig = (): any[] => [
  {
    name: 'goodsType',
    label: '商品類型',
    componentType: 'DictSelect',
    componentProps: { dictKey: 'PRODUCT_TYPE' },
    colSpan: 2,
    validation: z.string().optional(),
  },
  {
    name: 'goodsCode',
    label: '商品編碼',
    componentType: 'AsyncSelect',
    componentProps: { configKey: 'PRODUCT' }, // Will be dynamic based on type
    colSpan: 2,
    validation: z.string().optional(),
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
