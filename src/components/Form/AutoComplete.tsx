import React, { useState, useMemo, useEffect } from 'react';
import { AutoComplete, Spin } from 'antd';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { AUTO_COMPLETE_REGISTRY } from '@/config/autoCompleteRegistry';
import type { AutoCompleteKey } from '@/config/autoCompleteRegistry';

export interface AutoCompleteProps {
  configKey: AutoCompleteKey;
  value?: string;
  onChange?: (value: string, option?: any) => void;
  additionalParams?: any;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
}

export const AutoCompleteField: React.FC<AutoCompleteProps> = ({
  configKey,
  value = '',
  onChange,
  additionalParams,
  disabled,
  placeholder,
  onFocus,
  ...props
}) => {
  const config = AUTO_COMPLETE_REGISTRY[configKey];
  if (!config) {
    console.warn(`[AutoComplete] 找不到對應的 configKey: ${configKey}`);
    return <AutoComplete value={value} disabled={disabled} placeholder={placeholder} {...props} />;
  }

  const [keyword, setKeyword] = useState('');

  // 當 configKey 變更時，清空關鍵字以防殘留
  useEffect(() => {
    setKeyword('');
  }, [configKey]);

  const triggerLength = config.triggerLength ?? 2;
  const shouldFetch = keyword.length >= triggerLength;

  // 使用防抖處理輸入，降低 API 請求頻率
  const debounceFetcher = useMemo(() => debounce((val: string) => setKeyword(val), 500), []);

  useEffect(() => {
    return () => {
      debounceFetcher.cancel();
    };
  }, [debounceFetcher]);

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['autocomplete', configKey, keyword, additionalParams],
    queryFn: () => config.queryFn(keyword, additionalParams),
    enabled: shouldFetch,
    placeholderData: keepPreviousData,
  });

  const options = useMemo(() => {
    const list = searchData || [];
    return list.map((item: any) => {
      const rawLabel = typeof config.fieldNames.label === 'function'
        ? config.fieldNames.label(item)
        : item[config.fieldNames.label];
      const val = item[config.fieldNames.value];
      return {
        label: `${val} (${rawLabel})`,
        value: val,
        originalData: item
      };
    });
  }, [searchData, config]);

  const handleSearch = (val: string) => {
    debounceFetcher(val);
    if (onChange) {
      onChange(val); // 使用者打字時，即時更新值
    }
  };

  const handleSelect = (val: string, option: any) => {
    if (onChange) {
      onChange(val, option);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    try {
      e.target.select();
    } catch (err) {
      console.error(err);
    }
    if (onFocus) onFocus(e);
  };

  return (
    <AutoComplete
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onFocus={handleFocus}
      notFoundContent={isFetching ? <Spin size="small" /> : null}
      style={{ width: '100%' }}
      {...(props as any)}
    />
  );
};
