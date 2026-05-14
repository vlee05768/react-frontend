import { Form, Row, Col, Input, Select, DatePicker, InputNumber, Switch } from 'antd';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { SearchFieldConfig } from './types';
import { DictSelect } from './DictSelect';
import { AsyncSelect } from './AsyncSelect';

const { RangePicker } = DatePicker;

interface DynamicSearchFormProps {
  config: SearchFieldConfig[];
  form: UseFormReturn<any>;
  onSearch?: (values: any) => void;
  layout?: 'horizontal' | 'vertical' | 'inline';
  id?: string;
}

export default function DynamicSearchForm({ config, form, onSearch, layout = 'vertical', id = 'search-form' }: DynamicSearchFormProps) {
  const { control, handleSubmit } = form;

  const renderComponent = (field: SearchFieldConfig, onChange: any, value: any, ref: any) => {
    const props = { ...(field.componentProps || {}), onChange, value, ref };
    
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
        return <Switch checked={value} {...props} />;
      case 'Custom':
      default:
        return <Input placeholder={`請輸入${field.label}`} allowClear {...props} />;
    }
  };

  return (
    <Form 
      id={id}
      layout={layout}
      onFinish={onSearch ? handleSubmit(onSearch) : undefined}
    >
      <Row gutter={16}>
        {config.map((field) => {
          const columnsPerRow = Math.max(1, Math.min(12, field.colSpan || 4));
          const cells = 12 / columnsPerRow;
          const antSpan = Math.max(2, Math.min(24, Math.floor(cells * 2)));

          return (
            <Col span={antSpan} key={field.name}>
              <Form.Item 
                label={field.label}
                required={field.rules?.required}
                validateStatus={form.formState.errors[field.name] ? 'error' : ''}
                help={form.formState.errors[field.name]?.message as string}
              >
                <Controller
                  name={field.name}
                  control={control}
                  defaultValue={field.defaultValue}
                  rules={field.rules}
                  render={({ field: { onChange, value, ref } }) => renderComponent(field, onChange, value, ref)}
                />
              </Form.Item>
            </Col>
          );
        })}
      </Row>
    </Form>
  );
}
