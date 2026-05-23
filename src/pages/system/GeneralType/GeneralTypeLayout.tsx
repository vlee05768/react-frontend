import { useState } from 'react';
import PageCard from '@/components/common/PageCard';
import CategoryList from './CategoryList';
import CategoryItemList from './CategoryItemList';

export default function GeneralTypeLayout() {
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | null>(null);

  return (
    <PageCard title="通用代碼管理">
      <div className="flex gap-4 h-full w-full overflow-hidden">
        {/* 左側：類別清單 */}
        <div className="flex flex-col border-r border-gray-100 dark:border-gray-800 pr-4" style={{ width: '450px', height: '100%', overflow: 'hidden' }}>
          <CategoryList 
            selectedCode={selectedCategoryCode} 
            onSelect={setSelectedCategoryCode} 
          />
        </div>

        {/* 右側：項目清單 */}
        <div className="flex-1 flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>
          <CategoryItemList selectedCode={selectedCategoryCode} />
        </div>
      </div>
    </PageCard>
  );
}
