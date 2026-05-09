
import { Form, Input, Select, DatePicker, InputNumber, Switch, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import type { SearchFieldConfig } from './types';
import { DictSelect } from './DictSelect';
import { AsyncSelect } from './AsyncSelect';

const { RangePicker } = DatePicker;

interface DynamicSearchFormProps {
  config: SearchFieldConfig[];
  form: FormInstance;
  onSearch?: (values: any) => void;
  layout?: 'horizontal' | 'vertical' | 'inline';
}

export default function DynamicSearchForm({ config, form, onSearch, layout = 'vertical' }: DynamicSearchFormProps) {
  const renderComponent = (field: SearchFieldConfig) => {
    const props = field.componentProps || {};
    
    switch (field.componentType) {
      case 'Input':
        return <Input placeholder={`請輸入${field.label}`} allowClear {...props} />;
      case 'TextArea':
        return <Input.TextArea placeholder={`請輸入${field.label}`} allowClear {...props} />;
      case 'Select':
        return <Select placeholder={`請選擇${field.label}`} allowClear {...props} />;
      case 'DictSelect':
        return <DictSelect placeholder={`請選擇${field.label}`} allowClear {...(props as any)} />;
      case 'AsyncSelect':
        return <AsyncSelect placeholder={`請搜尋並選擇${field.label}`} allowClear {...(props as any)} />;
      case 'InputNumber':
        return <InputNumber placeholder={`請輸入${field.label}`} className="w-full" {...props} />;
      case 'DatePicker':
        return <DatePicker className="w-full" {...props} />;
      case 'DateRangePicker':
        return <RangePicker className="w-full" {...props} />;
      case 'Switch':
        return <Switch {...props} />;
      case 'Custom':
      default:
        return <Input placeholder={`請輸入${field.label}`} allowClear {...props} />;
    }
  };

  return (
    <Form 
      form={form} 
      layout={layout}
      onFinish={onSearch}
      initialValues={config.reduce((acc, curr) => {
        if (curr.defaultValue !== undefined) acc[curr.name] = curr.defaultValue;
        return acc;
      }, {} as Record<string, any>)}
    >
      <Row gutter={16}>
        {config.map((field) => {
          // 根據 DynamicForm 邏輯：colSpan 代表「一行幾欄」，將 form 分為 12 個 cell
          const columnsPerRow = Math.max(1, Math.min(12, field.colSpan || 4));
          const cells = 12 / columnsPerRow;
          const antSpan = Math.max(2, Math.min(24, Math.floor(cells * 2)));

          return (
            <Col span={antSpan} key={field.name}>
              <Form.Item 
                name={field.name} 
                label={field.label}
                valuePropName={field.componentType === 'Switch' ? 'checked' : 'value'}
              >
                {renderComponent(field)}
              </Form.Item>
            </Col>
          );
        })}
      </Row>
    </Form>
  );
}
