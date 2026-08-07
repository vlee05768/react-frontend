import { Table, Button, Input, Modal, Form, Tag, Space, Typography, Tooltip, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import PageCard from '@/components/common/PageCard';
import { useBrandModels } from './useBrandModels';

const { Text } = Typography;

export default function BrandModelsLayout() {
  const {
    brands,
    models,
    selectedBrand,
    setSelectedBrand,
    loadingBrands,
    loadingModels,
    brandSearch,
    setBrandSearch,
    modelSearch,
    setModelSearch,
    brandModalVisible,
    setBrandModalVisible,
    modelModalVisible,
    setModelModalVisible,
    editingBrand,
    editingModel,
    brandForm,
    modelForm,
    canCreate,
    canUpdate,
    canDelete,
    fetchBrands,
    fetchModels,
    handleAddBrand,
    handleEditBrand,
    handleDeleteBrand,
    onBrandModalOk,
    handleAddModel,
    handleEditModel,
    handleDeleteModel,
    onModelModalOk
  } = useBrandModels();

  const brandColumns = [
    {
      title: '廠牌代碼',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (text: string) => <span className="font-semibold">{text}</span>
    },
    {
      title: '廠牌名稱',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          {canUpdate && (
            <Tooltip title="編輯">
              <Button type="text" className="text-blue-500 p-0" icon={<EditOutlined />} onClick={(e) => handleEditBrand(e, record)} />
            </Tooltip>
          )}
          {canDelete && (
             <Tooltip title="刪除">
              <Button type="text" danger className="p-0" icon={<DeleteOutlined />} onClick={(e) => handleDeleteBrand(e, record)} />
             </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const modelColumns = [
    {
      title: '型號代碼',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (text: string) => <span className="font-semibold">{text}</span>
    },
    {
      title: '型號說明',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: '廠牌',
      dataIndex: 'code2',
      key: 'code2',
      width: 100,
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          {canUpdate && (
            <Tooltip title="編輯">
              <Button type="text" className="text-blue-500 p-0" icon={<EditOutlined />} onClick={(e) => handleEditModel(e, record)} />
            </Tooltip>
          )}
          {canDelete && (
             <Tooltip title="刪除">
              <Button type="text" danger className="p-0" icon={<DeleteOutlined />} onClick={(e) => handleDeleteModel(e, record)} />
             </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageCard title="廠牌型號管理">
      <div className="flex gap-4 h-full w-full overflow-hidden">
        {/* 左側：廠牌清單 */}
        <div className="flex flex-col border-r border-gray-100 dark:border-gray-800 pr-4" style={{ width: '450px', height: '100%', overflow: 'hidden' }}>
          <div className="flex justify-between items-center pb-3 mb-2" style={{ borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)' }}>
            <span className="font-semibold" style={{ fontSize: '16px', color: 'var(--ant-color-text)' }}>廠牌清單 (Brand)</span>
            {canCreate && (
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddBrand}>
                新增廠牌
              </Button>
            )}
          </div>
          
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 mb-2">
            <Input 
              placeholder="搜尋廠牌代碼或名稱..." 
              prefix={<SearchOutlined />} 
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              onPressEnter={fetchBrands}
              allowClear
              size="small"
            />
          </div>
          
          <div className="flex-1 min-h-0 flex flex-col">
            <Table
              dataSource={brands}
              columns={brandColumns}
              rowKey="id"
              pagination={false}
              loading={loadingBrands}
              scroll={{ y: 'calc(100vh - 280px)', x: 'max-content' }}
              onRow={(record) => ({
                onClick: () => setSelectedBrand(record),
                className: `cursor-pointer transition-colors ${selectedBrand?.id === record.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`
              })}
              size="small"
            />
          </div>
        </div>

        {/* 右側：型號清單 */}
        <div className="flex-1 flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>
          <div className="flex justify-between items-center pb-3 mb-2" style={{ borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)' }}>
            <span className="font-semibold" style={{ fontSize: '16px', color: 'var(--ant-color-text)' }}>
              型號清單 (Model)
              {selectedBrand && (
                <span className="text-blue-500 ml-2 font-normal text-sm">
                  - 當前選擇：{selectedBrand.code}
                </span>
              )}
            </span>
            {canCreate && selectedBrand && (
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddModel}>
                新增型號
              </Button>
            )}
          </div>

          <div className="p-2 border-b border-gray-100 dark:border-gray-800 mb-2">
            <Input 
              placeholder="搜尋型號代碼或說明..." 
              prefix={<SearchOutlined />} 
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              onPressEnter={() => selectedBrand && fetchModels(selectedBrand.code)}
              disabled={!selectedBrand}
              allowClear
              size="small"
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {selectedBrand ? (
              <Table
                dataSource={models}
                columns={modelColumns}
                rowKey="id"
                pagination={false}
                loading={loadingModels}
                scroll={{ y: 'calc(100vh - 280px)', x: 'max-content' }}
                size="small"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<Text type="secondary" style={{ fontSize: '14px' }}>請先從左側選擇一個廠牌</Text>}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 廠牌 Modal */}
      <Modal
        title={editingBrand ? '編輯廠牌' : '新增廠牌'}
        open={brandModalVisible}
        onOk={onBrandModalOk}
        onCancel={() => setBrandModalVisible(false)}
        destroyOnHidden
      >
        <Form form={brandForm} layout="vertical" validateTrigger="onSubmit">
          <Form.Item
            name="code"
            label="廠牌代碼"
            rules={[
              { required: true, message: '請輸入廠牌代碼' },
              { max: 15, message: '廠牌代碼最多 15 碼' },
              { pattern: /^[A-Z0-9#+]+$/, message: '廠牌代碼僅限輸入英文字母、數字、# 與 + 符號' }
            ]}
            extra="最多 15 碼，僅限英文字母、數字、# 與 +，小寫將自動轉大寫。"
          >
            <Input 
              placeholder="例如：3M, NITTO" 
              disabled={!!editingBrand} 
              onChange={(e) => {
                const val = e.target.value.replace(/[^A-Za-z0-9#+]/g, '').toUpperCase();
                brandForm.setFieldValue('code', val);
              }}
            />
          </Form.Item>
          <Form.Item
            name="desc"
            label="廠牌名稱"
            rules={[{ required: true, message: '請輸入廠牌名稱' }]}
          >
            <Input placeholder="請輸入中英文廠牌名稱" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 型號 Modal */}
      <Modal
        title={editingModel ? `編輯 ${selectedBrand?.code} 型號` : `新增 ${selectedBrand?.code} 型號`}
        open={modelModalVisible}
        onOk={onModelModalOk}
        onCancel={() => setModelModalVisible(false)}
        destroyOnHidden
      >
        <Form form={modelForm} layout="vertical" validateTrigger="onSubmit">
          <Form.Item
            name="code"
            label="型號代碼"
            rules={[
              { required: true, message: '請輸入型號代碼' },
              { max: 20, message: '型號代碼最多 20 碼' },
              { pattern: /^[A-Za-z0-9_#+]+$/, message: '型號代碼不可輸入中文或連字號 (-)，僅限英數字、底線 (_)、# 與 + 符號' }
            ]}
            extra="最多 20 碼，儲存時英文將自動轉大寫，且不允許包含連字號 (-)。"
          >
            <Input 
              placeholder="例如：467MP, 9448A" 
              disabled={!!editingModel}
              onChange={(e) => {
                 // 💡 UX 防呆：同時過濾掉中文與連字號 (-)，讓使用者根本無法打入 '-' 符號
                 const val = e.target.value.replace(/[\u4e00-\u9fa5\-]/g, '').toUpperCase();
                 modelForm.setFieldValue('code', val);
              }}
            />
          </Form.Item>
          <Form.Item
            name="desc"
            label="型號說明"
          >
            <Input.TextArea placeholder="請輸入型號額外說明或規格 (選填)" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </PageCard>
  );
}