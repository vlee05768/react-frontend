import React from 'react';
import { Tag, Spin } from 'antd';
import type { TagProps } from 'antd';
import * as Icons from '@ant-design/icons';
import { useDictionary } from '@/hooks/useDictionary';
import { DICTIONARY_REGISTRY } from '@/config/dictionaryRegistry';
import type { DictKey } from '@/config/dictionaryRegistry';

export interface DictTagProps extends Omit<TagProps, 'color' | 'icon'> {
  /** 綁定字典 Registry 的 Key（如 'ORDER_STATUS'、'IsActive'） */
  dictKey: DictKey;
  
  /** 欄位目前的數值/鍵值（如 'Draft'、true、'P'） */
  value: any;

  /** 
   * 自訂顏色對照表 (可選) 
   * 支援 Antd 語意色 (success, processing, error, warning) 或十六進位色碼 (Hex, 如 #52c41a)
   * 範例: { Draft: 'blue', Confirmed: 'green' }
   */
  colors?: Record<string | number, string>;

  /** 
   * 自訂 Icon 對照表 (可選)
   * 範例: { Draft: <ClockCircleOutlined />, Confirmed: <CheckCircleOutlined /> }
   */
  icons?: Record<string | number, React.ReactNode>;

  /** 當 dictionary 或 colors 對照表找不到 key 時的預設顏色 (預設為 'default' 灰色) */
  defaultColor?: string;

  /** 當 icons 對照表找不到 key 時的預設 Icon (預設無 Icon) */
  defaultIcon?: React.ReactNode;

  /** 無數值 (null/undefined) 時的 Fallback 顯示 */
  fallback?: React.ReactNode;
}

// 內部 Icon 字串動態渲染工具
const renderIcon = (iconName?: string): React.ReactNode => {
  if (!iconName) return null;
  
  // 補齊 Outlined 後綴以符合 AntD v5 命名規範 (如 ClockCircle -> ClockCircleOutlined)
  const normalizedName = iconName.endsWith('Outlined') ? iconName : `${iconName}Outlined`;
  const IconComponent = (Icons as any)[normalizedName];
  
  return IconComponent ? React.createElement(IconComponent) : null;
};

export const DictTag: React.FC<DictTagProps> = ({
  dictKey,
  value,
  colors,
  icons,
  defaultColor = 'default',
  defaultIcon,
  fallback = '-',
  ...tagProps
}) => {
  // 使用既有的 React Query 字典快取
  const { data: rawOptions, isLoading } = useDictionary(dictKey);

  if (isLoading) return <Spin size="small" style={{ marginLeft: 8 }} />;
  if (value === undefined || value === null || value === '') return <>{fallback}</>;

  // 取得該字典對應的欄位欄位名稱 (如 text, val)
  const registryConfig = DICTIONARY_REGISTRY[dictKey];
  if (!registryConfig) {
    return <Tag color="default" {...tagProps}>{String(value)}</Tag>;
  }
  
  const valueField = registryConfig?.fieldNames?.value || 'value';
  const labelField = registryConfig?.fieldNames?.label || 'label';

  // 比對出匹配的資料物件原型 (這個物件現在包含 color 與 icon 屬性)
  // 支援不分大小寫的字串比對，以防後端資料不一致
  const match = rawOptions?.find((opt: any) => {
    const optVal = opt[valueField];
    if (typeof optVal === 'string' && typeof value === 'string') {
      return optVal.toLowerCase() === value.toLowerCase();
    }
    return optVal === value;
  });
  const label = match ? match[labelField] : String(value);

  // 1. 決定最終顏色 (外層覆蓋優先 > 資料項目內建優先 > 灰色)
  const finalColor = 
    colors?.[String(value)] || 
    match?.color || 
    defaultColor;

  // 2. 決定最終 Icon (外層覆蓋優先 > 資料項目內建優先 > 無 Icon)
  const finalIcon = 
    icons?.[String(value)] || 
    (match?.icon ? renderIcon(match.icon) : defaultIcon);

  return (
    <Tag
      icon={finalIcon}
      color={finalColor}
      variant="filled" // AntD v5 扁平化無邊框設計更美觀，原 bordered={false} 已廢棄
      className="inline-flex items-center gap-1 font-medium py-0.5 px-2"
      {...tagProps}
    >
      {label}
    </Tag>
  );
};
