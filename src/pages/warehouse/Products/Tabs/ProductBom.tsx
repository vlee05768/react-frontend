import { useState, useEffect } from 'react';
import { Card, Button, message, Empty, Spin, Table, Popconfirm, Space, theme } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getApiV1BomByProductCode, postApiV1Bom, putApiV1BomByProductCode, deleteApiV1BomByProductCodeItemsByCode } from '@/api/generated/sdk.gen';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import BomItemModal from './BomItemModal';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { bomHeaderFormConfig, bomItemTableColumns } from '../ProductConfig';
import { buildTableColumns } from '@/utils/tableUtils';

interface Props {
  productCode: string;
  isViewMode: boolean; // Master view mode
  onEditingChange?: (isEditing: boolean) => void;
}

export default function ProductBom({ productCode, isViewMode: isMasterViewMode, onEditingChange }: Props) {
  const { token } = theme.useToken();
  
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);

  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(isHeaderEditing || isCreating);
    }
  }, [isHeaderEditing, isCreating, onEditingChange]);

  const { data: bomData, isLoading, refetch } = useQuery({
    queryKey: ['bom', productCode],
    queryFn: async () => {
      try {
        const res = await getApiV1BomByProductCode({ path: { productCode } });
        return res.data?.data;
      } catch (e: any) {
        if (e?.response?.status === 404 || e?.response?.status === 400 || (e && !e.response)) {
          return null;
        }
        throw e;
      }
    },
    enabled: !!productCode
  });

  const bomExists = !!bomData;

  const handleSaveHeader = async (values: any) => {
    try {
      const payload = { ...values, productCode };
      if (!bomExists) {
        await postApiV1Bom({ body: payload });
        message.success('BOM 表頭建立成功');
        setIsCreating(false);
      } else {
        await putApiV1BomByProductCode({ path: { productCode }, body: payload });
        message.success('BOM 表頭更新成功');
        setIsHeaderEditing(false);
      }
      refetch();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '儲存失敗');
    }
  };

  const handleCancelHeader = () => {
    if (isCreating) {
      setIsCreating(false);
    } else {
      setIsHeaderEditing(false);
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

  const showHeaderForm = bomExists || isCreating;
  const isFormViewMode = !(isHeaderEditing || isCreating);

  const actionColumn = {
    title: '操作',
    key: 'action',
    width: 100,
    render: (_: any, record: any) => (
      <Space>
        <Button 
          type="text" 
          className="text-blue-500 p-0" 
          icon={<EditOutlined />} 
          onClick={() => openEditItem(record)} 
          disabled={!isFormViewMode}
        />
        <Popconfirm title="確定移除？" onConfirm={() => handleDeleteItem(record.code)} disabled={!isFormViewMode}>
          <Button type="text" danger icon={<DeleteOutlined />} disabled={!isFormViewMode} />
        </Popconfirm>
      </Space>
    )
  };

  const columns = buildTableColumns(bomItemTableColumns(), actionColumn);

  return (
    <div className="flex flex-col gap-4">
      {!showHeaderForm && (
        <Empty
          description="尚未建立 BOM 表"
          className="mt-10"
        >
          {isMasterViewMode && (
            <Button type="primary" onClick={() => setIsCreating(true)}>
              產生 BOM
            </Button>
          )}
        </Empty>
      )}

      <div style={{ display: showHeaderForm ? 'block' : 'none' }}>
        <Card 
          size="small" 
          variant="borderless" 
          title="BOM 表頭"
          extra={
            !isFormViewMode ? (
              <Space>
                <Button type="primary" size="small" htmlType="submit" form="bomHeaderForm" icon={<SaveOutlined />}>儲存</Button>
                <Button size="small" onClick={handleCancelHeader}>取消</Button>
              </Space>
            ) : isMasterViewMode && bomExists ? (
              <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => setIsHeaderEditing(true)}>
                編輯
              </Button>
            ) : null
          }
          style={{ backgroundColor: token.colorFillAlter }}
        >
          <DynamicForm
            formId="bomHeaderForm"
            fields={bomHeaderFormConfig() as any}
            defaultValues={bomData || {}}
            onSubmit={handleSaveHeader}
            isViewMode={isFormViewMode}
            isUpdateMode={bomExists}
            hideDefaultFooter={true}
          />
        </Card>
      </div>

      {bomExists && (
        <Card 
          size="small" 
          title="材料明細" 
          variant="borderless"
          extra={
            isMasterViewMode && (
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />} 
                onClick={openCreateItem}
                disabled={!isFormViewMode}
              >
                新增物料
              </Button>
            )
          }
        >
          <Table
            virtual
            scroll={{ x: 1500, y: 400 }}
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
          existingMaterialCodes={bomData?.items?.map((item: any) => item.materialCode) || []}
          onSuccess={() => {
            setItemModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}