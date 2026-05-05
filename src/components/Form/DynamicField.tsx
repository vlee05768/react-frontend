import React from 'react';
import { Form, Input, Select, InputNumber, DatePicker, Switch, Tooltip } from 'antd';
import { Controller } from 'react-hook-form';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { z } from 'zod';
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

  // 支援新版 editable 與舊版 disabled/updateDisabled
  let calcDisabled = false;
  if ('editable' in config && config.editable) {
    const editable = typeof config.editable === 'function' ? config.editable(context) : config.editable;
    if (editable === 'never') calcDisabled = true;
    else if (editable === 'createOnly' && isUpdateMode) calcDisabled = true;
    else if (editable === 'updateOnly' && !isUpdateMode) calcDisabled = true;
    else if (typeof editable === 'boolean') calcDisabled = !editable; // 支援 boolean 傳入
  } else {
    const isDisabled = typeof (config as any).disabled === 'function' ? (config as any).disabled(context) : (config as any).disabled;
    const isUpdateDisabled = typeof (config as any).updateDisabled === 'function' ? (config as any).updateDisabled(context) : (config as any).updateDisabled;
    calcDisabled = isDisabled || (isUpdateMode && isUpdateDisabled);
  }
  
  const finalDisabled = isViewMode || calcDisabled;

  const componentProps = typeof config.componentProps === 'function' ? config.componentProps(context) : (config.componentProps || {});
  const resolvedLabel = typeof config.label === 'function' ? config.label(context) : config.label;
  const resolvedComponentType = typeof config.componentType === 'function' ? config.componentType(context) : config.componentType;

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

        // 解析是否啟用 ellipsis 及對應的 hint 內容
        const ellipsisResult = typeof config.ellipsis === 'function' ? config.ellipsis(field.value, context) : config.ellipsis;
        // 如果 result 是 boolean，就是啟用與否；如果是 ReactNode (字串等)，則代表啟用並指定 tooltip 內容
        const isEllipsis = !!ellipsisResult;
        
        // Tooltip 要顯示的字串/節點 (如果是 true 就顯示原本的值，如果是自訂內容就顯示自訂內容)
        let tooltipContent: React.ReactNode = undefined;
        if (ellipsisResult !== true && ellipsisResult !== false && ellipsisResult !== undefined) {
           tooltipContent = ellipsisResult;
        } else if (field.value !== null && field.value !== undefined && field.value !== '') {
           tooltipContent = String(field.value);
        }

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
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              ...componentProps?.style,
            }
          } : {
            style: componentProps?.style,
          }),
        };

        const renderWithTooltip = (node: React.ReactNode) => {
          if (!isEllipsis || !tooltipContent) return node;
          
          // 在 Antd 中，Tooltip 綁定在 disabled 元素上無法觸發 hover，需要用 wrapper 元素包裝
          const wrappedNode = finalDisabled ? (
             <span style={{ display: 'block', cursor: 'not-allowed' }}>
                <div style={{ pointerEvents: 'none' }}>{node}</div>
             </span>
          ) : node;

          return (
            <Tooltip 
              title={tooltipContent} 
              placement="topLeft" 
              color="#1677ff" 
              overlayInnerStyle={{ padding: '6px 10px', fontSize: '13px', letterSpacing: '0.5px' }}
              align={{ offset: [0, -8] }}
            >
              {wrappedNode}
            </Tooltip>
          );
        };

        // 渲染對應的輸入元件
        let ComponentNode: React.ReactNode = null;
        switch (resolvedComponentType) {
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
        if (resolvedComponentType === 'Switch') {
            return (
                <Form.Item
                  validateStatus={error ? 'error' : ''}
                  help={error?.message}
                  required={isRequired || (!!config.validation && !config.validation.isOptional()) || !!config.dynamicValidation}
                >
                  <div className="flex items-center h-[32px] mt-[30px]">
                     {ComponentNode}
                     <span className="ml-2">{resolvedLabel}</span>
                  </div>
                </Form.Item>
            );
        }

        // 判斷是否顯示必填紅星號：若是明確要求 (isRequired) 或 validation 中非 optional 皆視為必填
        const showRequiredMark = isRequired || 
          (!!config.validation && !config.validation.isOptional() && !(config.validation instanceof z.ZodOptional) && !(config.validation instanceof z.ZodNullable)) || 
          (config.dynamicValidation && !config.dynamicValidation(context)?.isOptional());

        return (
          <Form.Item
            label={resolvedLabel}
            validateStatus={error ? 'error' : ''}
            help={error?.message}
            required={showRequiredMark}
          >
            {ComponentNode}
          </Form.Item>
        );
      }}
    />
  );
};
