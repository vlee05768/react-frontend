import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useUrlQuerySync } from './useUrlQuerySync';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { formatSorterToRules } from '@/utils/tableUtils';

interface UseErpListQueryOptions<Q> {
  params: Q & { pageNumber?: number; page?: number; pageSize?: number; SortRules?: string };
  setParams: (newParams: any) => void;
  pageKey?: 'page' | 'pageNumber';
  searchConfig?: any[]; // 💡 傳入查詢配置，以精確清空所有條件，避免 RHF 延遲註冊漏清除之 Bug
  tableColumns?: any[]; // 💡 傳入表格欄位配置，以自動生成 queryTagProps
}

/**
 * ERP 專專用的統一查詢行為 Hook，接管 React Hook Form 狀態、URL 參數同步與各種重設清除行為。
 */
export function useErpListQuery<Q extends Record<string, any>>({
  params,
  setParams,
  pageKey = 'pageNumber',
  searchConfig,
  tableColumns,
}: UseErpListQueryOptions<Q>) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const searchForm = useForm();

  // 1. 解構分頁與查詢條件
  const { pageNumber, page, pageSize, ...queryFields } = params;
  const currentPage = pageKey === 'page' ? (page || 1) : (pageNumber || 1);

  // 2. 進行 URL 參數雙向同步
  useUrlQuerySync({
    query: queryFields,
    page: currentPage,
    pageSize: pageSize || DEFAULT_PAGE_SIZE,
    setPagination: (p, s) => setParams({ [pageKey]: p, pageSize: s }),
    setQuery: (q) => setParams({ ...q, [pageKey]: 1 }),
  });

  // 3. 開啟查詢彈窗，並重置表單值
  const openSearchModal = () => {
    // 取得先前表單中所有已註冊的欄位名稱
    const fields = Object.keys(searchForm.getValues());
    
    // 建立一個將所有已註冊欄位都預設重置為 undefined 的物件
    const resetValues = fields.reduce((acc: any, key) => {
      acc[key] = undefined;
      return acc;
    }, {});

    // 將當前 Store 中的 params 有效值合併進去
    Object.keys(params).forEach((key) => {
      const val = params[key];
      if (val !== undefined && val !== null) {
        resetValues[key] = val;
      }
    });

    searchForm.reset(resetValues);
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
      [pageKey]: 1, // 重置頁碼回到第一頁
    });
    setIsSearchModalOpen(false);
  };

  // 5. 處理清除條件（重置 RHF 表單為 undefined，確實清空 AntD Select 並同步清空 Store）
  const handleClear = () => {
    const configFields = searchConfig?.map(f => f.name) || [];
    const formFields = Object.keys(searchForm.getValues());
    const fields = Array.from(new Set([...configFields, ...formFields]));
    
    // 重置 UI inputs 為 undefined
    searchForm.reset(
      fields.reduce((acc: any, key) => {
        acc[key] = undefined;
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
      [pageKey]: 1,
    });
  };

  // 6. 清除單個查詢條件 Tag
  const handleClearQueryField = (key: string) => {
    setParams({ [key]: undefined, [pageKey]: 1 });
  };

  // 7. 清除單個排序欄位 Tag
  const handleClearSortField = (field: string) => {
    if (!params.SortRules) return;
    const remainingRules = params.SortRules.split(',')
      .filter((r: string) => !r.startsWith(`${field}:`))
      .join(',');
    setParams({ SortRules: remainingRules || undefined, [pageKey]: 1 });
  };

  // 8. 清除所有排序條件
  const handleClearAllSort = () => {
    setParams({ SortRules: undefined, [pageKey]: 1 });
  };

  // 9. 預先打包好 ActiveQueryAndSortTags 所需的全部 Props (高槓桿/隱藏接縫)
  const queryTagProps = {
    searchConfig,
    tableColumns,
    params,
    onQueryTagClose: handleClearQueryField,
    onSortTagClose: handleClearSortField,
    onClearSort: handleClearAllSort,
  };

  // 10. 高槓桿的標準表格 Props 產生器，接管變更、分頁、選取與刪除動畫狀態同步
  const getTableProps = (options: {
    columns: any[];
    dataSource: any[];
    total: number;
    loading: boolean;
    rowKey?: string;
    selectedId?: any;
    deletingId?: any;
  }) => ({
    onChange: (pagination: any, _filters: any, sorter: any) => {
      const pageNum = pagination.current || 1;
      const size = pagination.pageSize || 20;
      const sortRules = formatSorterToRules(sorter);
      setParams({
        [pageKey]: pageNum,
        pageSize: size,
        SortRules: sortRules || undefined,
      });
    },
    columns: options.columns,
    dataSource: options.dataSource,
    rowKey: options.rowKey || 'code',
    loading: options.loading,
    selectedRowId: options.selectedId,
    selectedRowKey: options.rowKey || 'code',
    deletingRowId: options.deletingId,
    pagination: {
      current: currentPage,
      pageSize: pageSize || DEFAULT_PAGE_SIZE,
      total: options.total,
    }
  });

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
    queryTagProps,
    getTableProps,
  };
}
