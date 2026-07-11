import { useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { DefaultValues, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, Button, Space, Row, Col, Divider, Tabs, ConfigProvider } from 'antd';
import {
  InfoCircleOutlined,
  TeamOutlined,
  DatabaseOutlined,
  ClusterOutlined,
  BuildOutlined
} from '@ant-design/icons';
import type { FieldConfig, FormContext } from './types';
import { DynamicField } from './DynamicField';
import { isEqual } from 'lodash-es';
import { ANIMATION_DELAY_MS } from '@/constants';

interface DynamicFormProps<TValues extends Record<string, any>> {
  fields: FieldConfig<TValues>[];
  defaultValues?: DefaultValues<TValues>;
  onSubmit: (data: TValues) => void;
  isUpdateMode?: boolean;
  isViewMode?: boolean;
  isLoading?: boolean; // 新增 loading 狀態
  className?: string; // 供自訂樣式
  formId?: string;
  hideDefaultFooter?: boolean;
  validationMode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
  layoutType?: 'grouped' | 'tabs';
  disableOtherTabsInEdit?: boolean; // 新增此屬性，在編輯模式下除了基本資料外其餘 tab 皆 disable
  onValuesChange?: (values: TValues) => void;
}

const getGroupIcon = (groupName: string) => {
  const name = groupName.trim();
  if (name.includes('基本')) return <InfoCircleOutlined />;
  if (name.includes('客戶')) return <TeamOutlined />;
  if (name.includes('原料')) return <DatabaseOutlined />;
  if (name.includes('委外')) return <ClusterOutlined />;
  if (name.includes('模具')) return <BuildOutlined />;
  return null;
};

export function DynamicForm<TValues extends Record<string, any>>({
  fields,
  defaultValues,
  onSubmit,
  isUpdateMode = false,
  isViewMode = false,
  isLoading = false,
  className,
  hideDefaultFooter = false,
  formId,
  validationMode = 'onBlur',
  layoutType = 'grouped',
  disableOtherTabsInEdit = false,
  onValuesChange,
}: DynamicFormProps<TValues>) {
  
  // 1. 儲存最新的 Schema Reference
  const formWrapperRef = useRef<HTMLDivElement>(null);
  const schemaRef = useRef<z.ZodTypeAny>(z.object({}));

  // 2. 初始化 RHF
  const methods = useForm<TValues>({
    defaultValues,
    mode: validationMode, // 預設送出時驗證，可透過 props 覆寫
    resolver: async (data, context, options) => {
      // 永遠使用最新的動態 Schema 來進行驗證
      return (zodResolver(schemaRef.current as any) as Resolver<TValues>)(data, context, options);
    },
  });

  const { control, handleSubmit, watch, setValue, trigger, formState: { isDirty } } = methods;

  // 3. 監聽所有表單數值，建立執行期上下文 (Context)
  const currentValues = watch() as TValues;
  const context: FormContext<TValues> = useMemo(() => ({ values: currentValues }), [currentValues]);

  // 💡 使用 Ref 儲存最新的回呼，防止外部傳入 inline 匿名函數時引發無效重渲染遞迴
  const onValuesChangeRef = useRef(onValuesChange);
  useEffect(() => {
    onValuesChangeRef.current = onValuesChange;
  });

  // 💡 當數值變動時，觸發外部回呼 (用於 LPN 領退料與 BOM 聯動)
  useEffect(() => {
    if (onValuesChangeRef.current && currentValues) {
      onValuesChangeRef.current(currentValues);
    }
  }, [currentValues]);

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
      if (field.autoGenerate && !isUpdateMode && !isViewMode) {
        // 系統自動產生的欄位在新增模式下，免除驗證必填
        if (fieldSchema) {
          fieldSchema = (fieldSchema as any).optional();
        } else {
          fieldSchema = z.any();
        }
      } else {
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
      }

      shape[field.name as string] = fieldSchema as z.ZodTypeAny;
    });
    
    // 更新 Ref，使 resolver 拿到的總是最新結構
    schemaRef.current = z.object(shape);
    
  }, [fields, context]); 

  const prevDefaultValuesRef = useRef<DefaultValues<TValues> | undefined>(undefined);

  // 當 defaultValues 改變時 (例如 API 資料載入完成)，重置表單值
  useEffect(() => {
    if (isDirty) return; // 💡 如果表單已經有使用者修改的髒數據(Dirty)，絕對不要自動重置以避免遺失 Input Focus!
    if (defaultValues && !isEqual(prevDefaultValuesRef.current, defaultValues)) {
      methods.reset(defaultValues);
      prevDefaultValuesRef.current = defaultValues;
    }
  }, [defaultValues, methods, isDirty]);

  // 當 isViewMode 變為 true (回到檢視模式) 時，重置表單值為原始資料，以確保取消編輯時能完全恢復原始內容
  useEffect(() => {
    if (isViewMode && defaultValues) {
      methods.reset(defaultValues);
    }
  }, [isViewMode, defaultValues, methods]);

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
              trigger={trigger as any}
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
    const groups: { [key: string]: FieldConfig<any>[] } = { '基本資訊': [] };
    fields.forEach(field => {
      // 處理 Form 靜態與動態隱藏邏輯
      if (field.showInForm === false) return;
      const isHidden = typeof field.hidden === 'function' ? field.hidden(context) : field.hidden;
      if (isHidden) return;

      // 未設定 group 的欄位，自動歸類到 '基本資訊'
      const groupName = field.group || '基本資訊';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(field as FieldConfig<any>);
    });
    return groups;
  }, [fields, context]);


  // 處理自動 Focus (所有 form 在編輯或新增模式時, 一出現當下應該把 focus 停留在第一個可以輸入的元件)
  useEffect(() => {
    if (!isViewMode) {
      // 延遲 300ms 等待 Ant Design 的 Drawer/Modal 動畫完成
      const timer = setTimeout(() => {
        if (formWrapperRef.current) {
          // 找出第一個可以輸入且沒有被 disabled/readonly 的元素
          const focusableElements = formWrapperRef.current.querySelectorAll(
            'input:not([disabled]):not([readonly]):not([type="hidden"]), textarea:not([disabled]):not([readonly])'
          );
          
          for (let i = 0; i < focusableElements.length; i++) {
            const el = focusableElements[i] as HTMLElement;
            // 確保元素是可見的
            if (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) {
              el.focus();
              break;
            }
          }
        }
      }, ANIMATION_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isViewMode, defaultValues]); // 當進入編輯/新增模式，或是非同步載入資料完成時觸發

  // 判斷是否要啟用群組樣式 (卡片與標題)
  // 條件：只要有開發者手動設定了任何 group 屬性 (不管是不是基本資訊)，或者產生的 groups 數量大於 1
  const hasGroups = fields.some(f => f.group !== undefined && f.group !== '') || Object.keys(groupedFields).length > 1;

  // Global Interceptor for DatePicker fields to format dayjs -> YYYY-MM-DD
  const handleInternalSubmit = (values: TValues) => {
    const payload = { ...values };
    fields.forEach(field => {
      // 處理 Form 動態隱藏邏輯，若 showInForm 顯式設定為 false，不渲染該欄位
      if (field.showInForm === false) return;
      
      const componentType = typeof field.componentType === 'function' 
        ? field.componentType(context) 
        : field.componentType;
        
      if (componentType === 'DatePicker') {
        const val = payload[field.name as keyof TValues];
        if (val && typeof val.format === 'function') {
           payload[field.name as keyof TValues] = val.format('YYYY-MM-DD') as any;
        }
      } else if ((componentType as any) === 'DateRangePicker') {
        const val = payload[field.name as keyof TValues];
        if (Array.isArray(val) && val.length === 2) {
          payload[field.name as keyof TValues] = val.map((d: any) => d && typeof d.format === 'function' ? d.format('YYYY-MM-DD') : d) as any;
        }
      }
    });
    onSubmit(payload);
  };


  // 表單驗證失敗時，自動 focus 第一個錯誤欄位
  const handleInternalError = (errors: any) => {
    console.error("DynamicForm validation errors:", errors);
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey && formWrapperRef.current) {
      // 嘗試尋找元件：1. 透過 id, 2. 透過 name
      const element = formWrapperRef.current.querySelector(
        `#${firstErrorKey}, [name="${firstErrorKey}"]`
      ) as HTMLElement;
      
      if (element) {
        // Antd Select/DatePicker 等元件的 focus 目標可能在內部 input
        const focusTarget = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'BUTTON' 
          ? element 
          : (element.querySelector('input') || element);
          
        if (typeof focusTarget.focus === 'function') {
          // 平滑捲動至該元素
          focusTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // 延遲一點時間讓它確保拿到焦點
          setTimeout(() => focusTarget.focus(), 100);
        }
      }
    }
  };

  return (
    <div ref={formWrapperRef} className={`dynamic-form-wrapper ${className || ''}`}>
      <Form layout="vertical" onFinish={handleSubmit(handleInternalSubmit, handleInternalError)} id={formId} disabled={isViewMode} className={isViewMode ? 'view-mode-form' : ''}>
      {/* 支援 grid 與群組排版 */}
      {hasGroups ? (
        layoutType === 'tabs' ? (
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#16a34a', // 使用真實的 Hex 綠色碼，AntD JS 引擎才能正確計算衍生色，避免 CSS 變數解析失敗退回預設藍色
              }
            }}
          >
            <Tabs
              type="line"
              size="small"
              className="dynamic-form-tabs mt-1"
              items={Object.entries(groupedFields)
                .filter(([_, groupFields]) => groupFields.length > 0)
                .map(([groupName, groupFields]) => ({
                  key: groupName,
                  disabled: isUpdateMode && disableOtherTabsInEdit && !groupName.includes('基本'),
                  label: (
                    <span className="flex items-center gap-1.5 font-medium text-sm">
                      {getGroupIcon(groupName)}
                      {groupName}
                    </span>
                  ),
                  children: (
                    <div className="p-6 pt-5 bg-zinc-50/50 dark:bg-zinc-900/40 border border-solid border-zinc-200/60 dark:border-zinc-800/80 rounded-xl mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                      {renderFieldList(groupFields)}
                    </div>
                  ),
                }))}
            />
          </ConfigProvider>
        ) : (
          <div className="dynamic-form-groups">
            {Object.entries(groupedFields).map(([groupName, groupFields]) => {
              if (groupFields.length === 0) return null;
              return (
                <div 
                  key={groupName} 
                  className="mb-4 p-6 pt-4 pb-2 border border-solid border-[var(--ant-color-border)] rounded-lg bg-[var(--ant-color-bg-container)]"
                >
                  <Divider 
                    titlePlacement="center"
                    plain 
                    className="mt-0 mb-3 font-semibold text-[15px] text-[var(--ant-color-primary)] !border-[var(--ant-color-border-secondary)]"
                  >
                    {groupName}
                  </Divider>
                  {renderFieldList(groupFields)}
                </div>
              );
            })}
          </div>
        )
      ) : (
        renderFieldList(groupedFields['基本資訊'])
      )}
      
      {/* 操作區塊 */}
      {!hideDefaultFooter && !isViewMode && (
        <div className="mt-6 flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
          <Space>
            <Button onClick={() => methods.reset()} disabled={isLoading}>重設</Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              儲存
            </Button>
          </Space>
        </div>
      )}
      {/* 隱藏的提交按鈕，確保外部呼叫儲存時 100% 觸發 React/AntD 提交事件 */}
      {formId && !isViewMode && (
        <button type="submit" id={`${formId}-submit-btn`} style={{ display: 'none' }} />
      )}
    </Form>
    </div>
  );
}
