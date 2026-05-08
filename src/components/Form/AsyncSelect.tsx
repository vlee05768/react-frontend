import React, { useState, useMemo, useEffect } from 'react';
import { Select, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { AUTO_COMPLETE_REGISTRY } from '@/config/autoCompleteRegistry';
import type { AutoCompleteKey } from '@/config/autoCompleteRegistry';
import type { SelectProps } from 'antd';

export interface AsyncSelectProps extends Omit<SelectProps<any>, 'options' | 'onSearch'> {
  configKey: AutoCompleteKey;
  additionalParams?: any;
}

export const AsyncSelect: React.FC<AsyncSelectProps> = ({ 
  configKey, 
  value, 
  onChange, 
  additionalParams,
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
  });

  // 2. 表單初始值資料補齊機制 (解決 value 有值但沒有名稱的問題)
  const { data: valueData, isFetching: isFetchingValue } = useQuery({
    queryKey: ['async-select-initial', configKey, value],
    queryFn: () => config.fetchByValue ? config.fetchByValue(value) : Promise.resolve(null),
    enabled: !!value && !!config.fetchByValue && !searchData?.find((item: any) => item[config.fieldNames.value] === value),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (valueData) {
      const label = typeof config.fieldNames.label === 'function' 
        ? config.fieldNames.label(valueData) 
        : valueData[config.fieldNames.label];
      setInitialOption({ label, value: valueData[config.fieldNames.value], originalData: valueData });
    }
  }, [valueData, config]);

  // 3. 處理選項對映
  const options = useMemo(() => {
    const list = searchData || [];
    const mapped = list.map((item: any) => {
      const label = typeof config.fieldNames.label === 'function' 
        ? config.fieldNames.label(item) 
        : item[config.fieldNames.label];
      const val = item[config.fieldNames.value];
      return { label, value: val, originalData: item };
    });

    // 保留已選值，避免從畫面中消失
    if (value && !mapped.find(m => m.value === value)) {
      mapped.push(initialOption || { label: value, value: value });
    }

    return mapped;
  }, [searchData, value, config, initialOption]);

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
      {...props}
    />
  );
};
