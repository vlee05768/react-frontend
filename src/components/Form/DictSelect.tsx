import React from 'react';
import { Select, Divider, Space, Button } from 'antd';
import type { SelectProps } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useDictionary } from '@/hooks/useDictionary';
import { DICTIONARY_REGISTRY } from '@/config/dictionaryRegistry';
import type { DictKey } from '@/config/dictionaryRegistry';

// 移除 options 與 fieldNames，因為會由內部自動載入
export interface DictSelectProps extends Omit<SelectProps, 'options' | 'loading' | 'fieldNames'> {
  dictKey: DictKey;
  showRefresh?: boolean;
}

export const DictSelect: React.FC<DictSelectProps> = ({ 
  dictKey, 
  showRefresh = true, 
  ...props 
}) => {
  if (!dictKey) {
    console.error(`[DictSelect] 嚴重錯誤: 缺少 dictKey！請檢查組態檔中 componentProps 內是否誤寫為 configKey？`);
    return <Select {...props} disabled placeholder="設定錯誤(缺少dictKey)" />;
  }

  const { data: rawOptions, isLoading, isFetching, refetch } = useDictionary(dictKey);
  
  const registryConfig = DICTIONARY_REGISTRY[dictKey];
  if (!registryConfig) {
      console.warn(`[DictSelect] 找不到字典鍵值: ${dictKey}`);
  }

  const { fieldNames } = registryConfig || { fieldNames: { label: 'label', value: 'value' } };

  return (
    <Select
      {...props}
      options={rawOptions || []} 
      fieldNames={fieldNames} 
      loading={isLoading || isFetching}
      popupRender={(menu) => (
        <>
          {menu}
          {showRefresh && (
            <>
              <Divider className="m-[4px 0]" />
              <Space className="p-[0 8px 4px] flex justify-center">
                <Button 
                  type="text" 
                  size="small"
                  icon={<SyncOutlined spin={isFetching} />} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    refetch();
                  }}
                >
                  更新選項
                </Button>
              </Space>
            </>
          )}
        </>
      )}
    />
  );
};
