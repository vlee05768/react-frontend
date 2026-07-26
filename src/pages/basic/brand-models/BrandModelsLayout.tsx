import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Form, message, Tag, Space, Typography, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';
import PageCard from '@/components/common/PageCard';
import { 
  getApiV1GeneralTypes, 
  deleteApiV1GeneralTypesById, 
  putApiV1GeneralTypesById, 
  postApiV1GeneralTypes 
} from '@/api/generated';
import { useAuthStore } from '@/stores/useAuthStore';

const { Text } = Typography;

export default function BrandModelsLayout() {
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
  
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // Modals state
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [editingModel, setEditingModel] = useState<any | null>(null);

  const [brandForm] = Form.useForm();
  const [modelForm] = Form.useForm();

  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('BasicData.BrandModels.Create');
  const canUpdate = hasPermission('BasicData.BrandModels.Update');
  const canDelete = hasPermission('BasicData.BrandModels.Delete');

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand.code);
    } else {
      setModels([]);
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const res = await getApiV1GeneralTypes({
        query: {
          Type: ['MaterialBrand'],
          Code: brandSearch || undefined,
          pageSize: -1, 
        }
      });
      if ((res.data as any)?.success) {
        setBrands((res.data?.data as any)?.data || []);
        if (selectedBrand && !(res.data?.data as any)?.data?.find((b: any) => b.code === selectedBrand.code)) {
          setSelectedBrand(null);
        }
      } else {
        message.error((res.data as any)?.message || '載入廠牌失敗');
      }
    } catch (error: any) {
      message.error(error.message || '載入廠牌失敗');
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchModels = async (brandCode: string) => {
    setLoadingModels(true);
    try {
      const res = await getApiV1GeneralTypes({
        query: {
          Type: ['MaterialModel'],
          Code2: brandCode, 
          Code: modelSearch || undefined,
          pageSize: -1,
        }
      });
      if ((res.data as any)?.success) {
        setModels((res.data?.data as any)?.data || []);
      } else {
        message.error((res.data as any)?.message || '載入型號失敗');
      }
    } catch (error: any) {
      message.error(error.message || '載入型號失敗');
    } finally {
      setLoadingModels(false);
    }
  };

  // --- Brand Actions ---
  const handleAddBrand = () => {
    setEditingBrand(null);
    brandForm.resetFields();
    setBrandModalVisible(true);
  };

  const handleEditBrand = (e: React.MouseEvent, record: any) => {
    e.stopPropagation(); 
    setEditingBrand(record);
    brandForm.setFieldsValue({
      code: record.code,
      desc: record.desc,
    });
    setBrandModalVisible(true);
  };

  const handleDeleteBrand = (e: React.MouseEvent, record: any) => {
    e.stopPropagation();
    Modal.confirm({
      title: '確定要刪除廠牌嗎？',
      icon: <ExclamationCircleOutlined />,
      content: `您確定要刪除「${record.desc || record.code}」嗎？若該廠牌下還有綁定型號則無法刪除。`,
      okText: '刪除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const checkRes = await getApiV1GeneralTypes({
             query: {
               Type: ['MaterialModel'],
               Code2: record.code,
               pageSize: 1
             }
          });
          if ((checkRes.data as any)?.data?.data && (checkRes.data as any)?.data?.data.length > 0) {
             message.error('此廠牌下仍有綁定型號，請先清空型號後再刪除。');
             return;
          }

          const res = await deleteApiV1GeneralTypesById({ path: { id: record.id } });
          if ((res.data as any)?.success) {
            message.success('廠牌刪除成功');
            if (selectedBrand?.id === record.id) setSelectedBrand(null);
            fetchBrands();
          } else {
            message.error((res.data as any)?.message || '廠牌刪除失敗');
          }
        } catch (error: any) {
          message.error(error.message || '廠牌刪除失敗');
        }
      },
    });
  };

  const onBrandModalOk = async () => {
    try {
      const values = await brandForm.validateFields();
      
      const payload = {
        type: 'MaterialBrand',
        code: values.code?.toUpperCase(),
        desc: values.desc,
      };

      if (editingBrand) {
        const res = await putApiV1GeneralTypesById({
          path: { id: editingBrand.id },
          body: payload
        });
        if ((res.data as any)?.success) {
          message.success('廠牌更新成功');
          setBrandModalVisible(false);
          fetchBrands();
          if (selectedBrand?.id === editingBrand.id) {
             setSelectedBrand({ ...selectedBrand, ...payload });
          }
        } else {
          message.error((res.data as any)?.message || '廠牌更新失敗');
        }
      } else {
        const res = await postApiV1GeneralTypes({
          body: payload
        });
        if ((res.data as any)?.success) {
          message.success('廠牌新增成功');
          setBrandModalVisible(false);
          fetchBrands();
        } else {
          message.error((res.data as any)?.message || '廠牌新增失敗');
        }
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  // --- Model Actions ---
  const handleAddModel = () => {
    if (!selectedBrand) {
      message.warning('請先選擇左側廠牌');
      return;
    }
    setEditingModel(null);
    modelForm.resetFields();
    setModelModalVisible(true);
  };

  const handleEditModel = (e: React.MouseEvent, record: any) => {
    e.stopPropagation();
    setEditingModel(record);
    modelForm.setFieldsValue({
      code: record.code,
      desc: record.desc,
    });
    setModelModalVisible(true);
  };

  const handleDeleteModel = (e: React.MouseEvent, record: any) => {
    e.stopPropagation();
    Modal.confirm({
      title: '確定要刪除型號嗎？',
      icon: <ExclamationCircleOutlined />,
      content: `您確定要刪除「${record.code}」嗎？`,
      okText: '刪除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const res = await deleteApiV1GeneralTypesById({ path: { id: record.id } });
          if ((res.data as any)?.success) {
            message.success('型號刪除成功');
            fetchModels(selectedBrand.code);
          } else {
            message.error((res.data as any)?.message || '型號刪除失敗');
          }
        } catch (error: any) {
          message.error(error.message || '型號刪除失敗');
        }
      },
    });
  };

  const onModelModalOk = async () => {
    try {
      const values = await modelForm.validateFields();
      
      const payload = {
        type: 'MaterialModel',
        code: values.code?.toUpperCase(),
        desc: values.desc,
        code2: selectedBrand.code 
      };

      if (editingModel) {
        const res = await putApiV1GeneralTypesById({
          path: { id: editingModel.id },
          body: payload
        });
        if ((res.data as any)?.success) {
          message.success('型號更新成功');
          setModelModalVisible(false);
          fetchModels(selectedBrand.code);
        } else {
          message.error((res.data as any)?.message || '型號更新失敗');
        }
      } else {
        const res = await postApiV1GeneralTypes({
          body: payload
        });
        if ((res.data as any)?.success) {
          message.success('型號新增成功');
          setModelModalVisible(false);
          fetchModels(selectedBrand.code);
        } else {
          message.error((res.data as any)?.message || '型號新增失敗');
        }
      }
    } catch (error: any) {
      console.error(error);
    }
  };

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
    <PageCard title="品牌型號管理">
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
          
          <div className="flex-1 overflow-auto">
            <Table
              dataSource={brands}
              columns={brandColumns}
              rowKey="id"
              pagination={false}
              loading={loadingBrands}
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

          <div className="flex-1 overflow-auto">
            {selectedBrand ? (
              <Table
                dataSource={models}
                columns={modelColumns}
                rowKey="id"
                pagination={false}
                loading={loadingModels}
                size="small"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <Text type="secondary">請先從左側選擇一個廠牌</Text>
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
        destroyOnClose
      >
        <Form form={brandForm} layout="vertical">
          <Form.Item
            name="code"
            label="廠牌代碼"
            rules={[
              { required: true, message: '請輸入廠牌代碼' },
              { max: 5, message: '廠牌代碼最多 5 碼' },
              { pattern: /^[A-Z0-9]+$/, message: '廠牌代碼僅限輸入英文字母與數字' }
            ]}
            extra="最多 5 碼，僅限英文字母與數字，小寫將自動轉大寫。"
          >
            <Input 
              placeholder="例如：3M, NITTO" 
              disabled={!!editingBrand} 
              onChange={(e) => {
                const val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
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
        destroyOnClose
      >
        <Form form={modelForm} layout="vertical">
          <Form.Item
            name="code"
            label="型號代碼"
            rules={[
              { required: true, message: '請輸入型號代碼' },
              { pattern: /^[A-Za-z0-9_]+$/, message: '型號代碼不可輸入中文或連字號 (-)，僅限英數字與底線 (_)' }
            ]}
            extra="儲存時英文將自動轉大寫，且不允許包含連字號 (-)。"
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
