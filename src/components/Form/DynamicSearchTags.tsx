import React from 'react';
import { Tag, Space } from 'antd';
import type { SearchFieldConfig } from './types';

interface DynamicSearchTagsProps {
  config: SearchFieldConfig[];
  params: Record<string, any>;
  onClose: (key: string) => void;
  emptyNode?: React.ReactNode;
}

export default function DynamicSearchTags({ config, params, onClose, emptyNode = <Tag color="default">【全部資料】</Tag> }: DynamicSearchTagsProps) {
  const tags: React.ReactNode[] = [];

  config.forEach(field => {
    const value = params[field.name as string];
    if (value === undefined || value === null || value === '') return;
    
    // 如果是陣列且為空，也不顯示
    if (Array.isArray(value) && value.length === 0) return;

    let displayValue = String(value);

    // 1. 如果有提供 formatTag，優先使用
    if (field.formatTag) {
      displayValue = field.formatTag(value);
    } 
    // 2. 如果是 Select 且有 options，自動查表對應名稱
    else if (field.componentType === 'Select' && field.componentProps?.options) {
      const options = field.componentProps.options;
      
      if (Array.isArray(value)) {
        // 多選
        displayValue = value.map(v => {
          const opt = options.find((o: any) => o.value === v);
          return opt ? opt.label : v;
        }).join(', ');
      } else {
        // 單選
        const opt = options.find((o: any) => o.value === value);
        displayValue = opt ? opt.label : value;
      }
    } 
    // 3. Switch 預設轉為是/否
    else if (field.componentType === 'Switch' || typeof value === 'boolean') {
      displayValue = value ? '是' : '否';
    }

    tags.push(
      <Tag 
        color="blue" 
        key={field.name as string} 
        closable 
        onClose={(e) => {
          e.preventDefault(); // 避免點擊 x 時觸發其他事件
          onClose(field.name as string);
        }}
      >
        {field.label}: {displayValue}
      </Tag>
    );
  });

  if (tags.length === 0) return <>{emptyNode}</>;

  return <Space size={[0, 8]} wrap>{tags}</Space>;
}
