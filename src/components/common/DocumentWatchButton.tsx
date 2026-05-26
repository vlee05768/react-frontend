import React, { useEffect, useState } from 'react';
import { Button, Tooltip, theme } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';
import { useDocumentSubscriptionStore } from '@/stores/useDocumentSubscriptionStore';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';

interface DocumentWatchButtonProps {
  documentType: string;
  documentKey: string | null | undefined;
  compact?: boolean; // 新增：緊湊模式（僅顯示圖標，適用於表格操作列）
}

export const DocumentWatchButton: React.FC<DocumentWatchButtonProps> = ({
  documentType,
  documentKey,
  compact = false,
}) => {
  const { toggleSubscription, checkSubscriptionStatus } = useDocumentSubscriptionStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const { token } = theme.useToken();

  // 當單據號碼改變時，重新檢查訂閱狀態
  useEffect(() => {
    if (!documentKey) return;
    
    let isMounted = true;
    const checkStatus = async () => {
      setChecking(true);
      try {
        const status = await checkSubscriptionStatus(documentType, documentKey);
        if (isMounted) {
          setIsSubscribed(status);
        }
      } catch (err) {
        console.error('Error checking watch status:', err);
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [documentType, documentKey, checkSubscriptionStatus]);

  if (!documentKey || documentKey === '【系統自動編碼】') {
    return null;
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggling) return;

    setToggling(true);
    try {
      const newStatus = await toggleSubscription(documentType, documentKey);
      setIsSubscribed(newStatus);
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
          loading={checking || toggling}
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
        loading={checking || toggling}
      >
        {isSubscribed ? '已關注' : '關注單據'}
      </Button>
    </Tooltip>
  );
};
