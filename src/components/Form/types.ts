import type { ReactNode } from 'react';
import type { ZodTypeAny } from 'zod';

export type ComponentType = 
  | 'Input' 
  | 'TextArea'
  | 'Select' 
  | 'DictSelect'
  | 'AsyncSelect'
  | 'InputNumber' 
  | 'DatePicker' 
  | 'Switch' 
  | 'Custom';

export interface FormContext<TValues> {
  values: TValues;
}

export type DynamicProp<T, TValues> = T | ((context: FormContext<TValues>) => T);

// ================= 新架構 (實體字典與設定分離) =================

export interface FieldDef<TValues = any> {
  name: Extract<keyof TValues, string>;
  label: string | ReactNode;
}

export type EditableType = 'always' | 'createOnly' | 'updateOnly' | 'never';

export type ValidateTrigger = 'onChange' | 'onBlur' | 'onSubmit';

export interface FormFieldConfig<TValues = any> extends FieldDef<TValues> {
  componentType: DynamicProp<ComponentType, TValues>;
  validation?: ZodTypeAny;
  dynamicValidation?: (context: FormContext<TValues>) => ZodTypeAny | undefined;
  
  // 權限整合控制
  editable?: DynamicProp<EditableType | boolean, TValues>;
  // 是否為系統自動產生 (若為 true，新增時不驗證必填並提示「系統自動產生」，且強制唯讀)
  autoGenerate?: boolean;
  
  // 個別欄位的驗證時機 (覆寫全域 onSubmit)
  validateTrigger?: ValidateTrigger | ValidateTrigger[];
  
  hidden?: DynamicProp<boolean, TValues>;
  // 版面排版
  group?: string;
  colSpan?: number;
  componentProps?: DynamicProp<Record<string, any>, TValues>;
  customRender?: (field: any, context: FormContext<TValues>, setValue: (name: Extract<keyof TValues, string>, val: any, options?: any) => void) => ReactNode;
  onChange?: (value: any, context: FormContext<TValues>, setValue: (name: Extract<keyof TValues, string>, val: any, options?: any) => void, ...args: any[]) => void;
  ellipsis?: boolean | ((value: any, context: FormContext<TValues>) => boolean | React.ReactNode);
}

export interface TableColumnConfig<TValues = any> extends FieldDef<TValues> {
  width?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: TValues, index: number) => ReactNode;
  sortable?: boolean | { multiple: number };
  fixed?: 'left' | 'right' | boolean;
  show?: boolean;
  ellipsis?: boolean; // 支援文字過長折疊與 Tooltip 預覽
}

// ================= 舊版相容 (Deprecated) =================
export interface FieldConfig<TValues = any> extends Omit<FormFieldConfig<TValues>, 'editable' | 'label'> {
  label: DynamicProp<string | ReactNode, TValues>;
  showInForm?: boolean;
  disabled?: DynamicProp<boolean, TValues>;
  updateDisabled?: DynamicProp<boolean, TValues>;
  required?: DynamicProp<boolean, TValues>;
  table?: boolean | TableColumnConfig<TValues>;
}

// ================= 查詢條件架構 (Config-driven Search) =================
export interface SearchFieldConfig<TValues = any> extends FieldDef<TValues> {
  componentType: ComponentType | 'DateRangePicker';
  componentProps?: Record<string, any>;
  colSpan?: number; // 版面佔比（代表一行幾欄，例如 4 代表一行 4 欄，預設 4）
  defaultValue?: any;
  rules?: Record<string, any>;
  // 當此條件有值時，上方 Tag 要怎麼顯示？
  // 如果是 Select，會自動對應 options label。
  // 若需要客製化 (例如 boolean, 日期區間) 可透過 formatTag 覆寫。
  formatTag?: (value: any) => string;
}
