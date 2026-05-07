import React from 'react';
import { useDictionary } from '@/hooks/useDictionary';
import { DICTIONARY_REGISTRY } from '@/config/dictionaryRegistry';
import type { DictKey } from '@/config/dictionaryRegistry';
import { Spin } from 'antd';

export interface DictLabelProps {
  dictKey: DictKey;
  value: any;
  fallback?: React.ReactNode;
}

export const DictLabel: React.FC<DictLabelProps> = ({ dictKey, value, fallback = '-' }) => {
  const { data: rawOptions, isLoading } = useDictionary(dictKey);

  if (isLoading) return <Spin size="small" />;
  if (value === undefined || value === null || value === '') return <>{fallback}</>;

  const registryConfig = DICTIONARY_REGISTRY[dictKey];
  const valueField = registryConfig?.fieldNames?.value || 'value';
  const labelField = registryConfig?.fieldNames?.label || 'label';

  // 處理陣列 (多選)
  if (Array.isArray(value)) {
    const labels = value.map(val => {
      const match = rawOptions?.find((opt: any) => opt[valueField] === val);
      return match ? match[labelField] : val;
    });
    return <>{labels.join(', ')}</>;
  }

  // 單一值
  const match = rawOptions?.find((opt: any) => opt[valueField] === value);
  return <>{match ? match[labelField] : value}</>;
};
