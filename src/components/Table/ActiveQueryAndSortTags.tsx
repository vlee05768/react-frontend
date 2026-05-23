import { Tag, Space, Button, Divider } from 'antd';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { getColumnLabel } from '@/utils/tableUtils';
import type { SearchFieldConfig } from '@/components/Form/types';

interface ActiveQueryAndSortTagsProps<Q> {
  searchConfig: SearchFieldConfig[]; // 查詢欄位設定，用於顯示條件 Tag
  tableColumns: any[];               // 表格欄位設定，用於將 SortRules 中的 C# property 轉為中文標題
  params: Q & { SortRules?: string }; // 當前的 query 狀態（包含 SortRules）
  onQueryTagClose: (key: string) => void; // 關閉查詢 Tag
  onSortTagClose: (field: string) => void; // 關閉特定排序 Tag
  onClearSort?: () => void;         // 點擊「清除排序」時的回呼
}

/**
 * ERP 專用的統一查詢與排序 Tag 顯示元件。
 * 遵循高密度、節省空間的原則，橫向渲染「查詢條件」與「目前排序條件」。
 */
export default function ActiveQueryAndSortTags<Q extends Record<string, any>>({
  searchConfig,
  tableColumns,
  params,
  onQueryTagClose,
  onSortTagClose,
  onClearSort,
}: ActiveQueryAndSortTagsProps<Q>) {
  return (
    <div style={{ 
      marginBottom: '12px', 
      display: 'flex', 
      alignItems: 'center', 
      flexWrap: 'wrap', 
      gap: '8px',
      backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', 
      padding: '8px 16px', 
      borderRadius: '6px', 
      flexShrink: 0 
    }}>
      {/* 查詢條件 Tags 區塊 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>
          目前的查詢條件:
        </span>
        <DynamicSearchTags
          config={searchConfig}
          params={params}
          onClose={onQueryTagClose}
        />
      </div>

      {/* 排序條件 Tags 區塊 */}
      {params.SortRules && (
        <>
          <Divider type="vertical" style={{ height: '16px', borderColor: '#d9d9d9', margin: '0 8px' }} />
          <span style={{ fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>
            目前的排序順序:
          </span>
          <Space size={[4, 8]} wrap style={{ display: 'flex', alignItems: 'center' }}>
            {params.SortRules.split(',').map((rule: string) => {
              const [field, order] = rule.split(':');
              const label = getColumnLabel(field, tableColumns);
              const orderText = order === 'asc' ? '升序 ↗' : '降序 ↘';
              return (
                <Tag
                  key={field}
                  closable
                  color="blue"
                  onClose={() => onSortTagClose(field)}
                >
                  {label} ({orderText})
                </Tag>
              );
            })}
            {onClearSort && (
              <Button 
                type="link" 
                size="small" 
                style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                onClick={onClearSort}
              >
                清除排序
              </Button>
            )}
          </Space>
        </>
      )}
    </div>
  );
}
