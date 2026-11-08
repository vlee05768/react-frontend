import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { App, Button, Card, Empty, Space, Spin, Tag, theme } from 'antd';
import Table from '@/components/Table/ErpTable';
import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import BomItemModal from './BomItemModal';
import { canUpdateBom as hasBomUpdatePermission } from './bomPermissions';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { bomHeaderFormConfig, bomItemTableColumns } from '../ProductConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { getApiMutationErrorMessage } from '@/utils/apiErrorDisplay';
import {
  createBom,
  deleteBomItem,
  getBom,
  type BomContract,
  type BomOutputType,
  type UpdateBomPayload,
  updateBom,
} from '@/api/bomCompatibility';

type SemiSpec = { materialForm: 'R' | 'S' | null; standardWidthMm: number | null; standardLength: number | null; standardThicknessMm: number | null; items: unknown[] };
type BomWithSpec = BomContract & { semiFinishedInspectionSpec?: SemiSpec | null };
const scaledDimension = (value: string) => {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'));
};
const dimension = z.string().refine(value => {
  if (!value) return true;
  if (!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/.test(value) || Number(value) <= 0) return false;
  const serialized = String(Number(value));
  return /^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(serialized) && scaledDimension(value) === scaledDimension(serialized);
}, '請輸入大於 0 且最多四位小數的數值');
const specPayload = (values: Record<string, unknown>, outputType: BomOutputType, original?: SemiSpec | null) => {
  if (outputType !== 'M') return {};
  const width = values.standardWidthMm as string || '';
  const length = values.standardLength as string || '';
  const standardWidthMm = width ? Number(width) : null;
  const standardLength = length ? Number(length) : null;
  if (standardWidthMm === (original?.standardWidthMm ?? null) && standardLength === (original?.standardLength ?? null)) return {};
  if (original && standardWidthMm === null && standardLength === null) return { semiFinishedInspectionSpec: null };
  return { semiFinishedInspectionSpec: { standardWidthMm, standardLength } };
};

interface Props {
  outputType: BomOutputType;
  outputCode: string;
  isViewMode: boolean;
  onEditingChange?: (isEditing: boolean) => void;
}

const toCreatePayload = (values: Record<string, unknown>, outputType: BomOutputType, outputCode: string) => ({
  ...specPayload(values, outputType),
  outputType,
  outputCode,
  defaultMachineType: values.defaultMachineType as string | undefined,
  defaultToolingRangeMm: values.defaultToolingRangeMm as number | undefined,
  defaultPunchHolesCount: values.defaultPunchHolesCount as number | undefined,
  pcsPerSheet: values.pcsPerSheet as number | undefined,
  notes: values.notes as string | undefined,
});

const toUpdatePayload = (values: Record<string, unknown>, outputType: BomOutputType, original?: SemiSpec | null): UpdateBomPayload => ({
  ...specPayload(values, outputType, original),
  isActive: values.isActive as boolean | undefined,
  defaultMachineType: values.defaultMachineType as string | undefined,
  defaultToolingRangeMm: values.defaultToolingRangeMm as number | undefined,
  defaultPunchHolesCount: values.defaultPunchHolesCount as number | undefined,
  pcsPerSheet: values.pcsPerSheet as number | undefined,
  notes: values.notes as string | undefined,
});

