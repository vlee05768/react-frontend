import React from 'react';
import { Card, Button, Modal, Typography, Divider, Row, Col, Descriptions } from 'antd';
import { ExclamationCircleFilled, CalculatorOutlined, SettingOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { postApiV1StorageCalculateInventory, postApiV1SystemMaintenanceSyncSequenceRules } from '@/api/generated/sdk.gen';
import { useThemeStore } from '@/stores/useThemeStore';

const { Title, Text } = Typography;

const SystemMaintenance: React.FC = () => {
  const mode = useThemeStore((state) => state.mode);
  const isDarkMode = mode === 'dark';

  // Mutation for calculating inventory
  const { mutateAsync: calculateInventory, isPending: isCalculating } = useMutation({
    mutationFn: () => postApiV1StorageCalculateInventory(),
    onSuccess: (res) => {
      const apiResponse = res.data;
      const resultData = apiResponse?.data;
      
      if (!apiResponse?.success) {
        Modal.error({ 
          centered: true, 
          title: '重算庫存失敗', 
          content: apiResponse?.message || '伺服器回傳失敗狀態。' 
        });
        return;
      }

      if (resultData) {
        const { totalCalculatedItems, itemsToUpdate, updatedItems, isSuccess, errorMessage } = resultData;
        
        if (isSuccess) {
          Modal.success({
            title: '重算庫存完成',
            width: 400,
            centered: true,
            content: (
              <div className="mt-4">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="總檢查項目數">{totalCalculatedItems ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="需更新項目數">{itemsToUpdate ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="實際更新數">{updatedItems ?? 0}</Descriptions.Item>
                </Descriptions>
                <div className="mt-4 text-gray-500 text-sm">
                  {apiResponse.message || '庫存資料已重新計算並覆寫完成。'}
                </div>
              </div>
            ),
          });
        } else {
          Modal.warning({
            title: '重算庫存未完全成功',
            width: 400,
            centered: true,
            content: (
              <div className="mt-4">
                <p className="text-red-500 mb-4">{errorMessage || '執行過程中發生部分錯誤。'}</p>
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="總檢查項目數">{totalCalculatedItems ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="需更新項目數">{itemsToUpdate ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="實際更新數">{updatedItems ?? 0}</Descriptions.Item>
                </Descriptions>
              </div>
            ),
          });
        }
      } else {
        Modal.success({
          centered: true,
          title: '重算庫存完成',
          content: '重算庫存已成功完成！'
        });
      }
    },
    onError: (error: any) => {
      console.error('Calculate inventory error:', error);
      const errorMsg = error?.response?.data?.message || '重算庫存失敗，請稍後再試或聯繫系統管理員。';
      Modal.error({
        centered: true,
        title: '重算庫存發生錯誤',
        content: errorMsg,
      });
    },
  });

  const handleCalculateInventory = () => {
    Modal.confirm({
      title: '確認重算庫存',
      icon: <ExclamationCircleFilled />,
      content: '此操作將會重新計算並更新所有庫位的淨庫存量，執行過程可能需要一些時間。您確定要繼續嗎？',
      okText: '確認重算',
      cancelText: '取消',
      okType: 'danger', // Use danger for destructive/heavy operations as requested
      centered: true,   // Ensure it's centered per UI preferences
      onOk: async () => {
        await calculateInventory();
      },
    });
  };

  // Mutation for syncing sequence rules
  const { mutateAsync: syncSequenceRules, isPending: isSyncingSequences } = useMutation({
    mutationFn: () => postApiV1SystemMaintenanceSyncSequenceRules(),
    onSuccess: (res: any) => {
      const apiResponse = res.data;
      if (!apiResponse?.success) {
        Modal.error({ 
          centered: true, 
          title: '校正失敗', 
          content: apiResponse?.message || '伺服器回傳失敗狀態。' 
        });
        return;
      }
      
      const updatedCount = apiResponse.data || 0;
      Modal.success({
        centered: true,
        title: '校正完成',
        content: `單號跳號規則已成功校正！共更新了 ${updatedCount} 筆規則。`
      });
    },
    onError: (error: any) => {
      console.error('Sync sequence rules error:', error);
      const errorMsg = error?.response?.data?.message || '校正失敗，請稍後再試或聯繫系統管理員。';
      Modal.error({
        centered: true,
        title: '單號校正發生錯誤',
        content: errorMsg,
      });
    },
  });

  const handleSyncSequenceRules = () => {
    Modal.confirm({
      title: '確認單號校正',
      icon: <ExclamationCircleFilled />,
      content: '此操作將會掃描所有系統單據，重新校正自動跳號產生器的最新流水號，用於修復單號重複或 500 錯誤。您確定要繼續嗎？',
      okText: '確認校正',
      cancelText: '取消',
      okType: 'danger',
      centered: true,
      onOk: async () => {
        await syncSequenceRules();
      },
    });
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} min-h-[calc(100vh-64px)]`}>
      <div className="mb-6">
        <Title level={3} className={isDarkMode ? '!text-gray-100' : '!text-gray-800'}>
          系統維護
        </Title>
        <Text type="secondary" className={isDarkMode ? '!text-gray-400' : ''}>
          提供系統管理員執行各項後台維護與資料校正功能。
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {/* 重算庫存功能卡片 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            hoverable 
            className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}
            bodyStyle={{ padding: '24px' }}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                <CalculatorOutlined className="text-3xl" />
              </div>
              <div>
                <Title level={5} className={isDarkMode ? '!text-gray-200' : ''}>庫存重算</Title>
                <Text type="secondary" className={`text-sm ${isDarkMode ? '!text-gray-400' : ''}`}>
                  根據歷史交易紀錄，重新計算並覆寫所有庫位的當前淨庫存量。
                </Text>
              </div>
              <Divider className="my-2" />
              <Button 
                type="primary" 
                danger
                icon={<CalculatorOutlined />} 
                onClick={handleCalculateInventory}
                loading={isCalculating}
                className="w-full"
              >
                執行重算
              </Button>
            </div>
          </Card>
        </Col>

        {/* 單號跳號校正功能卡片 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            hoverable 
            className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}
            bodyStyle={{ padding: '24px' }}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${isDarkMode ? 'bg-amber-900 text-amber-300' : 'bg-amber-50 text-amber-600'}`}>
                <SettingOutlined className="text-3xl" />
              </div>
              <div>
                <Title level={5} className={isDarkMode ? '!text-gray-200' : ''}>單號跳號校正</Title>
                <Text type="secondary" className={`text-sm ${isDarkMode ? '!text-gray-400' : ''}`}>
                  掃描系統所有單據，校正跳號產生器 (SequenceRule) 至實際最大流水號，修復單號衝突。
                </Text>
              </div>
              <Divider className="my-2" />
              <Button 
                type="primary" 
                danger
                icon={<SettingOutlined />} 
                onClick={handleSyncSequenceRules}
                loading={isSyncingSequences}
                className="w-full"
              >
                執行校正
              </Button>
            </div>
          </Card>
        </Col>
        
        {/* 未來可在此擴充其他維護功能 */}
      </Row>
    </div>
  );
};

export default SystemMaintenance;