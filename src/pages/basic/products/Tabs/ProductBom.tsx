import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Empty, message, Space, Spin, Switch, Table, Tag, theme } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import BomItemModal from './BomItemModal';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { bomHeaderFormConfig, bomItemTableColumns } from '../ProductConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import {
  createBom,
  deleteBomItem,
  getBom,
  type BomContract,
  type BomOutputType,
  type UpdateBomPayload,
  updateBom,
} from '@/api/bomCompatibility';

interface Props {
  outputType: BomOutputType;
  outputCode: string;
  isViewMode: boolean;
  onEditingChange?: (isEditing: boolean) => void;
}

const toCreatePayload = (values: Record<string, unknown>, outputType: BomOutputType, outputCode: string) => ({
  outputType: (values.outputType as BomOutputType) || outputType || 'P',
  outputCode: (values.outputCode as string) || outputCode,
  defaultMachineType: values.defaultMachineType as string | undefined,
  defaultToolingRangeMm: values.defaultToolingRangeMm as number | undefined,
  defaultPunchHolesCount: values.defaultPunchHolesCount as number | undefined,
  pcsPerSheet: values.pcsPerSheet as number | undefined,
  notes: values.notes as string | undefined,
});

const toUpdatePayload = (values: Partial<BomContract>): UpdateBomPayload => ({
  defaultMachineType: values.defaultMachineType as string | undefined,
  defaultToolingRangeMm: values.defaultToolingRangeMm as number | undefined,
  defaultPunchHolesCount: values.defaultPunchHolesCount as number | undefined,
  pcsPerSheet: values.pcsPerSheet as number | undefined,
  notes: values.notes as string | undefined,
});

const toActivePayload = (isActive: boolean): UpdateBomPayload => ({ isActive });

