# 設計規範：採購明細商品編碼元件改用 Autocomplete

本設計規範旨在將「採購明細」中的模具或原料編碼輸入元件，由原先的 `AsyncSelect`（其本質為 `<Select showSearch>`）修改為真正的 `AutoComplete` 元件。這能解決大型資料量下傳統下拉選單效能不佳、無法自由輸入或編輯已存在編碼、以及不實用的靜態/全部加載設計。

---

## 1. 變更目的與使用者體驗 (UX)
* **原有問題**：
  * 原先使用 `AsyncSelect` 本質為 AntD `<Select showSearch>`，需要將全部或部分資料下載到本地，在資料量大時容易發生卡頓。
  * 限制了使用者直接打字輸入未在清單中、或想直接手動輸入完整編碼的自由度（Select 強制要求必須選取已有選項，否則常會被清除）。
  * 聚焦時無法自動全選，造成修改不便。
* **預期效果**：
  * 使用 Ant Design 5 的 `<AutoComplete>` 元件。
  * 聚焦時自動全選 (e.target.select())，方便使用者直接覆寫。
  * 輸入時自動 Debounce (防抖) 搜尋 API，並將搜尋結果展示在下拉清單中。
  * 保持與 `AsyncSelect` 同等的高級連動支援（當選擇某個 AutoComplete 選項時，能夠將該選項的 `originalData` 傳出，自動帶入商品名稱、單位、規格、長度、寬度等）。

---

## 2. 系統架構變更

### 2.1 新增 `AutoComplete` 表單元件
在 `git_projects/erp-frontend-react/src/components/Form/` 新增 `AutoComplete.tsx`。
* 接收 props：
  * `configKey`: 對應到 `AUTO_COMPLETE_REGISTRY`（如 `"MOLD"` 或 `"MATERIAL"`）。
  * `value`: RHF 管理的當前字串值。
  * `onChange`: 連動 RHF 的 onChange 事件，支援 `(value: string, option?: any) => void`。
  * `additionalParams`: 額外的 API 查詢參數（如 `{ IsArrived: false }`）。
  * `disabled`: 唯讀/禁用狀態。
* 核心機制：
  * 使用 React Query 的 `useQuery` 動態打 API（搭配 debounce `keyword`，不輸入不發動或依 triggerLength 發動）。
  * 使用者輸入文字時觸發 `onSearch`，更新 `keyword`。
  * 聚焦時呼叫 `e.target.select()`。
  * 下拉選單點選 (onSelect) 時，觸發 `onChange(value, option)`，其中 `option` 必須攜帶 `originalData`，以相容既有的商品連動邏輯。

### 2.2 註冊至 `FIELD_REGISTRY`
修改 `git_projects/erp-frontend-react/src/components/Form/FieldRegistry.tsx`：
* 在 `FieldComponentType` 類型中新增 `'AutoComplete'`。
* 在 `FIELD_REGISTRY` 中註冊 `AutoComplete` 渲染映射：
  ```tsx
  AutoComplete: (props) => <AutoComplete key={props.configKey} allowClear={true} {...props} />,
  ```

### 2.3 修改採購明細配置
修改 `git_projects/erp-frontend-react/src/pages/purchase/orders/PurchaseOrderConfig.tsx`：
* 將明細表單中的 `goodsCode` 欄位配置變更：
  * 將 `componentType` 由 `"AsyncSelect"` 改為 `"AutoComplete"`。
  * 保持原有的 `componentProps` 與 `onChange` 連動邏輯不變，因為新實作的 `AutoComplete` 將在 option 中完整提供 `originalData`，因此不破壞既有 API contract。

---

## 3. 程式碼實作細節建議

### 3.1 `AutoComplete.tsx` 實作原型
```tsx
import React, { useState, useMemo, useEffect } from 'react';
import { AutoComplete, Spin } from 'antd';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { AUTO_COMPLETE_REGISTRY } from '@/config/autoCompleteRegistry';
import type { AutoCompleteKey } from '@/config/autoCompleteRegistry';

export interface AutoCompleteProps {
  configKey: AutoCompleteKey;
  value?: string;
  onChange?: (value: string, option?: any) => void;
  additionalParams?: any;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
}

export const AutoCompleteField: React.FC<AutoCompleteProps> = ({
  configKey,
  value = '',
  onChange,
  additionalParams,
  disabled,
  placeholder,
  onFocus,
  ...props
}) => {
  const config = AUTO_COMPLETE_REGISTRY[configKey];
  if (!config) {
    console.warn(`[AutoComplete] 找不到對應的 configKey: ${configKey}`);
    return <AutoComplete value={value} disabled={disabled} placeholder={placeholder} {...props} />;
  }

  const [keyword, setKeyword] = useState('');

  // 當 configKey 變更時，清空關鍵字
  useEffect(() => {
    setKeyword('');
  }, [configKey]);

  const triggerLength = config.triggerLength ?? 2;
  const shouldFetch = keyword.length >= triggerLength;

  // 防抖處理輸入
  const debounceFetcher = useMemo(() => debounce((val: string) => setKeyword(val), 500), []);

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['autocomplete', configKey, keyword, additionalParams],
    queryFn: () => config.queryFn(keyword, additionalParams),
    enabled: shouldFetch,
    placeholderData: keepPreviousData,
  });

  const options = useMemo(() => {
    const list = searchData || [];
    return list.map((item: any) => {
      const rawLabel = typeof config.fieldNames.label === 'function'
        ? config.fieldNames.label(item)
        : item[config.fieldNames.label];
      const val = item[config.fieldNames.value];
      return {
        label: `${val} (${rawLabel})`,
        value: val,
        originalData: item
      };
    });
  }, [searchData, config]);

  const handleSearch = (val: string) => {
    debounceFetcher(val);
    if (onChange) {
      onChange(val); // 使用者打字時，即時更新值
    }
  };

  const handleSelect = (val: string, option: any) => {
    if (onChange) {
      onChange(val, option);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    try {
      e.target.select();
    } catch (err) {
      console.error(err);
    }
    if (onFocus) onFocus(e);
  };

  return (
    <AutoComplete
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onFocus={handleFocus}
      notFoundContent={isFetching ? <Spin size="small" /> : null}
      {...(props as any)}
    />
  );
};
```

---

## 4. 驗證條件與測試建議
1. **載入測試**：進入採購單詳情，新增或編輯明細項目，切換類別為「原料採購」或「模具採購」，驗證「原料編碼」與「模具編碼」已成功渲染成 Autocomplete 輸入框。
2. **搜尋與選取測試**：在輸入框中打字（如 `R` 或 `M`），下拉清單能正確進行防抖搜尋並顯示匹配編碼。點選選單，該商品的品名、規格等資訊應正確自動回填。
3. **自訂打字測試**：輸入不存在的編碼，系統應允許欄位值保持為使用者打的字，不會被強制清除。
4. **聚焦全選測試**：點擊已有內容的編碼輸入框，文字應會自動被全選。
