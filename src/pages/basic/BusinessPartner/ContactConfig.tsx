import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';
import { Tag } from 'antd';

export const contactTableColumns = (): TableColumnConfig[] => [
  {
    label: '姓名',
    name: 'name',
    width: 120,
  },
  {
    label: '職能',
    name: 'functions',
    width: 200,
    render: (_, record: any) => {
      const tags = [];
      if (record.isSalesContact) tags.push(<Tag color="blue" key="sales">銷售</Tag>);
      if (record.isPurchasingContact) tags.push(<Tag color="green" key="purch">採購</Tag>);
      if (record.isOutsourcingContact) tags.push(<Tag color="purple" key="out">委外</Tag>);
      if (record.isAccountingContact) tags.push(<Tag color="orange" key="acc">財務</Tag>);
      return tags.length > 0 ? <div className="flex gap-1">{tags}</div> : <span className="text-gray-400">無</span>;
    }
  },
  {
    label: '職稱',
    name: 'jobTitle',
    width: 120,
  },
  {
    label: '電話',
    name: 'phone',
    width: 120,
  },
  {
    label: '分機',
    name: 'phoneExtension',
    width: 80,
  },
  {
    label: '行動電話',
    name: 'mobilePhone',
    width: 150,
  },
  {
    label: '電子郵件',
    name: 'email',
    width: 200,
  }
];

export const contactFormConfig = (): FormFieldConfig[] => [
  {
    name: 'name',
    label: '姓名',
    componentType: 'Input',
    editable: 'always',
    validation: z.string().min(1, '請輸入姓名'),
    colSpan: 4,
  },
  {
    name: 'jobTitle',
    label: '職稱',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'phone',
    label: '電話',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'phoneExtension',
    label: '分機',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'mobilePhone',
    label: '行動電話',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'email',
    label: '電子郵件',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'isSalesContact',
    label: '銷售/客戶聯絡人',
    componentType: 'Switch',
    editable: 'always',
    group: '職能設定',
    colSpan: 4,
  },
  {
    name: 'isPurchasingContact',
    label: '採購/原料商聯絡人',
    componentType: 'Switch',
    editable: 'always',
    group: '職能設定',
    colSpan: 4,
  },
  {
    name: 'isOutsourcingContact',
    label: '委外加工聯絡人',
    componentType: 'Switch',
    editable: 'always',
    group: '職能設定',
    colSpan: 4,
  },
  {
    name: 'isAccountingContact',
    label: '財務對帳聯絡人',
    componentType: 'Switch',
    editable: 'always',
    group: '職能設定',
    colSpan: 4,
  },
  {
    name: 'address',
    label: '地址',
    componentType: 'Input',
    editable: 'always',
    colSpan: 1,
  },
  {
    name: 'notes',
    label: '備註',
    componentType: 'TextArea',
    editable: 'always',
    colSpan: 1,
  },
];
