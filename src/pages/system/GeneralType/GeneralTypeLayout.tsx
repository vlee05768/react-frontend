import { useState } from 'react';
import { Card } from 'antd';
import CategoryList from './CategoryList';
import CategoryItemList from './CategoryItemList';

export default function GeneralTypeLayout() {
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | null>(null);

  return (
    <div style={{ padding: '16px', height: 'calc(100vh - 64px)', display: 'flex', gap: '16px' }}>
      {/* 左側：類別清單 */}
      <Card 
        style={{ width: '320px', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { padding: 0, flex: 1, overflow: 'hidden' } }}
        variant="borderless"
      >
        <CategoryList 
          selectedCode={selectedCategoryCode} 
          onSelect={setSelectedCategoryCode} 
        />
      </Card>

      {/* 右側：項目清單 */}
      <Card 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { padding: 0, flex: 1, overflow: 'hidden' } }}
        variant="borderless"
      >
        <CategoryItemList selectedCode={selectedCategoryCode} />
      </Card>
    </div>
  );
}