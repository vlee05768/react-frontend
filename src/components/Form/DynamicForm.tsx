import { useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { DefaultValues, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, Button, Space, Row, Col, Divider } from 'antd';
import type { FieldConfig, FormContext } from './types';
import { DynamicField } from './DynamicField';

interface DynamicFormProps<TValues extends Record<string, any>> {
  fields: FieldConfig<TValues>[];
  defaultValues?: DefaultValues<TValues>;
  onSubmit: (data: TValues) => void;
  isUpdateMode?: boolean;
  isViewMode?: boolean;
  formId?: string;
  hideDefaultFooter?: boolean;
}

export function DynamicForm<TValues extends Record<string, any>>({
  fields,
  defaultValues,
  onSubmit,
  isUpdateMode = false,
  isViewMode = false,
  formId,
  hideDefaultFooter = false,
}: DynamicFormProps<TValues>) {
  
  // 1. 儲存最新的 Schema Reference
  const schemaRef = useRef<z.ZodTypeAny>(z.object({}));

  // 2. 初始化 RHF
  const methods = useForm<TValues>({
    defaultValues,
    mode: 'onTouched', // 離開 input 時即時驗證
    resolver: async (data, context, options) => {
      // 永遠使用最新的動態 Schema 來進行驗證
      return (zodResolver(schemaRef.current as any) as Resolver<TValues>)(data, context, options);
    },
  });

  const { control, handleSubmit, watch, setValue } = methods;

  // 3. 監聽所有表單數值，建立執行期上下文 (Context)
  const currentValues = watch() as TValues;
  const context: FormContext<TValues> = useMemo(() => ({ values: currentValues }), [currentValues]);

  // 4. 動態計算 Zod Schema
  useEffect(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    
    fields.forEach(field => {
      // 處理 Form 動態隱藏邏輯，若 showInForm 顯式設定為 false，不渲染該欄位
      if (field.showInForm === false) return;
      
      const isHidden = typeof field.hidden === 'function' ? field.hidden(context) : field.hidden;
      if (isHidden) return;
      
      // 1. 先取得預設或動態的 schema
      let fieldSchema = field.validation;
      if (field.dynamicValidation) {
        const dynamicVal = field.dynamicValidation(context);
        if (dynamicVal) {
          fieldSchema = dynamicVal;
        }
      }
      
      // 2. 處理必填邏輯 (支援靜態或動態 context function)
      const isRequired = typeof field.required === 'function' ? field.required(context) : field.required;
      
      if (isRequired) {
        // 若設為必填，我們以基礎防呆檢核疊加：不可為 undefined / null / 空字串
        // (如果開發者已提供 Zod schema，我們依舊保留並串接 refine 保證必填不為空)
        fieldSchema = ((fieldSchema || z.any()) as z.ZodTypeAny).refine(
          (val: any) => val !== undefined && val !== null && val !== '', 
          { message: '此欄位為必填' }
        ) as z.ZodTypeAny;
      } else if (!fieldSchema) {
        // 無設定檢核則放行
        fieldSchema = z.any();
      }

      shape[field.name as string] = fieldSchema as z.ZodTypeAny;
    });
    
    // 更新 Ref，使 resolver 拿到的總是最新結構
    schemaRef.current = z.object(shape);
    
  }, [fields, context]); 

  // 當 defaultValues 改變時 (例如 API 資料載入完成)，重置表單值
  useEffect(() => {
    if (defaultValues) {
      methods.reset(defaultValues);
    }
  }, [defaultValues, methods]);

  // 表單群組化處理
  const renderFieldList = (fieldList: FieldConfig<any>[]) => (
    <Row gutter={[24, 0]}>
      {fieldList.map((field) => {
        // 根據使用者的定義：colSpan 表示「一行幾欄」，預設為 4。
        // 將 form 分為 12 個 cell，colSpan=1 佔 12 cell，colSpan=3 佔 4 cell。
        // Ant Design 的 Col 系統為 24 欄制，因此每個 cell 等於 2 個 span。
        const columnsPerRow = Math.max(1, Math.min(12, field.colSpan || 4));
        const cells = 12 / columnsPerRow; // 計算佔用幾個 cell
        const antSpan = Math.max(2, Math.min(24, Math.floor(cells * 2))); // 轉換為 AntD 的 24 span 系統
        
        return (
          <Col span={antSpan} key={String(field.name)}>
            <DynamicField
              config={field as FieldConfig<any>}
              control={control as any}
              setValue={setValue as any}
              context={context as any}
              isUpdateMode={isUpdateMode}
              isViewMode={isViewMode}
            />
          </Col>
        );
      })}
    </Row>
  );

  const groupedFields = useMemo(() => {
    const groups: { [key: string]: FieldConfig<any>[] } = { _ungrouped: [] };
    fields.forEach(field => {
      // 處理 Form 靜態與動態隱藏邏輯
      if (field.showInForm === false) return;
      const isHidden = typeof field.hidden === 'function' ? field.hidden(context) : field.hidden;
      if (isHidden) return;

      const groupName = field.group || '_ungrouped';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(field as FieldConfig<any>);
    });
    return groups;
  }, [fields, context]);

  const hasGroups = Object.keys(groupedFields).filter(k => k !== '_ungrouped').length > 0;

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} id={formId} disabled={isViewMode} className={isViewMode ? 'view-mode-form' : ''}>
      {/* 支援 grid 與群組排版 */}
      {hasGroups ? (
        <div className="dynamic-form-groups">
          {Object.entries(groupedFields).map(([groupName, groupFields]) => {
            if (groupFields.length === 0) return null;
            if (groupName === '_ungrouped') {
              return <div key="ungrouped">{renderFieldList(groupFields)}</div>;
            }
            return (
              <div key={groupName} style={{ marginBottom: '8px' }}>
                <Divider 
                  {...({ orientation: "center" } as any)}
                  plain 
                  style={{ 
                    marginTop: 0, 
                    marginBottom: '20px', 
                    color: 'var(--ant-color-primary)', 
                    borderColor: 'var(--ant-color-border-secondary)',
                    fontWeight: 600,
                    fontSize: '15px'
                  }}
                >
                  {groupName}
                </Divider>
                {renderFieldList(groupFields)}
              </div>
            );
          })}
        </div>
      ) : (
        renderFieldList(groupedFields._ungrouped)
      )}
      
      {/* 操作區塊 */}
      {!hideDefaultFooter && (
        <div className="mt-6 flex justify-end pt-4 border-t border-gray-100">
          <Space>
            <Button onClick={() => methods.reset()}>重設</Button>
            <Button type="primary" htmlType="submit">
              儲存
            </Button>
          </Space>
        </div>
      )}
    </Form>
  );
}
