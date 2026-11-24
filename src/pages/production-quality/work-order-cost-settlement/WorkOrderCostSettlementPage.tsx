import React, { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Divider,
  Empty,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CalculatorOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import PageCard from '@/components/common/PageCard';
import { getApiV1Material, getApiV1Product } from '@/api/generated/sdk.gen';
import {
  executeWorkOrderCostSettlement,
  previewWorkOrderCostSettlement,
  type SettledWorkOrderCostItemDto,
  type SettlementOutputType,
  type SkippedWorkOrderCostItemDto,
  type SkippedWorkOrderReasonCode,
  type UpdatedProductCostItemDto,
  type WorkOrderCostSettlementRequestDto,
  type WorkOrderCostSettlementResultDto,
} from '@/api/workOrderCostSettlementApi';
import { getApiMutationErrorMessage } from '@/utils/apiErrorDisplay';

const { RangePicker } = DatePicker;

const REASON_CODE_LABELS: Record<SkippedWorkOrderReasonCode, { label: string; color: string }> = {
  PENDING_WIP_ROLLS: { label: '尚有未退 WIP 卷卡', color: 'warning' },
  MISSING_CONFIRMED_REQUISITION: { label: '缺少已確認領料單', color: 'error' },
  PENDING_QC_INSPECTION: { label: '待 QC 品檢完成', color: 'processing' },
  PENDING_IQC_INSPECTION: { label: '待 IQC 品檢完成', color: 'processing' },
  UPSTREAM_SEMI_UNSETTLED: { label: '前階半成品未結算', color: 'volcano' },
};

const textCell = (text: React.ReactNode, align: 'left' | 'center' | 'right' = 'left') => (
  <span
    style={{
      display: 'inline-block',
      lineHeight: '24px',
      verticalAlign: 'middle',
      width: '100%',
      textAlign: align,
    }}
  >
    {text}
  </span>
);

const flexCell = (children: React.ReactNode, align: 'flex-start' | 'center' | 'flex-end' = 'center') => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: align,
      height: '24px',
      verticalAlign: 'middle',
      width: '100%',
      gap: '4px',
    }}
  >
    {children}
  </div>
);

