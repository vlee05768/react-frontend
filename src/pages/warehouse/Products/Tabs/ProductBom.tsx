import { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Button, message, Empty, Spin, Table, Popconfirm, Space, theme } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getApiV1BomByProductCode, postApiV1Bom, putApiV1BomByProductCode, deleteApiV1BomByProductCodeItemsByCode } from '@/api/generated/sdk.gen';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import BomItemModal from './BomItemModal'; // We will create this

interface Props {
  productCode: string;
  isViewMode: boolean;
}

export default function ProductBom({ productCode, isViewMode: isMasterViewMode }: Props) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: bomData, isLoading, refetch } = useQuery({
    queryKey: ['bom', productCode],
    queryFn: async () => {
      try {
        const res = await getApiV1BomByProductCode({ path: { productCode } });
        return res.data?.data;
      } catch (e: any) {
        if (e?.response?.status === 404 || e?.response?.status === 400) {
          return null; // No BOM yet
        }
        throw e;
      }
    },
    enabled: !!productCode
  });

  const bomExists = !!bomData;

  useEffect(() => {
    if (bomData) {
      form.setFieldsValue(bomData);
    }
  }, [bomData, form]);

  const handleSaveHeader = async (values: any) => {
    try {
      const payload = { ...values, productCode };
      if (!bomExists) {
        await postApiV1Bom({ body: payload });
        message.success('BOM 表頭建立成功');
      } else {
        await putApiV1BomByProductCode({ path: { productCode }, body: payload });
        message.success('BOM 表頭更新成功');
      }
      refetch();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '儲存失敗');
    }
  };

  const handleDeleteItem = async (code: string) => {
    try {
      await deleteApiV1BomByProductCodeItemsByCode({ path: { productCode, code } });
      message.success('移除明細成功');
      refetch();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '移除失敗');
    }
  };

  const openCreateItem = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };

  const openEditItem = (item: any) => {
    setEditingItem(item);
    setItemModalOpen(true);
  };

  if (isLoading) {
    return <Spin className="w-full mt-10 flex justify-center" />;
  }

  if (!bomExists && !form.isFieldsTouched()) {
    return (
      <Empty
        description="尚未建立 BOM 表"
        className="mt-10"
      >
        {isMasterViewMode && (
          <Button type="primary" onClick={() => form.setFieldsValue({ defaultMachineType: '' })}>
            立即建立 BOM
          </Button>
        )}
      </Empty>
    );
  }

  const columns = [
    { title: '原料編號', dataIndex: 'materialCode', key: 'materialCode', width: 120 },
    { title: '原料名稱', dataIndex: 'materialName', key: 'materialName', width: 150 },
    { title: '用量', dataIndex: 'quantity', key: 'quantity', width: 100 },
    { title: '損耗率(%)', dataIndex: 'scrapRate', key: 'scrapRate', width: 100 },
    { title: '備註', dataIndex: 'notes', key: 'notes', width: 150 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => isMasterViewMode ? (
        <Space>
          <Button type="text" className="text-blue-500 p-0" icon={<EditOutlined />} onClick={() => openEditItem(record)} />
          <Popconfirm title="確定移除？" onConfirm={() => handleDeleteItem(record.code)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) : null
    }
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card size="small" title="BOM 表頭設定" bordered={false} style={{ backgroundColor: token.colorFillAlter }}>
        <Form form={form} layout="vertical" onFinish={handleSaveHeader} disabled={!isMasterViewMode}>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="defaultMachineType" label="預設機型">
              <Input placeholder={!isMasterViewMode ? '' : '例如: 沖床'} />
            </Form.Item>
            <Form.Item name="defaultToolingRangeMm" label="預設跳距(mm)">
              <InputNumber className="w-full" placeholder={!isMasterViewMode ? '' : '0.00'} />
            </Form.Item>
            <Form.Item name="defaultPunchHolesCount" label="預設刀穴數">
              <InputNumber className="w-full" placeholder={!isMasterViewMode ? '' : '1'} />
            </Form.Item>
            <Form.Item name="pcsPerSheet" label="PCS/單張片數">
              <InputNumber className="w-full" placeholder={!isMasterViewMode ? '' : '1'} />
            </Form.Item>
            <Form.Item name="notes" label="備註" className="col-span-2">
              <Input placeholder={!isMasterViewMode ? '' : '備註'} />
            </Form.Item>
          </div>
          {isMasterViewMode && (
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              儲存表頭
            </Button>
          )}
        </Form>
      </Card>

      {bomExists && (
        <Card 
          size="small" 
          title="BOM 明細項目" 
          bordered={false}
          extra={
            isMasterViewMode && (
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreateItem}>
                新增物料
              </Button>
            )
          }
        >
          <Table
            columns={columns}
            dataSource={bomData?.items || []}
            rowKey="code"
            size="small"
            pagination={false}
          />
        </Card>
      )}

      {itemModalOpen && (
        <BomItemModal
          open={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          productCode={productCode}
          initialData={editingItem}
          onSuccess={() => {
            setItemModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
