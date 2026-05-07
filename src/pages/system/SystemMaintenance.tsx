import React from 'react';
import { Card, Button, Modal, message, Typography, Divider, Row, Col } from 'antd';
import { ExclamationCircleFilled, CalculatorOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { postApiV1StorageCalculateInventory } from '@/api/generated/sdk.gen';
import { useThemeStore } from '@/stores/useThemeStore';

const { Title, Text } = Typography;

const SystemMaintenance: React.FC = () => {
  const mode = useThemeStore((state) => state.mode);
  const isDarkMode = mode === 'dark';

  // Mutation for calculating inventory
  const { mutateAsync: calculateInventory, isPending: isCalculating } = useMutation({
    mutationFn: () => postApiV1StorageCalculateInventory(),
    onSuccess: () => {
      message.success('重算庫存已成功完成！');
    },
    onError: (error) => {
      console.error('Calculate inventory error:', error);
      message.error('重算庫存失敗，請稍後再試或聯繫系統管理員。');
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
        
        {/* 未來可在此擴充其他維護功能 */}
      </Row>
    </div>
  );
};

export default SystemMaintenance;