export default function ProductBom({ outputType, outputCode, isViewMode: isMasterViewMode, onEditingChange }: Props) {
  const { modal } = App.useApp();
  const { token } = theme.useToken();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);
  const [isChangingActive, setIsChangingActive] = useState(false);

  useEffect(() => {
    onEditingChange?.(isHeaderEditing || isCreating || itemModalOpen);
  }, [isHeaderEditing, isCreating, itemModalOpen, onEditingChange]);

  const { data: bomData, isLoading, refetch } = useQuery({
    queryKey: ['bom', outputType, outputCode],
    queryFn: async (): Promise<BomContract | null> => {
      try {
        const res = await getBom(outputType, outputCode);
        return ((res.data as any)?.data ?? res.data ?? null) as BomContract | null;
      } catch (error: any) {
        if (error?.response?.status === 404 || error?.response?.status === 400 || !error?.response) return null;
        throw error;
      }
    },
    enabled: Boolean(outputCode),
  });

  const bomExists = Boolean(bomData);
  const canEditContent = isMasterViewMode && bomData?.isActive === false;
  const isFormViewMode = !(isHeaderEditing || isCreating);

  const handleSaveHeader = async (values: Record<string, unknown>) => {
    try {
      if (!bomExists) {
        await createBom(toCreatePayload(values, outputType, outputCode));
        message.success('BOM 草稿建立成功');
        setIsCreating(false);
      } else {
        await updateBom(outputType, outputCode, toUpdatePayload(values));
        message.success('BOM 表頭更新成功');
        setIsHeaderEditing(false);
      }
      await refetch();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '儲存失敗');
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    if (!bomData) return;
    try {
      setIsChangingActive(true);
      await updateBom(outputType, outputCode, toActivePayload(isActive));
      message.success(isActive ? 'BOM 已啟用' : 'BOM 已停用，可編輯表頭與明細');
      await refetch();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '更新啟用狀態失敗');
    } finally {
      setIsChangingActive(false);
    }
  };

  const handleDeleteItem = async (code: string) => {
    try {
      await deleteBomItem(outputType, outputCode, code);
      message.success('移除明細成功');
      await refetch();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '移除失敗');
    }
  };

  const actionColumn = {
    title: '操作',
    key: 'action',
    width: 100,
    render: (_: unknown, record: any) => (
      <div style={{ display: 'inline-flex', alignItems: 'center', height: '24px', verticalAlign: 'middle' }}>
        <Space size={0}>
        <Button type="text" size="small" className="text-blue-500 p-0" icon={<EditOutlined />} onClick={() => { setEditingItem(record); setItemModalOpen(true); }} disabled={!canEditContent} />
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={!canEditContent}
          onClick={() => {
            const recordId = record.id || record.code;
            setDeletingRecordId(String(recordId));
            modal.confirm({
              title: `刪除確認 - ${record.materialCode || record.code || '此資料'}`,
              content: '確定移除？此操作無法還原。',
              centered: true,
              width: 400,
              okButtonProps: { danger: true },
              onOk: async () => {
                setDeletingRecordId(null);
                await handleDeleteItem(record.code);
              },
              onCancel: () => setDeletingRecordId(null),
            });
          }}
        />
        </Space>
      </div>
    ),
  };

  const columns = buildTableColumns(bomItemTableColumns(), actionColumn);
  const headerFields = useMemo(() => bomHeaderFormConfig({ outputType }), [outputType]);
  const headerDefaults: Record<string, unknown> = bomData
    ? { ...bomData, outputType: bomData.outputType || outputType || 'P' }
    : { outputType: outputType || 'P', outputCode, isActive: false };

  if (isLoading) return <Spin className="w-full mt-10 flex justify-center" />;

  return (
    <div className="flex flex-col gap-4">
      {!bomExists && !isCreating && (
        <Empty description="尚未建立 BOM 表" className="mt-10">
          {isMasterViewMode && <Button type="primary" onClick={() => setIsCreating(true)}>建立 BOM 草稿</Button>}
        </Empty>
      )}

      {(bomExists || isCreating) && (
        <Card
          size="small"
          variant="borderless"
          title={<Space><span>BOM 表頭</span><Tag>{outputType === 'P' ? '成品 (P)' : '半成品 (M)'}</Tag><span>{bomData?.outputName || outputCode}</span></Space>}
          extra={
            !isFormViewMode ? (
              <Space>
                <Button type="primary" size="small" htmlType="submit" form="bomHeaderForm" icon={<SaveOutlined />}>儲存</Button>
                <Button size="small" onClick={() => isCreating ? setIsCreating(false) : setIsHeaderEditing(false)}>取消</Button>
              </Space>
            ) : bomExists && isMasterViewMode ? (
              <Space>
                <span>是否啟用</span>
                <Switch checked={Boolean(bomData?.isActive)} loading={isChangingActive} onChange={handleToggleActive} />
                {!bomData?.isActive && <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => setIsHeaderEditing(true)}>編輯</Button>}
              </Space>
            ) : null
          }
          style={{ backgroundColor: token.colorFillAlter }}
        >
          <DynamicForm
            formId="bomHeaderForm"
            fields={headerFields as any}
            defaultValues={headerDefaults}
            onSubmit={handleSaveHeader}
            isViewMode={isFormViewMode}
            isUpdateMode={bomExists}
            hideDefaultFooter
          />
        </Card>
      )}

      {bomExists && (
        <Card
          size="small"
          variant="borderless"
          title="材料明細"
          extra={isMasterViewMode && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); setItemModalOpen(true); }} disabled={!canEditContent}>新增物料</Button>}
        >
          <Table
            bordered
            rowClassName={(record: any) => String(record.id || record.code) === deletingRecordId ? 'deleting-row-highlight' : ''}
            virtual
            scroll={{ x: 'max-content', y: 400 }}
            columns={columns}
            dataSource={bomData?.items || []}
            rowKey="code"
            size="small"
            pagination={false}
          />
        </Card>
      )}

      {itemModalOpen && bomData && (
        <BomItemModal
          open={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          outputType={outputType}
          outputCode={outputCode}
          initialData={editingItem}
          existingMaterialCodes={bomData.items?.map((item) => item.materialCode) || []}
          onSuccess={async () => { setItemModalOpen(false); await refetch(); }}
        />
      )}
    </div>
  );
}
