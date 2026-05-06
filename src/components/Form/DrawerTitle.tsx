interface DrawerTitleProps<T = any> {
  moduleName: string;       // 模組名稱，例如："商業夥伴"、"系統使用者"
  isCreate: boolean;        // 是否為新增模式
  isEdit: boolean;          // 是否為編輯模式
  record?: T | null;        // 當前載入的明細資料
  // 顯示的識別值：可以是欄位名稱字串 (如 'name')，也可以是自訂函式組合字串
  displayField?: keyof T | ((record: T) => string); 
}

export function DrawerTitle<T = Record<string, any>>({
  moduleName,
  isCreate,
  isEdit,
  record,
  displayField = 'name' as keyof T // 預設抓取 name 欄位
}: DrawerTitleProps<T>) {
  
  let displayName = '';
  
  if (record) {
    if (typeof displayField === 'function') {
      displayName = displayField(record);
    } else {
      displayName = String(record[displayField] || '');
    }
  }

  // 組合主標題
  const actionText = isCreate ? '新增' : (isEdit ? '編輯' : '檢視');
  
  return (
    <div className="flex items-center gap-3">
      {/* 藍色裝飾線 */}
      <div className="w-1 h-5 bg-blue-500 rounded-sm" />
      <div className="text-lg font-semibold flex items-center">
        <span>{actionText}{moduleName}</span>
        {/* 如果有取得名稱，就用分隔符號顯示出來 */}
        {!isCreate && displayName && (
          <>
            <span className="mx-2 text-gray-400 font-normal">/</span>
            <span className="text-blue-600 dark:text-blue-400">
              {displayName}
            </span>
          </>
        )}
      </div>
    </div>
  );
}