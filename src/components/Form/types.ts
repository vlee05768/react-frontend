import type { ReactNode } from 'react';
import type { ZodTypeAny } from 'zod';

export type ComponentType = 
  | 'Input' 
  | 'TextArea'
  | 'Select' 
  | 'InputNumber' 
  | 'DatePicker' 
  | 'Switch' 
  | 'Custom';

export interface FormContext<TValues> {
  values: TValues;
}

export type DynamicProp<T, TValues> = T | ((context: FormContext<TValues>) => T);

export interface FieldConfig<TValues = any> {
  name: Extract<keyof TValues, string>;
  label: string;
  componentType: ComponentType;
  
  // 狀態控制
  disabled?: DynamicProp<boolean, TValues>;
  hidden?: DynamicProp<boolean, TValues>;
  updateDisabled?: DynamicProp<boolean, TValues>; // ERP 特有的 Update 模式防呆
  
  // 屬性與事件
  componentProps?: DynamicProp<Record<string, any>, TValues>;
  onChange?: (value: any, context: FormContext<TValues>, setValue: (name: Extract<keyof TValues, string>, val: any, options?: any) => void) => void;
  
  // 客製化渲染
  customRender?: (
    field: any, // RHF field object
    context: FormContext<TValues>
  ) => ReactNode;

  // 檢核
  required?: DynamicProp<boolean, TValues>;
  validation?: ZodTypeAny;
  dynamicValidation?: (context: FormContext<TValues>) => ZodTypeAny | undefined;
  
  // 顯示控制 (文字過長時是否顯示 ... 以及 Tooltip hint)
  // 支援 boolean，或 function (可根據當前值與上下文動態決定是否啟用，甚至回傳自訂的 Tooltip 內容)
  ellipsis?: boolean | ((value: any, context: FormContext<TValues>) => boolean | React.ReactNode);

  // 排版 (預設將表單切分為12個 cell)
  // colSpan 表示一行顯示幾欄。例如：colSpan=4 (預設) 表示一行4欄 (每欄佔3個cell)。colSpan=1 表示一行1欄 (佔12個cell)。
  colSpan?: number;
}