const formatCurrency = (val: number | null | undefined, digits = 2) => {
  if (val == null) return '-';
  return `$${Number(val).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

export const WorkOrderCostSettlementPage: React.FC = () => {
  const { message, modal } = App.useApp();

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [outputType, setOutputType] = useState<SettlementOutputType | undefined>(undefined);
  const [outputCode, setOutputCode] = useState<string | undefined>(undefined);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [settlementResult, setSettlementResult] = useState<WorkOrderCostSettlementResultDto | null>(
    null,
  );

  // 下拉選單：成品 P 查 Products，半成品 M 查 SEMI Materials（pageSize: -1）
  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ['settlement-products-all'],
    queryFn: () => getApiV1Product({ query: { pageSize: -1 } }),
    enabled: outputType === 'P',
  });

  const { data: semiMaterialsRes, isLoading: materialsLoading } = useQuery({
    queryKey: ['settlement-semi-materials-all'],
    queryFn: () => getApiV1Material({ query: { MaterialType: 'SEMI', pageSize: -1 } }),
    enabled: outputType === 'M',
  });

  const outputCodeOptions = useMemo(() => {
    if (outputType === 'P') {
      const raw =
        (productsRes?.data as { data?: { data?: unknown[] } | unknown[] })?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: unknown[] })?.data)
          ? (raw as { data: unknown[] }).data
          : [];
      return (list as Array<{ code?: string; name?: string }>).map((p) => ({
        label: `${p.code || ''} - ${p.name || ''}`,
        value: p.code || '',
      }));
    }
    if (outputType === 'M') {
      const raw =
        (semiMaterialsRes?.data as { data?: { data?: unknown[] } | unknown[] })?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: unknown[] })?.data)
          ? (raw as { data: unknown[] }).data
          : [];
      return (list as Array<{ code?: string; name?: string }>).map((m) => ({
        label: `${m.code || ''} - ${m.name || ''}`,
        value: m.code || '',
      }));
    }
    return [];
  }, [outputType, productsRes, semiMaterialsRes]);

  const buildRequestPayload = (): WorkOrderCostSettlementRequestDto | null => {
    const startDate = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : null;
    const endDate = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : null;
    const hasDateRange = Boolean(startDate || endDate);
    const hasOutputTarget = Boolean(outputType || outputCode);

    if (!hasDateRange && !hasOutputTarget) {
      const msg = '請至少指定「入庫完成日期區間」或「產出類別／產出品號」其中一項篩選條件。';
      setValidationAlert(msg);
      message.warning(msg);
      return null;
    }

    setValidationAlert(null);
    return {
      startDate,
      endDate,
      outputType: outputType ?? null,
      outputCode: outputCode ?? null,
    };
  };

  const previewMutation = useMutation({
    mutationFn: (payload: WorkOrderCostSettlementRequestDto) =>
      previewWorkOrderCostSettlement(payload),
    onSuccess: (data) => {
      setSettlementResult(data);
      message.success(
        `預覽完成：待結算 ${data.settledCount} 筆，異常跳過 ${data.skippedCount} 筆`,
      );
    },
    onError: (err) => {
      modal.error({
        title: '預覽檢核失敗',
        content: getApiMutationErrorMessage(err, '預覽檢核失敗'),
        centered: true,
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: (payload: WorkOrderCostSettlementRequestDto) =>
      executeWorkOrderCostSettlement(payload),
    onSuccess: (data) => {
      setSettlementResult(data);
      message.success(
        `成本結算完成：已結算 ${data.settledCount} 筆製令，更新 ${data.updatedProductCount} 項成品主檔成本`,
      );
    },
    onError: (err) => {
      modal.error({
        title: '執行成本結算失敗',
        content: getApiMutationErrorMessage(err, '執行成本結算失敗'),
        centered: true,
      });
    },
  });

  const handlePreview = () => {
    const payload = buildRequestPayload();
    if (!payload) return;
    previewMutation.mutate(payload);
  };

  const handleExecute = () => {
    const payload = buildRequestPayload();
    if (!payload) return;

    modal.confirm({
      title: '確認執行製令成本結算',
      content:
        '系統將依實際領用 LPN 自動向上追溯前階半成品製令、拓撲排序計算材料成本並向下同步領退料單價，同時更新最近期間內成品主檔單位成本。確定執行嗎？',
      okText: '確認執行',
      cancelText: '取消',
      centered: true,
      width: 480,
      onOk: () => executeMutation.mutateAsync(payload),
    });
  };

  const settledColumns: ColumnsType<SettledWorkOrderCostItemDto> = [
    {
      title: '製令單號',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
      width: 160,
      fixed: 'left',
      render: (val: string) =>
        textCell(
          <Link
            to={`/production-quality/work-orders/${encodeURIComponent(val)}`}
            style={{ color: 'var(--ant-color-link)', textDecoration: 'underline' }}
          >
            {val}
          </Link>,
        ),
    },
    {
      title: '類別',
      dataIndex: 'outputType',
      key: 'outputType',
      width: 90,
      align: 'center',
      render: (val: SettlementOutputType) =>
        flexCell(
          <Tag color={val === 'M' ? 'orange' : 'cyan'} className="m-0">
            {val === 'M' ? '半成品' : '成品'}
          </Tag>,
        ),
    },
    {
      title: '產出品號',
      dataIndex: 'outputCode',
      key: 'outputCode',
      width: 150,
      render: (val: string) => textCell(<span className="font-mono">{val}</span>),
    },
    {
      title: '產出名稱',
      dataIndex: 'outputName',
      key: 'outputName',
      width: 180,
      ellipsis: true,
      render: (val: string | null) => textCell(val || '-'),
    },
    {
      title: '入庫完成日',
      dataIndex: 'warehousingCompleteDate',
      key: 'warehousingCompleteDate',
      width: 120,
      align: 'center',
      render: (val: string | null) =>
        textCell(val ? dayjs(val).format('YYYY-MM-DD') : '-', 'center'),
    },
    {
      title: '良品數',
      dataIndex: 'goodQuantity',
      key: 'goodQuantity',
      width: 100,
      align: 'right',
      render: (val: number) => textCell(Number(val).toLocaleString(), 'right'),
    },
    {
      title: '結算前總成本',
      dataIndex: 'previousActualMaterialCost',
      key: 'previousActualMaterialCost',
      width: 130,
      align: 'right',
      render: (val: number) => textCell(formatCurrency(val, 2), 'right'),
    },
    {
      title: '結算後總成本',
      dataIndex: 'actualMaterialCost',
      key: 'actualMaterialCost',
      width: 130,
      align: 'right',
      render: (val: number) =>
        textCell(<span className="font-semibold">{formatCurrency(val, 2)}</span>, 'right'),
    },
    {
      title: '結算前單位成本',
      dataIndex: 'previousUnitMaterialCost',
      key: 'previousUnitMaterialCost',
      width: 135,
      align: 'right',
      render: (val: number) => textCell(formatCurrency(val, 4), 'right'),
    },
    {
      title: '結算後單位成本',
      dataIndex: 'unitMaterialCost',
      key: 'unitMaterialCost',
      width: 140,
      align: 'right',
      render: (val: number, record) =>
        record.isAllScrapped
          ? flexCell(<Tag color="error" className="m-0">全數報廢</Tag>, 'flex-end')
          : textCell(<span className="font-semibold">{formatCurrency(val, 4)}</span>, 'right'),
    },
    {
      title: 'SQM / 片成本',
      key: 'unitSpecCost',
      width: 145,
      align: 'right',
      render: (_: unknown, record) => {
        if (record.costPerSqm != null) {
          return textCell(`${formatCurrency(record.costPerSqm, 4)}/㎡`, 'right');
        }
        if (record.costPerPiece != null) {
          return textCell(`${formatCurrency(record.costPerPiece, 4)}/片`, 'right');
        }
        return textCell('-', 'right');
      },
    },
    {
      title: '跨階／狀態標記',
      key: 'flags',
      width: 210,
      render: (_: unknown, record) =>
        flexCell(
          <>
            {record.isUpstreamTraced && (
              <Tag color="geekblue" className="m-0">
                前階溯源
              </Tag>
            )}
            {record.isDownstreamSynced && (
              <Tag color="purple" className="m-0">
                下階同步
              </Tag>
            )}
            {record.isAllScrapped && (
              <Tag color="error" className="m-0">
                全數報廢
              </Tag>
            )}
            {!record.isUpstreamTraced &&
              !record.isDownstreamSynced &&
              !record.isAllScrapped && <Tag className="m-0">當階結算</Tag>}
          </>,
          'flex-start',
        ),
    },
  ];

  const skippedColumns: ColumnsType<SkippedWorkOrderCostItemDto> = [
    {
      title: '製令單號',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
      width: 160,
      fixed: 'left',
      render: (val: string) =>
        textCell(
          <Link
            to={`/production-quality/work-orders/${encodeURIComponent(val)}`}
            style={{ color: 'var(--ant-color-link)', textDecoration: 'underline' }}
          >
            {val}
          </Link>,
        ),
    },
    {
      title: '類別',
      dataIndex: 'outputType',
      key: 'outputType',
      width: 90,
      align: 'center',
      render: (val: SettlementOutputType) =>
        flexCell(
          <Tag color={val === 'M' ? 'orange' : 'cyan'} className="m-0">
            {val === 'M' ? '半成品' : '成品'}
          </Tag>,
        ),
    },
    {
      title: '產出品號',
      dataIndex: 'outputCode',
      key: 'outputCode',
      width: 150,
      render: (val: string) => textCell(<span className="font-mono">{val}</span>),
    },
    {
      title: '產出名稱',
      dataIndex: 'outputName',
      key: 'outputName',
      width: 180,
      ellipsis: true,
      render: (val: string | null) => textCell(val || '-'),
    },
    {
      title: '入庫完成日',
      dataIndex: 'warehousingCompleteDate',
      key: 'warehousingCompleteDate',
      width: 120,
      align: 'center',
      render: (val: string | null) =>
        textCell(val ? dayjs(val).format('YYYY-MM-DD') : '-', 'center'),
    },
    {
      title: '異常類型',
      dataIndex: 'reasonCode',
      key: 'reasonCode',
      width: 170,
      align: 'center',
      render: (code: SkippedWorkOrderReasonCode) => {
        const meta = REASON_CODE_LABELS[code] || { label: code, color: 'default' };
        return flexCell(<Tag color={meta.color} className="m-0">{meta.label}</Tag>);
      },
    },
    {
      title: '異常說明',
      dataIndex: 'reasonMessage',
      key: 'reasonMessage',
      width: 320,
      render: (val: string) => textCell(val || '-'),
    },
  ];

  const updatedProductColumns: ColumnsType<UpdatedProductCostItemDto> = [
    {
      title: '成品料號',
      dataIndex: 'productCode',
      key: 'productCode',
      width: 160,
      fixed: 'left',
      render: (val: string) => textCell(<span className="font-mono font-semibold">{val}</span>),
    },
    {
      title: '成品名稱',
      dataIndex: 'productName',
      key: 'productName',
      width: 220,
      ellipsis: true,
      render: (val: string | null) => textCell(val || '-'),
    },
    {
      title: '更新前 UnitCost',
      dataIndex: 'previousUnitCost',
      key: 'previousUnitCost',
      width: 150,
      align: 'right',
      render: (val: number) => textCell(formatCurrency(val, 4), 'right'),
    },
    {
      title: '更新後 UnitCost',
      dataIndex: 'updatedUnitCost',
      key: 'updatedUnitCost',
      width: 150,
      align: 'right',
      render: (val: number) =>
        textCell(<span className="font-semibold">{formatCurrency(val, 4)}</span>, 'right'),
    },
    {
      title: `最近 ${settlementResult?.recentCostWindowDays ?? 30} 天良品總數`,
      dataIndex: 'windowGoodQuantity',
      key: 'windowGoodQuantity',
      width: 170,
      align: 'right',
      render: (val: number) => textCell(Number(val).toLocaleString(), 'right'),
    },
    {
      title: `最近 ${settlementResult?.recentCostWindowDays ?? 30} 天總材料成本`,
      dataIndex: 'windowTotalMaterialCost',
      key: 'windowTotalMaterialCost',
      width: 190,
      align: 'right',
      render: (val: number) => textCell(formatCurrency(val, 2), 'right'),
    },
  ];

  return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard
        title="製令成本結算"
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<EyeOutlined />}
              onClick={handlePreview}
              loading={previewMutation.isPending}
              disabled={executeMutation.isPending}
            >
              預覽檢核
            </Button>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={handleExecute}
              loading={executeMutation.isPending}
              disabled={previewMutation.isPending}
            >
              執行成本結算
            </Button>
          </Space>
        }
      >
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          <Card
            size="small"
            styles={{ body: { padding: '12px 16px' } }}
            style={{ backgroundColor: 'var(--ant-color-fill-alter)' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="flex flex-col gap-1">
                <Typography.Text strong>入庫完成日期區間（台北時間 UTC+8）</Typography.Text>
                <RangePicker
                  style={{ width: '100%' }}
                  value={dateRange}
                  onChange={(vals) => {
                    setDateRange(vals as [Dayjs | null, Dayjs | null] | null);
                    setValidationAlert(null);
                  }}
                  placeholder={['開始日期', '結束日期']}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Typography.Text strong>產出類別</Typography.Text>
                <Select<SettlementOutputType>
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="全部（成品與半成品）"
                  value={outputType}
                  options={[
                    { label: '成品 (P)', value: 'P' },
                    { label: '半成品 (M)', value: 'M' },
                  ]}
                  onChange={(val) => {
                    setOutputType(val);
                    setOutputCode(undefined);
                    setValidationAlert(null);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Typography.Text strong>指定產出品號</Typography.Text>
                <Select<string>
                  allowClear
                  showSearch
                  style={{ width: '100%' }}
                  disabled={!outputType}
                  loading={productsLoading || materialsLoading}
                  placeholder={outputType ? '請選擇或搜尋產出品號' : '請先選擇產出類別'}
                  value={outputCode}
                  options={outputCodeOptions}
                  optionFilterProp="label"
                  onChange={(val) => {
                    setOutputCode(val);
                    setValidationAlert(null);
                  }}
                />
              </div>
            </div>
            <Typography.Text
              type="secondary"
              style={{ display: 'block', marginTop: 8, fontSize: '12px' }}
            >
              支援僅期間、僅產出目標或兩者複合篩選；指定目標時將依領用 LPN 自動向上追溯前階半成品製令並向下同步單價。
            </Typography.Text>
          </Card>

          {validationAlert && (
            <Alert type="warning" showIcon title={validationAlert} closable onClose={() => setValidationAlert(null)} />
          )}

          {!settlementResult ? (
            <Card variant="borderless">
              <Empty description="請設定篩選條件後，點擊右上角「預覽檢核」或「執行成本結算」" />
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Tag
                      color={settlementResult.isPreview ? 'processing' : 'success'}
                      icon={
                        settlementResult.isPreview ? (
                          <EyeOutlined />
                        ) : (
                          <CheckCircleOutlined />
                        )
                      }
                      className="m-0"
                    >
                      {settlementResult.isPreview ? '預覽檢核結果（尚未寫入）' : '已完成成本結算'}
                    </Tag>
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                      成品主檔加權平均視窗：最近 {settlementResult.recentCostWindowDays} 天
                    </Typography.Text>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    <Statistic title="結算製令數" value={settlementResult.settledCount} />
                    <Statistic
                      title="異常跳過數"
                      value={settlementResult.skippedCount}
                      prefix={
                        settlementResult.skippedCount > 0 ? (
                          <ExclamationCircleOutlined />
                        ) : undefined
                      }
                    />
                    <Statistic title="前階追溯數" value={settlementResult.upstreamTracedCount} />
                    <Statistic title="下階同步數" value={settlementResult.downstreamSyncedCount} />
                    <Statistic title="更新成品數" value={settlementResult.updatedProductCount} />
                  </div>
                </div>
              </Card>

              <Tabs
                defaultActiveKey="settled"
                items={[
                  {
                    key: 'settled',
                    label: `結算製令明細 (${settlementResult.settledItems.length})`,
                    children: (
                      <Table<SettledWorkOrderCostItemDto>
                        size="small"
                        bordered
                        rowKey="workOrderNumber"
                        scroll={{ x: 'max-content', y: 380 }}
                        pagination={{ pageSize: 20, showSizeChanger: true }}
                        dataSource={settlementResult.settledItems}
                        columns={settledColumns}
                      />
                    ),
                  },
                  {
                    key: 'skipped',
                    label: `未完單據異常提醒 (${settlementResult.skippedItems.length})`,
                    children: (
                      <Table<SkippedWorkOrderCostItemDto>
                        size="small"
                        bordered
                        rowKey="workOrderNumber"
                        scroll={{ x: 'max-content', y: 380 }}
                        pagination={{ pageSize: 20, showSizeChanger: true }}
                        dataSource={settlementResult.skippedItems}
                        columns={skippedColumns}
                        locale={{ emptyText: '無未完單據異常' }}
                      />
                    ),
                  },
                  {
                    key: 'products',
                    label: `成品主檔成本更新 (${settlementResult.updatedProducts.length})`,
                    children: (
                      <Table<UpdatedProductCostItemDto>
                        size="small"
                        bordered
                        rowKey="productCode"
                        scroll={{ x: 'max-content', y: 380 }}
                        pagination={{ pageSize: 20, showSizeChanger: true }}
                        dataSource={settlementResult.updatedProducts}
                        columns={updatedProductColumns}
                        locale={{ emptyText: '本次無更新成品主檔成本' }}
                      />
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </PageCard>
    </div>
  );
};

export default WorkOrderCostSettlementPage;
