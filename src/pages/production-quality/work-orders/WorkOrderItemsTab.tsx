import React, { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Space,
  Table as AntTable,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  ScissorOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Table from '@/components/Table/ErpTable';
import type { WorkOrderFormValues } from './WorkOrderConfig';
import {
  createWorkOrderMaterial,
  deleteWorkOrderMaterialByLine,
  getAvailableMaterialWidths,
  updateWorkOrderMaterialByLine,
  type AvailableMaterialWidthDto,
  type WorkOrderMaterialExtendedDto,
} from '@/api/workOrderWorkflowApi';
import { getApiMutationErrorMessage } from '@/utils/apiErrorDisplay';

interface WorkOrderItemsTabProps {
  masterData: WorkOrderFormValues;
  isMasterViewMode: boolean;
  onEditingChange?: (isEditing: boolean) => void;
}

type ModalMode = 'edit' | 'split';

const resolveMaterialForm = (item: WorkOrderMaterialExtendedDto): 'R' | 'S' => {
  if (item.materialForm === 'R' || item.materialForm === 'S') {
    return item.materialForm;
  }
  const code = item.materialCode || '';
  if (code.startsWith('R-') || code.endsWith('-R')) return 'R';
  return 'S';
};

export const WorkOrderItemsTab: React.FC<WorkOrderItemsTabProps> = ({
  masterData,
  isMasterViewMode,
  onEditingChange,
}) => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const listData: WorkOrderMaterialExtendedDto[] = useMemo(
    () => (Array.isArray(masterData.items) ? masterData.items : []),
    [masterData.items],
  );

  const isSpecConfirmed = Boolean(masterData.materialSpecConfirmDate);
  const canOperate = !isSpecConfirmed && isMasterViewMode && Boolean(masterData.workOrderNumber);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('edit');
  const [targetItem, setTargetItem] = useState<WorkOrderMaterialExtendedDto | null>(null);
  const [form] = Form.useForm<{
    materialWidth: number;
    requiredAmount: number;
    totalLength: number;
    specification?: string;
    storageCode?: string;
  }>();

  // 各料號出現次數與需求達標彙總
  const materialSummaryList = useMemo(() => {
    const map = new Map<
      string,
      {
        materialCode: string;
        materialName: string;
        form: 'R' | 'S';
        bomRequiredQuantity: number;
        bomWidth: number;
        currentTotal: number;
        lineCount: number;
        hasInvalidWidth: boolean;
      }
    >();

    for (const item of listData) {
      const code = item.materialCode || '';
      const formType = resolveMaterialForm(item);
      const bomReq = Number(item.bomRequiredQuantity ?? (formType === 'R' ? item.totalLength : item.requiredAmount) ?? 0);
      const bomWidth = Number(item.bomWidth ?? item.materialWidth ?? 0);
      const qtyContribution = formType === 'R' ? Number(item.totalLength ?? 0) : Number(item.requiredAmount ?? 0);
      const widthInvalid = Number(item.materialWidth ?? 0) < bomWidth;

      const existing = map.get(code);
      if (!existing) {
        map.set(code, {
          materialCode: code,
          materialName: item.materialName || '',
          form: formType,
          bomRequiredQuantity: bomReq,
          bomWidth,
          currentTotal: qtyContribution,
          lineCount: 1,
          hasInvalidWidth: widthInvalid,
        });
      } else {
        existing.currentTotal += qtyContribution;
        existing.lineCount += 1;
        if (widthInvalid) existing.hasInvalidWidth = true;
      }
    }

    return Array.from(map.values()).map((entry) => ({
      ...entry,
      isQuantityMet: entry.currentTotal >= entry.bomRequiredQuantity && entry.currentTotal > 0,
    }));
  }, [listData]);

  const lineCountByMaterial = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of materialSummaryList) {
      counts.set(s.materialCode, s.lineCount);
    }
    return counts;
  }, [materialSummaryList]);

  const openModal = (item: WorkOrderMaterialExtendedDto, mode: ModalMode = 'edit') => {
    setTargetItem(item);
    setModalMode(mode);
    form.setFieldsValue({
      materialWidth: Number(item.materialWidth ?? item.bomWidth ?? 0),
      requiredAmount: mode === 'split' ? 0 : Number(item.requiredAmount ?? 0),
      totalLength: mode === 'split' ? 0 : Number(item.totalLength ?? 0),
      specification: item.specification || '',
      storageCode: item.storageCode || '',
    });
    setModalOpen(true);
    onEditingChange?.(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTargetItem(null);
    form.resetFields();
    onEditingChange?.(false);
  };

  const {
    data: availableWidths = [],
    isLoading: widthsLoading,
    error: widthsError,
  } = useQuery({
    queryKey: ['workorder-available-widths', masterData.workOrderNumber, targetItem?.materialCode],
    queryFn: () =>
      getAvailableMaterialWidths(masterData.workOrderNumber!, targetItem?.materialCode || ''),
    enabled: modalOpen && Boolean(masterData.workOrderNumber) && Boolean(targetItem?.materialCode),
  });

  const invalidateWorkOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['workorder', masterData.workOrderNumber] });
    queryClient.invalidateQueries({ queryKey: ['workorders'] });
  };

  const updateMutation = useMutation({
    mutationFn: (values: {
      lineNumber: string;
      materialWidth: number;
      requiredAmount: number;
      totalLength: number;
      specification?: string;
      storageCode?: string;
    }) =>
      updateWorkOrderMaterialByLine(masterData.workOrderNumber!, values.lineNumber, {
        materialCode: targetItem?.materialCode,
        materialName: targetItem?.materialName,
        materialWidth: values.materialWidth,
        requiredAmount: values.requiredAmount,
        totalLength: values.totalLength,
        specification: values.specification ?? null,
        storageCode: values.storageCode ?? null,
      }),
    onSuccess: () => {
      message.success('已更新用料寬度與需求量');
      invalidateWorkOrder();
      closeModal();
    },
    onError: (err) => {
      modal.error({
        title: '更新用料明細失敗',
        content: getApiMutationErrorMessage(err, '更新用料明細失敗'),
        centered: true,
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: {
      materialWidth: number;
      requiredAmount: number;
      totalLength: number;
      specification?: string;
      storageCode?: string;
    }) =>
      createWorkOrderMaterial(masterData.workOrderNumber!, {
        materialCode: targetItem?.materialCode || '',
        materialName: targetItem?.materialName ?? null,
        materialWidth: values.materialWidth,
        requiredAmount: values.requiredAmount,
        totalLength: values.totalLength,
        specification: values.specification ?? null,
        storageCode: values.storageCode ?? null,
      }),
    onSuccess: () => {
      message.success('已新增寬度拆分明細');
      invalidateWorkOrder();
      closeModal();
    },
    onError: (err) => {
      modal.error({
        title: '新增拆分明細失敗',
        content: getApiMutationErrorMessage(err, '新增拆分明細失敗'),
        centered: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (lineNumber: string) =>
      deleteWorkOrderMaterialByLine(masterData.workOrderNumber!, lineNumber),
    onSuccess: () => {
      message.success('已刪除拆分項次');
      invalidateWorkOrder();
    },
    onError: (err) => {
      modal.error({
        title: '刪除項次失敗',
        content: getApiMutationErrorMessage(err, '刪除項次失敗'),
        centered: true,
      });
    },
  });

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!targetItem) return;

      const minWidth = Number(targetItem.bomWidth ?? 0);
      if (values.materialWidth < minWidth) {
        message.warning(`確認幅寬 (${values.materialWidth} mm) 不可小於原 BOM 幅寬 (${minWidth} mm)`);
        return;
      }

      if (modalMode === 'edit') {
        await updateMutation.mutateAsync({
          lineNumber: targetItem.lineNumber || '',
          ...values,
        });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      // 表單驗證失敗由 Form.Item 顯示
    }
  };

  const handleDeleteLine = (item: WorkOrderMaterialExtendedDto) => {
    const lineNum = item.lineNumber || '';
    const matCode = item.materialCode || '';
    const count = lineCountByMaterial.get(matCode) ?? 1;
    if (count <= 1) {
      message.warning('每個原料至少需保留一筆明細，最後一筆禁止刪除');
      return;
    }

    modal.confirm({
      title: '確認刪除拆分項次',
      content: `確定要刪除項次 ${lineNum}（${matCode}，寬度 ${item.materialWidth} mm）嗎？`,
      okText: '確認刪除',
      cancelText: '取消',
      centered: true,
      onOk: () => deleteMutation.mutateAsync(lineNum),
    });
  };

  const columns = [
    ...(canOperate
      ? [
          {
            title: '操作',
            key: 'action',
            width: 170,
            fixed: 'left' as const,
            align: 'center' as const,
            render: (_: unknown, record: WorkOrderMaterialExtendedDto) => {
              const count = lineCountByMaterial.get(record.materialCode || '') ?? 1;
              const isLastLine = count <= 1;
              return (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '24px',
                    verticalAlign: 'middle',
                    gap: '4px',
                  }}
                >
                  <Button
                    type="link"
                    size="small"
                    icon={<ScissorOutlined />}
                    onClick={() => openModal(record, 'edit')}
                  >
                    調整寬度／拆單
                  </Button>
                  <Tooltip
                    title={isLastLine ? '最後一筆明細不可刪除' : '刪除此拆分項次'}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      aria-label={`刪除項次 ${record.lineNumber}`}
                      icon={<DeleteOutlined />}
                      disabled={isLastLine || deleteMutation.isPending}
                      onClick={() => handleDeleteLine(record)}
                    />
                  </Tooltip>
                </div>
              );
            },
          },
        ]
      : []),
    {
      title: '項次',
      dataIndex: 'lineNumber',
      key: 'lineNumber',
      width: 140,
      align: 'left' as const,
      render: (val: string) => (
        <span
          style={{
            display: 'inline-block',
            lineHeight: '24px',
            verticalAlign: 'middle',
            width: '100%',
            textAlign: 'left',
          }}
        >
          {val || '-'}
        </span>
      ),
    },
    {
      title: '原料編號',
      dataIndex: 'materialCode',
      key: 'materialCode',
      width: 160,
      align: 'left' as const,
      render: (val: string) => (
        <span
          style={{
            display: 'inline-block',
            lineHeight: '24px',
            verticalAlign: 'middle',
            width: '100%',
            textAlign: 'left',
            fontWeight: 500,
          }}
        >
          {val}
        </span>
      ),
    },
    {
      title: '原料名稱',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 180,
      align: 'left' as const,
      ellipsis: true,
      render: (val: string | null | undefined) => (
        <span
          style={{
            display: 'inline-block',
            lineHeight: '24px',
            verticalAlign: 'middle',
            width: '100%',
            textAlign: 'left',
          }}
        >
          {val || '-'}
        </span>
      ),
    },
    {
      title: '型態',
      key: 'materialForm',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: WorkOrderMaterialExtendedDto) => {
        const formType = resolveMaterialForm(record);
        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '24px',
              verticalAlign: 'middle',
            }}
          >
            <Tag color={formType === 'R' ? 'cyan' : 'purple'} className="m-0">
              {formType === 'R' ? '捲' : '片'}
            </Tag>
          </div>
        );
      },
    },
    {
      title: '原 BOM 幅寬(mm)',
      dataIndex: 'bomWidth',
      key: 'bomWidth',
      width: 130,
      align: 'right' as const,
      render: (val: number | undefined, record: WorkOrderMaterialExtendedDto) => {
        const displayVal = val ?? record.materialWidth;
        return (
          <span
            style={{
              display: 'inline-block',
              lineHeight: '24px',
              verticalAlign: 'middle',
              width: '100%',
              textAlign: 'right',
            }}
          >
            {displayVal != null ? Number(displayVal).toLocaleString() : '-'}
          </span>
        );
      },
    },
    {
      title: '確認幅寬(mm)',
      dataIndex: 'materialWidth',
      key: 'materialWidth',
      width: 130,
      align: 'right' as const,
      render: (val: number | undefined, record: WorkOrderMaterialExtendedDto) => {
        const bomW = Number(record.bomWidth ?? 0);
        const curW = Number(val ?? 0);
        const isInvalid = curW < bomW;
        return (
          <span
            style={{
              display: 'inline-block',
              lineHeight: '24px',
              verticalAlign: 'middle',
              width: '100%',
              textAlign: 'right',
              fontWeight: 600,
              color: isInvalid ? 'var(--ant-color-error)' : undefined,
            }}
          >
            {val != null ? Number(val).toLocaleString() : '-'}
          </span>
        );
      },
    },
    {
      title: '用量',
      dataIndex: 'requiredAmount',
      key: 'requiredAmount',
      width: 100,
      align: 'right' as const,
      render: (val: number | undefined) => (
        <span
          style={{
            display: 'inline-block',
            lineHeight: '24px',
            verticalAlign: 'middle',
            width: '100%',
            textAlign: 'right',
          }}
        >
          {val != null ? Number(val).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: '總長(M)',
      dataIndex: 'totalLength',
      key: 'totalLength',
      width: 110,
      align: 'right' as const,
      render: (val: number | undefined) => (
        <span
          style={{
            display: 'inline-block',
            lineHeight: '24px',
            verticalAlign: 'middle',
            width: '100%',
            textAlign: 'right',
          }}
        >
          {val != null ? Number(val).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: '原展開基準需求量',
      dataIndex: 'bomRequiredQuantity',
      key: 'bomRequiredQuantity',
      width: 150,
      align: 'right' as const,
      render: (val: number | undefined, record: WorkOrderMaterialExtendedDto) => {
        const formType = resolveMaterialForm(record);
        const unit = formType === 'R' ? 'M' : 'PCS';
        return (
          <span
            style={{
              display: 'inline-block',
              lineHeight: '24px',
              verticalAlign: 'middle',
              width: '100%',
              textAlign: 'right',
            }}
          >
            {val != null ? `${Number(val).toLocaleString()} ${unit}` : '-'}
          </span>
        );
      },
    },
    {
      title: '儲位編號',
      dataIndex: 'storageCode',
      key: 'storageCode',
      width: 120,
      align: 'left' as const,
      ellipsis: true,
      render: (val: string | null | undefined) => (
        <span
          style={{
            display: 'inline-block',
            lineHeight: '24px',
            verticalAlign: 'middle',
            width: '100%',
            textAlign: 'left',
          }}
        >
          {val || '-'}
        </span>
      ),
    },
  ];

  const targetBomWidth = Number(targetItem?.bomWidth ?? 0);
  const targetForm = targetItem ? resolveMaterialForm(targetItem) : 'R';

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-wrap justify-between items-center gap-2 py-2 px-3 rounded-md"
        style={{ backgroundColor: 'var(--ant-color-fill-alter)' }}
      >
        <div style={{ color: 'var(--ant-color-text-secondary)' }}>
          目前共有 <span className="font-semibold">{listData.length}</span> 筆用料明細
          {isSpecConfirmed ? (
            <Tag color="geekblue" className="ml-2 m-0">
              已完成用料規格確認（明細已鎖定）
            </Tag>
          ) : (
            <Tag color="gold" className="ml-2 m-0">
              待用料規格確認（可調整幅寬與拆單）
            </Tag>
          )}
        </div>
        <div style={{ color: 'var(--ant-color-text-description)', fontSize: '12px' }}>
          {canOperate
            ? '請於此確認實際投入幅寬（須大於等於原 BOM 幅寬）或拆分為多筆不同寬度，確認後再進行領料。'
            : isSpecConfirmed
              ? '已完成用料規格確認，倉管領料將嚴格依確認幅寬進行精確寬度配對。'
              : '請先切換回製令檢視模式後再進行用料規格調整。'}
        </div>
      </div>

      {/* 同料號目前加總需求量 vs 原 BOM 展開需求量達標狀態 */}
      {materialSummaryList.length > 0 && (
        <div
          className="flex flex-wrap gap-2 p-2.5 rounded-md border"
          style={{
            borderColor: 'var(--ant-color-border-secondary)',
            backgroundColor: 'var(--ant-color-bg-container)',
          }}
        >
          {materialSummaryList.map((s) => {
            const unit = s.form === 'R' ? 'M' : 'PCS';
            const isOk = s.isQuantityMet && !s.hasInvalidWidth;
            return (
              <Tag
                key={s.materialCode}
                color={isOk ? 'success' : 'error'}
                icon={isOk ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                className="m-0 py-0.5 px-2"
              >
                <span className="font-mono font-semibold">{s.materialCode}</span>：
                目前加總 {s.currentTotal.toLocaleString()} {unit} / 原 BOM 需求{' '}
                {s.bomRequiredQuantity.toLocaleString()} {unit}（
                {isOk ? '已達標' : s.hasInvalidWidth ? '寬度低於 BOM' : '數量不足'}）
              </Tag>
            );
          })}
        </div>
      )}

      <div>
        <Table
          scroll={{ x: 'max-content', y: 400 }}
          bordered
          size="small"
          rowKey={(record: WorkOrderMaterialExtendedDto) =>
            record.lineNumber || `${record.materialCode}-${record.materialWidth}`
          }
          dataSource={listData}
          columns={columns}
          pagination={false}
        />
      </div>

      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>
              調整寬度／拆單 — {targetItem?.materialCode}（原 BOM 幅寬 {targetBomWidth} mm）
            </span>
          </Space>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleModalSubmit}
        okText={modalMode === 'edit' ? '儲存修改' : '新增拆單明細'}
        cancelText="取消"
        confirmLoading={updateMutation.isPending || createMutation.isPending}
        width={760}
        centered
        destroyOnHidden
      >
        <div className="flex flex-col gap-4 pt-2">
          <Radio.Group
            value={modalMode}
            onChange={(e) => {
              const nextMode = e.target.value as ModalMode;
              setModalMode(nextMode);
              if (targetItem) {
                form.setFieldsValue({
                  materialWidth: Number(targetItem.materialWidth ?? targetItem.bomWidth ?? 0),
                  requiredAmount: nextMode === 'split' ? 0 : Number(targetItem.requiredAmount ?? 0),
                  totalLength: nextMode === 'split' ? 0 : Number(targetItem.totalLength ?? 0),
                });
              }
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="edit">修改本項次 ({targetItem?.lineNumber})</Radio.Button>
            <Radio.Button value="split">新增同料號寬度拆單</Radio.Button>
          </Radio.Group>

          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              可用庫存寬度一覽（點擊列可帶入確認幅寬）
            </Typography.Text>
            {widthsError && (
              <Alert
                type="error"
                showIcon
                title={getApiMutationErrorMessage(widthsError, '查詢可用庫存寬度失敗')}
                className="mb-2"
              />
            )}
            <AntTable<AvailableMaterialWidthDto>
              size="small"
              bordered
              loading={widthsLoading}
              pagination={false}
              scroll={{ x: 'max-content', y: 180 }}
              rowKey={(r) => `${r.widthMm}-${r.lengthMm ?? 'R'}`}
              dataSource={availableWidths}
              onRow={(row) => ({
                onClick: () => {
                  form.setFieldValue('materialWidth', row.widthMm);
                  message.info(`已帶入可用幅寬 ${row.widthMm} mm`);
                },
                style: { cursor: 'pointer' },
              })}
              locale={{ emptyText: '目前無符合條件（幅寬 >= BOM 幅寬）之可用庫存' }}
              columns={[
                {
                  title: '可用幅寬 (mm)',
                  dataIndex: 'widthMm',
                  key: 'widthMm',
                  align: 'right',
                  render: (v: number) => (
                    <span
                      style={{
                        display: 'inline-block',
                        lineHeight: '24px',
                        verticalAlign: 'middle',
                        width: '100%',
                        textAlign: 'right',
                        fontWeight: 600,
                      }}
                    >
                      {Number(v).toLocaleString()} mm
                    </span>
                  ),
                },
                {
                  title: '型態',
                  dataIndex: 'materialForm',
                  key: 'materialForm',
                  align: 'center',
                  render: (v: string) => (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '24px',
                        verticalAlign: 'middle',
                      }}
                    >
                      <Tag color={v === 'R' ? 'cyan' : 'purple'} className="m-0">
                        {v === 'R' ? '捲料' : '片料'}
                      </Tag>
                    </div>
                  ),
                },
                {
                  title: '可用卷/包數',
                  dataIndex: 'availableRollCount',
                  key: 'availableRollCount',
                  align: 'right',
                  render: (v: number) => (
                    <span
                      style={{
                        display: 'inline-block',
                        lineHeight: '24px',
                        verticalAlign: 'middle',
                        width: '100%',
                        textAlign: 'right',
                      }}
                    >
                      {Number(v).toLocaleString()}
                    </span>
                  ),
                },
                {
                  title: targetForm === 'R' ? '可用總長 (M)' : '可用片數 (PCS)',
                  dataIndex: 'availableQuantity',
                  key: 'availableQuantity',
                  align: 'right',
                  render: (v: number, r) => (
                    <span
                      style={{
                        display: 'inline-block',
                        lineHeight: '24px',
                        verticalAlign: 'middle',
                        width: '100%',
                        textAlign: 'right',
                      }}
                    >
                      {Number(v).toLocaleString()} {r.materialForm === 'R' ? 'M' : 'PCS'}
                    </span>
                  ),
                },
                {
                  title: '可用總面積 (SQM)',
                  dataIndex: 'availableAreaSqm',
                  key: 'availableAreaSqm',
                  align: 'right',
                  render: (v: number) => (
                    <span
                      style={{
                        display: 'inline-block',
                        lineHeight: '24px',
                        verticalAlign: 'middle',
                        width: '100%',
                        textAlign: 'right',
                      }}
                    >
                      {Number(v).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ),
                },
              ]}
            />
          </div>

          <Form form={form} layout="vertical">
            <div className="grid grid-cols-3 gap-3">
              <Form.Item
                name="materialWidth"
                label={`確認幅寬 (mm，不可小於 ${targetBomWidth})`}
                rules={[
                  { required: true, message: '請輸入確認幅寬' },
                  {
                    validator: (_, val) => {
                      if (val == null || Number(val) < targetBomWidth) {
                        return Promise.reject(
                          new Error(`確認幅寬不可小於原 BOM 幅寬 ${targetBomWidth} mm`),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber min={targetBomWidth} precision={2} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="requiredAmount"
                label={targetForm === 'R' ? '用量 (張/捲參考)' : '用量 (片數 PCS)'}
                rules={[
                  { required: true, message: '請輸入用量' },
                  {
                    validator: (_, val) => {
                      if (targetForm === 'S' && (val == null || Number(val) <= 0)) {
                        return Promise.reject(new Error('片料用量必須大於 0'));
                      }
                      if (val != null && Number(val) < 0) {
                        return Promise.reject(new Error('不可為負數'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="totalLength"
                label="總長 (M)"
                rules={[
                  { required: true, message: '請輸入總長' },
                  {
                    validator: (_, val) => {
                      if (targetForm === 'R' && (val == null || Number(val) <= 0)) {
                        return Promise.reject(new Error('捲料總長必須大於 0'));
                      }
                      if (val != null && Number(val) < 0) {
                        return Promise.reject(new Error('不可為負數'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="storageCode" label="指定儲位">
                <Input placeholder="選填" maxLength={100} />
              </Form.Item>
              <Form.Item name="specification" label="規格說明">
                <Input placeholder="選填" maxLength={200} />
              </Form.Item>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};
