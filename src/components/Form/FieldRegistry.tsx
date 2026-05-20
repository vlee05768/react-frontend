import React from 'react';
import { Input, Select, InputNumber, DatePicker, Switch } from 'antd';
import { DictSelect } from './DictSelect';
import { AsyncSelect } from './AsyncSelect';

export type FieldComponentType = 
  | 'Input' 
  | 'TextArea' 
  | 'Select' 
  | 'DictSelect' 
  | 'AsyncSelect' 
  | 'InputNumber' 
  | 'DatePicker' 
  | 'Switch' 
  | 'Custom';

export type FieldRenderer = (props: any, options?: any) => React.ReactNode;

export const FIELD_REGISTRY: Record<string, FieldRenderer> = {
  Input: (props) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      try {
        e.target.select();
      } catch (err) {
        console.error(err);
      }
      props.onFocus?.(e);
    };
    return <Input {...props} onFocus={handleFocus} />;
  },
  
  TextArea: (props) => {
    const textAreaProps = { ...props };
    if (textAreaProps.style) {
      delete textAreaProps.style.textOverflow;
    }
    if (!textAreaProps.rows && !textAreaProps.autoSize) {
      textAreaProps.autoSize = { minRows: 3 };
    }
    return <Input.TextArea {...textAreaProps} />;
  },
  
  Select: (props) => <Select {...props} />,
  
  DictSelect: (props) => <DictSelect {...props} />,
  
  AsyncSelect: (props) => <AsyncSelect {...props} />,
  
  InputNumber: (props, options) => {
    const inputNumberProps = { ...props };
    if (options?.isViewMode && !inputNumberProps.formatter) {
      inputNumberProps.formatter = (val: any) => {
        if (val === null || val === undefined || val === '') return '';
        const num = Number(val);
        if (isNaN(num)) return String(val);
        if (options?.precision !== undefined) {
          return num.toLocaleString(undefined, { 
            minimumFractionDigits: options.precision,
            maximumFractionDigits: options.precision 
          });
        }
        return num.toLocaleString();
      };
    } else if (!inputNumberProps.formatter) {
      // 編輯模式下，若無指定自訂 formatter，則自動套用千分位格式化與對應的 parser (防呆與高可讀性)
      inputNumberProps.formatter = (val: any) => {
        if (val === null || val === undefined || val === '') return '';
        return `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      };
      inputNumberProps.parser = (val: any) => {
        if (val === null || val === undefined || val === '') return '';
        return val.replace(/\$\s?|(,*)/g, '') as unknown as number;
      };
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      try {
        e.target.select();
      } catch (err) {
        console.error(err);
      }
      props.onFocus?.(e);
    };

    return <InputNumber {...inputNumberProps} onFocus={handleFocus} />;
  },
  
  DatePicker: (props) => <DatePicker {...props} />,
  
  Switch: (props) => <Switch {...props} />,
};