export default function ProductBom({ outputType, outputCode, isViewMode: isMasterViewMode, onEditingChange }: Props) {
  const canUpdateBom = useAuthStore(hasBomUpdatePermission);
  const { modal, message } = App.useApp();
  const { token } = theme.useToken();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);


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
  const canEditContent = isMasterViewMode && bomExists;
  const canUpdateContent = canEditContent && canUpdateBom;
  const isFormViewMode = !(isCreating || (isHeaderEditing && canUpdateContent));

  useEffect(() => {
    if (!canUpdateContent) {
      setIsHeaderEditing(false);
      if (editingItem) setItemModalOpen(false);
    }
  }, [canUpdateContent, editingItem]);

  const handleSaveHeader = async (values: Record<string, unknown>) => {
    if (!isMasterViewMode) return;
    if (bomExists && (!isHeaderEditing || !canEditContent || !hasBomUpdatePermission(useAuthStore.getState()))) return;
    if (!bomExists && !isCreating) return;
    try {
      if (!bomExists) {
        await createBom(toCreatePayload(values, outputType, outputCode));
        message.success('BOM 建立成功');
        setIsCreating(false);
      } else {
        await updateBom(outputType, outputCode, toUpdatePayload(values, outputType, (bomData as BomWithSpec)?.semiFinishedInspectionSpec));
        message.success('BOM 表頭更新成功');
        setIsHeaderEditing(false);
      }
      await refetch();
    } catch (error: unknown) {
      message.error(getApiMutationErrorMessage(error, '儲存失敗'));
    }
  };

  const handleDeleteItem = async (code: string) => {
    try {
      await deleteBomItem(outputType, outputCode, code);
      message.success('移除明細成功');
      await refetch();
    } catch (error: unknown) {
      message.error(getApiMutationErrorMessage(error, '移除失敗'));
    }
  };

  const actionColumn = {
    title: '操作',
    key: 'action',
    width: 100,
    render: (_: unknown, record: any) => (
      <div style={{ display: 'inline-flex', alignItems: 'center', height: '24px', verticalAlign: 'middle' }}>
        <Space size={0}>
        <Button type="text" size="small" className="text-blue-500 p-0" icon={<EditOutlined />} onClick={() => { if (!canEditContent || !hasBomUpdatePermission(useAuthStore.getState())) return; setEditingItem(record); setItemModalOpen(true); }} disabled={!canUpdateContent} />
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
  const spec = (bomData as BomWithSpec | null | undefined)?.semiFinishedInspectionSpec;
  const lengthLabel = spec?.materialForm === 'R' ? '標準長度 (m)' : spec?.materialForm === 'S' ? '標準長度 (mm)' : '標準長度 (捲料 m／片料 mm)';
  const headerFields = useMemo(() => {
    const fields = bomHeaderFormConfig({ outputType }).map((field) =>
      field.name === 'isActive' && bomExists ? { ...field, editable: 'always' as const } : field
    );
    if (outputType === 'M') fields.push(
      { name: 'standardWidthMm', label: '標準寬度 (mm)', componentType: 'Input', componentProps: { 'aria-label': '標準寬度 (mm)', inputMode: 'decimal' }, editable: 'always', validation: dimension, colSpan: 4 },
      { name: 'standardLength', label: lengthLabel, componentType: 'Input', componentProps: { 'aria-label': lengthLabel, inputMode: 'decimal' }, editable: 'always', validation: dimension, colSpan: 4 },
    );
    return fields;
  }, [outputType, bomExists, lengthLabel]);
  const headerDefaults: Record<string, unknown> = {
    ...(bomData ? { ...bomData, outputType: bomData.outputType || outputType || 'P' } : { outputType: outputType || 'P', outputCode, isActive: true }),
    ...(outputType === 'M' ? { standardWidthMm: spec?.standardWidthMm?.toString() ?? '', standardLength: spec?.standardLength?.toString() ?? '' } : {}),
  };

  if (isLoading) return <Spin className="w-full mt-10 flex justify-center" />;

  return (
    <div className="flex flex-col gap-4">
      {!bomExists && !isCreating && (
        <Empty description="尚未建立 BOM 表" className="mt-10">
          {isMasterViewMode && <Button type="primary" onClick={() => setIsCreating(true)}>建立 BOM</Button>}
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
                <Button
                  key="bom-header-save-btn"
                  type="primary"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={() => {
                    (document.getElementById('bomHeaderForm') as HTMLFormElement)?.requestSubmit();
                  }}
                >
                  儲存
                </Button>
                <Button
                  key="bom-header-cancel-btn"
                  size="small"
                  onClick={() => (isCreating ? setIsCreating(false) : setIsHeaderEditing(false))}
                >
                  取消
                </Button>
              </Space>
            ) : bomExists && isMasterViewMode ? (
              <Space>
                {canUpdateBom && (
                  <Button
                    key="bom-header-edit-btn"
                    type="primary"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      if (hasBomUpdatePermission(useAuthStore.getState())) setIsHeaderEditing(true);
                    }}
                  >
                    編輯
                  </Button>
                )}
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
          extra={isMasterViewMode && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); setItemModalOpen(true); }} disabled={!canEditContent || isHeaderEditing}>新增物料</Button>}
        >
          <Table
            bordered
            rowClassName={(record: any) => String(record.id || record.code) === deletingRecordId ? 'deleting-row-highlight' : ''}
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
