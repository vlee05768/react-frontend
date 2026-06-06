import PageCard from '@/components/common/PageCard';
import { Space, Table, Tag, Input, Button, DatePicker, Row, Col, Alert } from 'antd';
import { SearchOutlined, ClearOutlined, PlusOutlined, ExperimentOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

export default function PurchaseReceiptsList() {

  // Mock 資料展示用，讓畫面看起來真實且完整
  const mockData = [
    {
      key: '1',
      documentNumber: 'PD-202606-0001',
      documentDate: '2026-06-06',
      purchaseOrderNumber: 'PO-202606-0003',
      businessPartnerName: '鼎基化學股份有限公司',
      supplierCode: 'S0012',
      invoiceNumber: 'AA-12345678',
      totalAmount: 48500,
      status: 'DRAFT',
      notes: '首批一卷一卡測試原料進貨',
    },
    {
      key: '2',
      documentNumber: 'PD-202606-0002',
      documentDate: '2026-06-05',
      purchaseOrderNumber: 'PO-202606-0002',
      businessPartnerName: '3M 台灣明尼蘇達礦業製造',
      supplierCode: 'S0003',
      invoiceNumber: 'AA-87654321',
      totalAmount: 125000,
      status: 'CONFIRMED',
      notes: '已確認入庫待 IQC 檢驗',
    }
  ];

  const columns = [
    {
      title: '單據號碼',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
      width: 160,
    },
    {
      title: '單據日期',
      dataIndex: 'documentDate',
      key: 'documentDate',
      width: 120,
    },
    {
      title: '採購單號',
      dataIndex: 'purchaseOrderNumber',
      key: 'purchaseOrderNumber',
      width: 150,
    },
    {
      title: '供應商',
      dataIndex: 'businessPartnerName',
      key: 'businessPartnerName',
      ellipsis: true,
    },
    {
      title: '發票號碼',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 130,
    },
    {
      title: '總金額 (台幣)',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      render: (val: number) => `$${val.toLocaleString()}`,
      align: 'right' as const,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        let color = 'gold';
        let text = '未確認 (Draft)';
        if (status === 'CONFIRMED') {
          color = 'blue';
          text = '已過帳 (Confirmed)';
        } else if (status === 'CLOSED') {
          color = 'green';
          text = '已結案 (Closed)';
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '備註',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: () => (
        <Space size="middle">
          <Button type="link" size="small" disabled>明細</Button>
        </Space>
      ),
    },
  ];

  return (
    <PageCard 
      title="原料進貨管理" 
      extra={
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            disabled
            className="flex items-center"
          >
            新增進貨單
          </Button>
        </Space>
      }
    >
      <div className="space-y-4">
        {/* 系統提示訊息 */}
        <Alert
          message="「一卷一卡原料物理溯源」到貨模組開發中"
          description="目前後端 Phase 1（實體與 DTO 配置）已建置成功。此頁面為前端路由預覽畫面，在 Phase 2（後端過帳與 API 接口）及 Phase 3（API Codegen 對接）完成後，本頁面將完全綁定真實資料庫，啟用全功能 CRUD 與一卷一卡自動拆卷過帳邏輯。"
          type="info"
          showIcon
          icon={<ExperimentOutlined />}
          closable
        />

        {/* 查詢篩選區塊 */}
        <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500 font-medium">單據號碼</span>
                <Input placeholder="請輸入單據號碼" disabled />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500 font-medium">供應商名稱/代碼</span>
                <Input placeholder="請輸入供應商代碼或名稱" disabled />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500 font-medium">單據日期</span>
                <RangePicker className="w-full" disabled />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} className="flex items-end justify-end">
              <Space className="w-full justify-end">
                <Button icon={<ClearOutlined />} disabled>重置</Button>
                <Button type="primary" icon={<SearchOutlined />} disabled>查詢</Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 資料表格 */}
        <Table 
          columns={columns} 
          dataSource={mockData} 
          pagination={false}
          scroll={{ x: 1000 }}
          bordered
          className="border border-gray-100 dark:border-zinc-800 rounded-lg"
        />
      </div>
    </PageCard>
  );
}
