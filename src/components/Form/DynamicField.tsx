import React from 'react';
import { Form, Input, Select, InputNumber, DatePicker, Switch, Tooltip } from 'antd';
import { Controller } from 'react-hook-form';
import type { Control, UseFormSetValue } from 'react-hook-form';
import type { FieldConfig, FormContext } from './types';

interface DynamicFieldProps {
  config: FieldConfig;
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  context: FormContext<any>;
  isUpdateMode?: boolean;
  isViewMode?: boolean;
}

export const DynamicField: React.FC<DynamicFieldProps> = ({ config, control, setValue, context, isUpdateMode, isViewMode }) => {
  // 解析動態屬性
  const isHidden = typeof config.hidden === 'function' ? config.hidden(context) : config.hidden;
  if (isHidden) return null;

  const isDisabled = typeof config.disabled === 'function' ? config.disabled(context) : config.disabled;
  const isUpdateDisabled = typeof config.updateDisabled === 'function' ? config.updateDisabled(context) : config.updateDisabled;
  const finalDisabled = isViewMode || isDisabled || (isUpdateMode && isUpdateDisabled);

  const componentProps = typeof config.componentProps === 'function' ? config.componentProps(context) : (config.componentProps || {});

  return (
    <Controller
      name={config.name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        
        // 處理 onChange 連動
        const handleChange = (val: any) => {
          // Antd 的 Input 等事件帶的是 React.ChangeEvent，或者直接是 value
          const value = val?.target ? val.target.value : val;
          field.onChange(value); // 更新 RHF 狀態
          
          if (config.onChange) {
            // 觸發自訂連動邏輯
            config.onChange(value, context, setValue);
          }
        };

        // 解析是否啟用 ellipsis
        const isEllipsis = typeof config.ellipsis === 'function' ? config.ellipsis(context) : config.ellipsis;
        
        // 判斷是否為必填
        const isRequired = typeof config.required === 'function' ? config.required(context) : config.required;

        const commonProps = {
          ...field,
          ...componentProps,
          onChange: handleChange,
          disabled: finalDisabled,
          status: error ? 'error' as const : undefined,
          ...(isEllipsis ? {
            style: {
              textOverflow: 'ellipsis',
              ...componentProps?.style,
            }
          } : {
            style: componentProps?.style,
          }),
        };

        // 判斷是否需要 Tooltip 提示 (只在有值且啟用 ellipsis 時顯示)
        const valueStr = field.value !== null && field.value !== undefined && field.value !== '' ? String(field.value) : undefined;
        const renderWithTooltip = (node: React.ReactNode) => {
          if (!isEllipsis || !valueStr) return node;
          return (
            <Tooltip title={valueStr} placement="topLeft">
              {node}
            </Tooltip>
          );
        };

        // 渲染對應的輸入元件
        let ComponentNode: React.ReactNode = null;
        switch (config.componentType) {
          case 'Input':
            ComponentNode = renderWithTooltip(<Input {...commonProps} />);
            break;
          case 'TextArea':
            // TextArea 通常是換行，不需要 ellipsis
            const textAreaProps = { ...commonProps };
            if (textAreaProps.style) {
              delete textAreaProps.style.textOverflow;
            }
            ComponentNode = <Input.TextArea {...textAreaProps} />;
            break;
          case 'Select':
            ComponentNode = renderWithTooltip(<Select {...commonProps} />);
            break;
          case 'InputNumber':
            ComponentNode = renderWithTooltip(<InputNumber {...commonProps} className="w-full" />);
            break;
          case 'DatePicker':
            ComponentNode = renderWithTooltip(<DatePicker {...commonProps} className="w-full" />);
            break;
          case 'Switch':
            // Switch 的值是 checked
            ComponentNode = <Switch checked={field.value} onChange={handleChange} disabled={finalDisabled} {...componentProps} />;
            break;
          case 'Custom':
            ComponentNode = config.customRender ? config.customRender({ ...field, onChange: handleChange }, context) : null;
            break;
          default:
            ComponentNode = renderWithTooltip(<Input {...commonProps} />);
        }

        // 處理 boolean 元件的特殊排版 (不用 label 包裝，而是放在右側)
        if (config.componentType === 'Switch') {
            return (
                <Form.Item
                  validateStatus={error ? 'error' : ''}
                  help={error?.message}
                  required={isRequired || !!config.validation || !!config.dynamicValidation}
                >
                  <div className="flex items-center h-[32px] mt-[30px]">
                     {ComponentNode}
                     <span className="ml-2">{config.label}</span>
                  </div>
                </Form.Item>
            );
        }

        return (
          <Form.Item
            label={config.label}
            validateStatus={error ? 'error' : ''}
            help={error?.message}
            required={isRequired || !!config.validation || !!config.dynamicValidation}
          >
            {ComponentNode}
          </Form.Item>
        );
      }}
    />
  );
};
