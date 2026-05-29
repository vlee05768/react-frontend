import React, { useEffect, useState } from 'react';
import { Button, Tooltip, theme } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';
import { useDocumentSubscriptionStore } from '@/stores/useDocumentSubscriptionStore';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';

interface DocumentWatchButtonProps {
  documentType: string;
  documentKey: string | null | undefined;
  compact?: boolean; // 緊湊模式（僅顯示圖標，適用於表格操作列）
}

export const DocumentWatchButton: React.FC<DocumentWatchButtonProps> = ({
  documentType,
  documentKey,
  compact = false,
}) => {
  const subscriptions = useDocumentSubscriptionStore(state => state.subscriptions);
  const fetchMySubscriptions = useDocumentSubscriptionStore(state => state.fetchMySubscriptions);
  const toggleSubscription = useDocumentSubscriptionStore(state => state.toggleSubscription);
  const hasInitialized = useDocumentSubscriptionStore(state => state.hasInitialized);
  const isStoreLoading = useDocumentSubscriptionStore(state => state.isLoading);
  
  const [toggling, setToggling] = useState(false);
  const { token } = theme.useToken();

  // 判斷是否為草稿、暫存單據、或自動編碼預留字
  const isDraftOrPlaceholder = (key: string | null | undefined): boolean => {
    if (!key) return true;
    const trimmed = key.trim();
    return (
      trimmed === '' ||
      trimmed === '【系統自動編碼】' ||
      trimmed.startsWith('【') ||
      trimmed.endsWith('】') ||
      trimmed.toLowerCase() === 'new' ||
      trimmed.toLowerCase() === 'draft' ||
      trimmed.includes('自動編碼')
    );
  };

  // 響應式比對：直接從全域 Store 中的已關注清單比對是否有此單據
  const isSubscribed = subscriptions.some(
    sub => sub.documentType === documentType && sub.documentKey === documentKey
  );

  // 載入時：若尚未初始化載入過全域關注清單，則呼叫 API 取得一次（共享同一次網路請求）
  useEffect(() => {
    if (isDraftOrPlaceholder(documentKey)) return;
    if (!hasInitialized) {
      fetchMySubscriptions();
    }
  }, [documentKey, hasInitialized, fetchMySubscriptions]);

  if (isDraftOrPlaceholder(documentKey)) {
    return null;
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggling) return;

    setToggling(true);
    try {
      await toggleSubscription(documentType, documentKey || '');
    } catch (err) {
      console.error('Error toggling watch status:', err);
    } finally {
      setToggling(false);
    }
  };

  if (compact) {
    const starIcon = isSubscribed ? (
      <StarFilled style={{ fontSize: TABLE_ACTION_ICON_SIZE, color: token.colorWarning }} className="animate-pulse" />
    ) : (
      <StarOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE, color: token.colorTextDescription }} />
    );

    return (
      <Tooltip title={isSubscribed ? "已關注此單據，任何異動會發送電子郵件通知您 (點擊取消)" : "關注此單據，任何異動會發送電子郵件通知您"}>
        <Button
          type="text"
          icon={starIcon}
          onClick={handleToggle}
          loading={(!hasInitialized && isStoreLoading) || toggling}
          className="flex items-center justify-center hover:opacity-80 w-8 h-8 p-0"
          size="small"
        />
      </Tooltip>
    );
  }

  const buttonStyle = isSubscribed
    ? {
        backgroundColor: 'rgba(250, 173, 20, 0.1)',
        borderColor: token.colorWarning,
        color: token.colorWarning,
      }
    : undefined;

  return (
    <Tooltip title={isSubscribed ? "已關注此單據，任何異動會發送電子郵件通知您" : "關注此單據，任何異動會發送電子郵件通知您"}>
      <Button
        className="transition-all duration-300 flex items-center justify-center font-medium"
        style={buttonStyle}
        icon={isSubscribed ? <StarFilled className="text-amber-500 animate-pulse" /> : <StarOutlined />}
        onClick={handleToggle}
        loading={(!hasInitialized && isStoreLoading) || toggling}
      >
        {isSubscribed ? '已關注' : '關注單據'}
      </Button>
    </Tooltip>
  );
};
