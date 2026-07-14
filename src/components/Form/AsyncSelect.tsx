import React, { useState, useMemo, useEffect } from 'react';
import { Select, Spin } from 'antd';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { AUTO_COMPLETE_REGISTRY } from '@/config/autoCompleteRegistry';
import type { AutoCompleteKey } from '@/config/autoCompleteRegistry';
import type { SelectProps } from 'antd';

export interface AsyncSelectProps extends Omit<SelectProps<any>, 'options' | 'onSearch'> {
  configKey: AutoCompleteKey;
  additionalParams?: any;
  excludeValues?: any[];
  autoSelectIfSingle?: boolean;
  /** 自訂選項的渲染方式，如果提供將覆蓋預設的 value (label) 顯示 */
  optionRender?: (option: any, info: { index: number }) => React.ReactNode;
}

export const AsyncSelect: React.FC<AsyncSelectProps> = ({ 
  configKey, 
  value, 
  onChange, 
  additionalParams,
  excludeValues = [],
  autoSelectIfSingle,
  optionRender,
  ...props 
}) => {
  if (!configKey) {
    console.error(`[AsyncSelect] 嚴重錯誤: 缺少 configKey！請檢查組態檔中 componentProps 內是否誤寫為 dictKey？`);
    return <Select {...(props as any)} disabled placeholder="設定錯誤(缺少configKey)" />;
  }

  const config = AUTO_COMPLETE_REGISTRY[configKey];
  if (!config) {
    console.warn(`[AsyncSelect] 找不到對應的 configKey: ${configKey}`);
    return <Select value={value} onChange={onChange} {...props} />;
  }

  const [keyword, setKeyword] = useState('');
  const [initialOption, setInitialOption] = useState<any>(null);

  // 當 configKey 變更時（例如：採購單從原料採購切換為模具採購，導致 configKey 由 MATERIAL_SUPPLIER 變為 TOOLING_SUPPLIER），
  // 必須立即清除舊的關鍵字與已載入選項，以防殘留上一個類別的供應商選項或關鍵字
  useEffect(() => {
    setKeyword('');
    setInitialOption(null);
  }, [configKey]);

  const triggerLength = config.triggerLength ?? 2;
  const shouldFetch = keyword.length >= triggerLength;

  // 使用防抖處理輸入，降低 API 請求頻率
  const debounceFetcher = useMemo(() => debounce((val: string) => setKeyword(val), 500), []);

  // 1. 動態搜尋資料 (輸入文字才發動)
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['async-select', configKey, keyword, additionalParams],
    queryFn: () => config.queryFn(keyword, additionalParams),
    enabled: shouldFetch,
    placeholderData: keepPreviousData,
  });

  // 2. 表單初始值資料補齊機制 (解決 value 有值但沒有名稱的問題)
  const { data: valueData, isFetching: isFetchingValue } = useQuery({
    queryKey: ['async-select-initial', configKey, value, additionalParams],
    queryFn: () => config.fetchByValue ? config.fetchByValue(value, additionalParams) : Promise.resolve(null),
    enabled: !!value && !!config.fetchByValue && !searchData?.find((item: any) => item[config.fieldNames.value] === value),
    staleTime: Infinity,
  });

  // 輔助函數：格式化成 value (label) 或者只有 value
  const formatLabel = (val: string, lbl?: string) => {
    if (!lbl || lbl.trim() === '') return val;
    // 💡 避免重複顯示編碼：若說明的文字中已經包含了編碼本身，則直接顯示該說明即可，防止雙重嵌套與編碼重疊
    if (lbl.includes(val) || lbl.toLowerCase().includes(val.toLowerCase())) {
      return lbl;
    }
    return `${val} (${lbl})`;
  };

  useEffect(() => {
    if (valueData) {
      const rawLabel = typeof config.fieldNames.label === 'function' 
        ? config.fieldNames.label(valueData) 
        : valueData[config.fieldNames.label];
      const val = valueData[config.fieldNames.value];
      setInitialOption({ 
        label: formatLabel(val, rawLabel), 
        value: val, 
        originalData: valueData 
      });
    }
  }, [valueData, config]);

  // 4. 當只有一筆結果時自動帶入
  useEffect(() => {
    if (autoSelectIfSingle && searchData && searchData.length === 1 && !value && onChange) {
      const singleItem = searchData[0];
      const val = singleItem[config.fieldNames.value];
      const rawLabel = typeof config.fieldNames.label === 'function' 
        ? config.fieldNames.label(singleItem) 
        : singleItem[config.fieldNames.label];
      
      // 自動選擇並觸發 onChange
      onChange(val, { 
        label: formatLabel(val, rawLabel), 
        value: val, 
        originalData: singleItem 
      });
    }
  }, [searchData, value, autoSelectIfSingle, onChange, config]);

  // 3. 處理選項對映
  const options = useMemo(() => {
    const list = searchData || [];
    let mapped = list.map((item: any) => {
      const rawLabel = typeof config.fieldNames.label === 'function' 
        ? config.fieldNames.label(item) 
        : item[config.fieldNames.label];
      const val = item[config.fieldNames.value];
      return { 
        label: formatLabel(val, rawLabel), 
        value: val, 
        originalData: item 
      };
    });

    // 排除特定值
    if (excludeValues && excludeValues.length > 0) {
      mapped = mapped.filter((item: any) => !excludeValues.includes(item.value));
    }

    // 保留已選值，避免從畫面中消失
    if (value && !mapped.find((m: any) => m.value === value)) {
      mapped.push(initialOption || { label: value, value: value });
    }

    return mapped;
  }, [searchData, value, config, initialOption, excludeValues]);

  return (
    <Select
      showSearch
      allowClear
      filterOption={false}
      onSearch={debounceFetcher}
      notFoundContent={
        isFetching || isFetchingValue ? <Spin size="small" /> : 
        (keyword.length < triggerLength ? `請至少輸入 ${triggerLength} 個字元，以啟動搜尋` : null)
      }
      options={options}
      value={value}
      onChange={onChange}
      optionRender={optionRender}
      {...props}
    />
  );
};
