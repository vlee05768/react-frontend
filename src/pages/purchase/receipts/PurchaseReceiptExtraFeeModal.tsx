import { useMemo, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Modal, Space, Table, Tag, Typography } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { AdjustPurchaseReceiptExtraFeeResultDto, PurchaseReceiptExtraFeeItemInputDto } from '@/api/generated/types.gen';
import { postApiV1PurchaseReceiptByCodeExtraFeeExecute, postApiV1PurchaseReceiptByCodeExtraFeePreview } from '@/api/generated/sdk.gen';
import { useAuthStore } from '@/stores/useAuthStore';
import { getApiMutationErrorMessage } from '@/utils/apiErrorDisplay';

interface Props { open: boolean; code: string; initialItems: PurchaseReceiptExtraFeeItemInputDto[]; onClose: () => void; }
type FeeRow = PurchaseReceiptExtraFeeItemInputDto & { key: string };
const money = (value?: number | null) => value == null ? '-' : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PurchaseReceiptExtraFeeModal({ open, code, initialItems, onClose }: Props) {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const canSettle = useAuthStore(s => s.hasPermission('ProductionQuality.WorkOrders.CostSettlement'));
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [preview, setPreview] = useState<AdjustPurchaseReceiptExtraFeeResultDto | null>(null);
  const [form] = Form.useForm();
  const feeItems = useMemo(() => rows.map(({ key: _key, ...row }) => row), [rows]);
  const previewMutation = useMutation({
    mutationFn: () => postApiV1PurchaseReceiptByCodeExtraFeePreview({ path: { code }, body: { extraFeeItems: feeItems } }),
    onSuccess: res => setPreview(res.data?.data ?? null),
    onError: err => modal.error({ title: '附加費預覽失敗', content: getApiMutationErrorMessage(err, '附加費預覽失敗') }),
  });
  const executeMutation = useMutation({
    mutationFn: () => postApiV1PurchaseReceiptByCodeExtraFeeExecute({ path: { code }, body: { extraFeeItems: feeItems } }),
    onSuccess: res => {
      const result = res.data?.data;
      message.success('進貨單附加費已更新，相關 LPN 成本已重算');
      onClose();
      const numbers = [...new Set((result?.affectedWorkOrders ?? []).map(x => x.workOrderNumber).filter((x): x is string => Boolean(x)))];
      if (numbers.length && canSettle) navigate('/production-quality/work-order-cost-settlement', { state: { workOrderNumbers: numbers } });
      else if (numbers.length) message.info(`受影響製令：${numbers.join('、')}；您沒有製令成本結算權限，請聯絡管理員。`);
    },
    onError: err => modal.error({ title: '附加費更新失敗', content: getApiMutationErrorMessage(err, '附加費更新失敗') }),
  });
  const addRow = (values: PurchaseReceiptExtraFeeItemInputDto) => {
    setRows(current => [...current, { ...values, key: `${Date.now()}-${current.length}`, quantity: values.quantity ?? 1 }]);
    form.resetFields(); setPreview(null);
  };
  return <Modal title={`進貨單 ${code}｜補登／調整附加費`} open={open} onCancel={onClose} width={1000} styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }} footer={[
    <Button key="close" onClick={onClose}>關閉</Button>,
    <Button key="preview" type="primary" ghost loading={previewMutation.isPending} onClick={() => { setPreview(null); previewMutation.mutate(); }}>預覽成本變動</Button>,
    <Button key="execute" danger loading={executeMutation.isPending} disabled={!preview || previewMutation.isPending} onClick={() => modal.confirm({ title: '確認更新進貨單附加費？', content: '確認後會立即更新附加費及受影響 LPN、領料單價與原料估算成本。此操作不可直接復原。', okText: '確認更新', cancelText: '返回', onOk: () => executeMutation.mutateAsync() })}>確認執行</Button>,
  ]}>
    <Typography.Paragraph type="secondary">費用明細會取代本進貨單既有附加費。先預覽受影響成本，再確認執行。</Typography.Paragraph>
    <Form form={form} layout="inline" onFinish={addRow} initialValues={{ quantity: 1 }}>
      <Form.Item name="materialCode" label="費用代碼"><Input placeholder="預設 EXTRA-FEE" /></Form.Item>
      <Form.Item name="quantity" label="數量"><InputNumber min={0} precision={4} /></Form.Item>
      <Form.Item name="unitPrice" label="單價" rules={[{ required: true }]}><InputNumber min={0} precision={2} /></Form.Item>
      <Form.Item name="notes" label="說明"><Input /></Form.Item>
      <Button htmlType="submit">新增費用</Button>
    </Form>
    <Table size="small" bordered rowKey="key" pagination={false} dataSource={rows} columns={[
      { title: '費用代碼', dataIndex: 'materialCode', render: (v: string) => v || 'EXTRA-FEE' },
      { title: '數量', dataIndex: 'quantity' }, { title: '單價', dataIndex: 'unitPrice' }, { title: '說明', dataIndex: 'notes' },
      { title: '操作', render: (_: unknown, row: FeeRow) => <Button size="small" danger onClick={() => { setRows(current => current.filter(x => x.key !== row.key)); setPreview(null); }}>移除</Button> },
    ]} />
    {initialItems.length > 0 && rows.length === 0 && <Button className="mt-2" onClick={() => { setRows(initialItems.map((r, i) => ({ ...r, key: `existing-${i}` }))); setPreview(null); }}>載入既有附加費明細</Button>}
    {preview && <>
      <Typography.Title level={5}>預覽摘要</Typography.Title>
      <Space wrap><Tag>附加費：{money(preview.previousExtraFeeTotal)} → {money(preview.newExtraFeeTotal)}</Tag><Tag>影響 LPN：{preview.affectedRollCount ?? preview.affectedRolls?.length ?? 0}</Tag><Tag>影響製令：{preview.affectedWorkOrderCount ?? preview.affectedWorkOrders?.length ?? 0}</Tag></Space>
      <Table className="mt-3" size="small" bordered rowKey={(r) => r.rollNo ?? `${r.materialCode}-${r.sourceDocLine}`} dataSource={preview.affectedRolls ?? []} pagination={{ pageSize: 8 }} columns={[
        { title: 'LPN', dataIndex: 'rollNo' }, { title: '物料', dataIndex: 'materialCode' }, { title: '母卷 LPN', dataIndex: 'parentRollNo' }, { title: '來源行號', dataIndex: 'sourceDocLine' },
        { title: '類型', render: (_: unknown, r: NonNullable<AdjustPurchaseReceiptExtraFeeResultDto['affectedRolls']>[number]) => r.isSplitChild ? <Tag>分切子卷</Tag> : r.previousCostPerPiece != null ? <Tag color="blue">片料</Tag> : <Tag color="green">卷料</Tag> },
        { title: '每㎡成本', render: (_: unknown, r: NonNullable<AdjustPurchaseReceiptExtraFeeResultDto['affectedRolls']>[number]) => `${money(r.previousCostPerSqm)} → ${money(r.newCostPerSqm)}` },
        { title: '每片成本', render: (_: unknown, r: NonNullable<AdjustPurchaseReceiptExtraFeeResultDto['affectedRolls']>[number]) => `${money(r.previousCostPerPiece)} → ${money(r.newCostPerPiece)}` },
      ]} />
      <Table className="mt-3" size="small" bordered rowKey={(r) => r.workOrderNumber ?? ''} dataSource={preview.affectedWorkOrders ?? []} pagination={false} columns={[
        { title: '製令單號', dataIndex: 'workOrderNumber' }, { title: '類別', dataIndex: 'workOrderType' }, { title: '產出代碼', dataIndex: 'outputCode' }, { title: '狀態', dataIndex: 'status' },
      ]} />
    </>}
  </Modal>;
}
