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
  /** 自訂選項的渲染方式，如果提供將覆蓋預設的 value (label) 顯示 */
  optionRender?: (option: any, info: { index: number }) => React.ReactNode;
}

export const AsyncSelect: React.FC<AsyncSelectProps> = ({ 
  configKey, 
  value, 
  onChange, 
  additionalParams,
  excludeValues = [],
  optionRender,
  ...props 
}) => {
  const config = AUTO_COMPLETE_REGISTRY[configKey];
  if (!config) {
    console.warn(`[AsyncSelect] 找不到對應的 configKey: ${configKey}`);
    return <Select value={value} onChange={onChange} {...props} />;
  }

  const [keyword, setKeyword] = useState('');
  const [initialOption, setInitialOption] = useState<any>(null);

  const triggerLength = config.triggerLength ?? 1;
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
    queryKey: ['async-select-initial', configKey, value],
    queryFn: () => config.fetchByValue ? config.fetchByValue(value) : Promise.resolve(null),
    enabled: !!value && !!config.fetchByValue && !searchData?.find((item: any) => item[config.fieldNames.value] === value),
    staleTime: Infinity,
  });

  // 輔助函數：格式化成 value (label) 或者只有 value
  const formatLabel = (val: string, lbl?: string) => {
    if (!lbl || lbl.trim() === '') return val;
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
        (keyword && keyword.length < triggerLength ? `請至少輸入 ${triggerLength} 個字元` : null)
      }
      options={options}
      value={value}
      onChange={onChange}
      optionRender={optionRender}
      {...props}
    />
  );
};
