import { useState } from 'react';
import { Card, Typography, Switch, Tag } from 'antd';
import { z } from 'zod';
import { DynamicForm } from '../../components/Form/DynamicForm';
import type { FieldConfig } from '@/components/Form/types';

const { Title, Paragraph } = Typography;

interface DemoUserDto {
  username: string;
  departmentCode: string;
  status: 'Active' | 'Resigned';
  resignReason?: string;
  isManager: boolean;
  managerCode?: string;
  salary: number;
}

export default function FormDemo() {
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [submitData, setSubmitData] = useState<any>(null);

  // 【核心】：完全透過 Schema Config 定義 UI 與邏輯
  const formConfig: FieldConfig<DemoUserDto>[] = [
    {
      name: 'username',
      label: '員工姓名',
      componentType: 'Input',
      validation: z.string().min(1, '姓名不可為空'),
      updateDisabled: true, // ERP 需求：編輯模式下鎖定主鍵/重要資訊
    },
    {
      name: 'departmentCode',
      label: '所屬部門',
      componentType: 'Select',
      componentProps: {
        options: [
          { label: '研發部', value: 'RD' },
          { label: '業務部', value: 'SALES' }
        ]
      },
      validation: z.string().min(1, '請選擇部門'),
      onChange: ( _value, _ctx, setValue ) => {
        // 【狀態連動】：換部門時，清空直屬主管
        setValue('managerCode', undefined);
      }
    },
    {
      name: 'isManager',
      label: '是否為部門主管',
      componentType: 'Switch',
      // 【狀態控制】：當部門還沒選時，不能操作
      disabled: (ctx) => !ctx.values.departmentCode,
      onChange: ( value, _ctx, setValue ) => {
        if(value) setValue('managerCode', undefined); // 是主管就不用選上層主管
      }
    },
    {
      name: 'managerCode',
      label: '直屬主管',
      componentType: 'Select',
      // 【UI連動】：只有不是主管時，才需要顯示選直屬主管
      hidden: (ctx) => ctx.values.isManager,
      componentProps: (ctx) => {
        // 【資料連動】：根據部門動態給予主管選項
        const isRD = ctx.values.departmentCode === 'RD';
        return {
          options: isRD 
            ? [{ label: '張三 (RD主管)', value: 'M01' }]
            : [{ label: '李四 (業務主管)', value: 'M02' }],
          placeholder: '請選擇直屬主管',
          disabled: !ctx.values.departmentCode
        };
      },
      dynamicValidation: (ctx) => {
        // 【動態檢核】：不是主管時，必填直屬主管
        return !ctx.values.isManager 
          ? z.string().min(1, '非主管職必須設定直屬主管') 
          : z.any();
      }
    },
    {
      name: 'salary',
      label: '起薪設定',
      componentType: 'InputNumber',
      componentProps: { min: 0, step: 1000, prefix: '$' },
      validation: z.number().min(27470, '薪資不得低於基本工資 27,470'),
    },
    {
      name: 'status',
      label: '在職狀態',
      componentType: 'Select',
      componentProps: {
        options: [
          { label: '在職', value: 'Active' },
          { label: '離職', value: 'Resigned' }
        ]
      },
      validation: z.string().min(1, '請選擇狀態'),
    },
    {
      name: 'resignReason',
      label: '離職原因',
      componentType: 'Input',
      // 【UI連動】：狀態是離職才顯示
      hidden: (ctx) => ctx.values.status !== 'Resigned',
      // 【動態檢核】：離職時必填原因
      dynamicValidation: (ctx) => 
        ctx.values.status === 'Resigned' 
          ? z.string().min(1, '請填寫離職原因') 
          : z.any()
    }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Card className="shadow-md">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <Title level={4} className="m-0">單檔高彈性表單 (Single Table Dynamic Form)</Title>
          <div className="flex items-center bg-gray-50 p-2 rounded border">
            <span className="mr-2 text-gray-600 font-medium text-sm">模擬 Update 模式 (鎖定姓名):</span>
            <Switch checked={isUpdateMode} onChange={setIsUpdateMode} />
          </div>
        </div>

        <Paragraph type="secondary" className="mb-6">
          此範例展示了將 UI 組件、檢核邏輯 (Zod) 與狀態連動全部封裝於設定檔中。
          試著操作：<Tag>切換部門</Tag> <Tag>開關主管狀態</Tag> <Tag>切換離職狀態</Tag>，觀察連動與必填檢核的變化。
        </Paragraph>

        <DynamicForm<DemoUserDto>
          fields={formConfig}
          isUpdateMode={isUpdateMode}
          defaultValues={{
            status: 'Active',
            isManager: false,
            salary: 30000
          }}
          onSubmit={(data) => {
            setSubmitData(data);
          }}
        />

        {submitData && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <Title level={5} className="text-green-800">表單驗證成功！</Title>
            <pre className="text-sm">{JSON.stringify(submitData, null, 2)}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}
