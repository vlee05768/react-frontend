import PageCard from '@/components/common/PageCard';
import { Space, Button, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export default function CustomerMaterialReceiptList() {
  return (
    <PageCard title="客供料入庫單">
      <Space direction="vertical" style={{ width: '100%' }} size="medium">
        <Alert
          message="客供料管理系統建置中"
          description="後端大核心數據引擎與資料庫已 100% 完成部署。本功能將於第五階段（React 前端高質感 UI）開發完成。目前本頁面為動態路由掛載之預覽版。"
          type="info"
          showIcon
        />
        <Button type="primary" icon={<PlusOutlined />}>
          新增客供料入庫單
        </Button>
      </Space>
    </PageCard>
  );
}
