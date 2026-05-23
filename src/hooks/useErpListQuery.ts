import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useUrlQuerySync } from './useUrlQuerySync';
import { DEFAULT_PAGE_SIZE } from '@/constants';

interface UseErpListQueryOptions<Q> {
  params: Q & { pageNumber?: number; pageSize?: number; SortRules?: string };
  setParams: (newParams: any) => void;
}

/**
 * ERP 專用的統一查詢行為 Hook，接管 React Hook Form 狀態、URL 參數同步與各種重設清除行為。
 */
export function useErpListQuery<Q extends Record<string, any>>({
  params,
  setParams,
}: UseErpListQueryOptions<Q>) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const searchForm = useForm();

  // 1. 解構分頁與查詢條件
  const { pageNumber, pageSize, ...queryFields } = params;

  // 2. 進行 URL 參數雙向同步
  useUrlQuerySync({
    query: queryFields,
    page: pageNumber || 1,
    pageSize: pageSize || DEFAULT_PAGE_SIZE,
    setPagination: (p, s) => setParams({ pageNumber: p, pageSize: s }),
    setQuery: (q) => setParams({ ...q, pageNumber: 1 }),
  });

  // 3. 開啟查詢彈窗，並重置表單值
  const openSearchModal = () => {
    searchForm.reset(params);
    setIsSearchModalOpen(true);
  };

  // 4. 處理查詢（對空字串與空陣列做過濾與 undefined 轉換，避免 API 400）
  const handleSearch = (values: any) => {
    const nextParams = { ...values };
    
    // 建立全域清除基礎，使沒有被提交的欄位在 Store 中能被明確覆蓋為 undefined
    const resetBase = Object.keys(searchForm.getValues()).reduce((acc: any, key) => {
      acc[key] = undefined;
      return acc;
    }, {});

    const cleanParams = { ...resetBase, ...nextParams };

    Object.keys(cleanParams).forEach((key) => {
      const val = cleanParams[key];
      if (val === '' || val === null || (Array.isArray(val) && val.length === 0)) {
        cleanParams[key] = undefined;
      }
    });

    setParams({
      ...cleanParams,
      pageNumber: 1, // 重置頁碼回到第一頁
    });
    setIsSearchModalOpen(false);
  };

  // 5. 處理清除條件（重置 RHF 表單為 null 避免 reset() 回彈，並同步清空 Store）
  const handleClear = () => {
    const fields = Object.keys(searchForm.getValues());
    
    // 重置 UI inputs 為 null
    searchForm.reset(
      fields.reduce((acc: any, key) => {
        acc[key] = null;
        return acc;
      }, {})
    );

    // 重置 Store 中的狀態為 undefined
    const storeReset = fields.reduce((acc: any, key) => {
      acc[key] = undefined;
      return acc;
    }, {});

    setParams({
      ...storeReset,
      pageNumber: 1,
    });
  };

  // 6. 清除單個查詢條件 Tag
  const handleClearQueryField = (key: string) => {
    setParams({ [key]: undefined, pageNumber: 1 });
  };

  // 7. 清除單個排序欄位 Tag
  const handleClearSortField = (field: string) => {
    if (!params.SortRules) return;
    const remainingRules = params.SortRules.split(',')
      .filter((r: string) => !r.startsWith(`${field}:`))
      .join(',');
    setParams({ SortRules: remainingRules || undefined, pageNumber: 1 });
  };

  // 8. 清除所有排序條件
  const handleClearAllSort = () => {
    setParams({ SortRules: undefined, pageNumber: 1 });
  };

  return {
    searchForm,
    isSearchModalOpen,
    setIsSearchModalOpen,
    openSearchModal,
    handleSearch,
    handleClear,
    handleClearQueryField,
    handleClearSortField,
    handleClearAllSort,
  };
}
