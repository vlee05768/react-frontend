import { useState } from 'react';
import { Card } from 'antd';
import CategoryList from './CategoryList';
import CategoryItemList from './CategoryItemList';

export default function GeneralTypeLayout() {
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | null>(null);

  return (
    <div className="p-4 flex gap-4" style={{height: 'calc(100vh - 64px)'}}>
      {/* 左側：類別清單 */}
      <Card 
        className="flex flex-col" style={{width: '450px'}}
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
        className="flex flex-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { padding: 0, flex: 1, overflow: 'hidden' } }}
        variant="borderless"
      >
        <CategoryItemList selectedCode={selectedCategoryCode} />
      </Card>
    </div>
  );
}
