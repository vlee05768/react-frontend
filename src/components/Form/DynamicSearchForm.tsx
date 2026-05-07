
import { Form, Input, Select, DatePicker, InputNumber, Switch, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import type { SearchFieldConfig } from './types';
import { DictSelect } from './DictSelect';

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
        {config.map((field) => (
          <Col span={field.colSpan || 24} key={field.name}>
            <Form.Item 
              name={field.name} 
              label={field.label}
              valuePropName={field.componentType === 'Switch' ? 'checked' : 'value'}
            >
              {renderComponent(field)}
            </Form.Item>
          </Col>
        ))}
      </Row>
    </Form>
  );
}
