import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, Table, message, Card, Tag  } from 'antd';
import { SearchOutlined, PlusOutlined, ClearOutlined } from '@ant-design/icons';
import { TableActions } from '@/utils/tableActions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants/ui';
import { getApiV1QcReceipt, deleteApiV1QcReceiptByMovementNumber } from '@/api/generated';
import { useQcReceiptQueryStore } from './useQcReceiptQueryStore';
import { qcReceiptSearchConfig, mainTableColumns } from './QcReceiptConfig';
import { buildTableColumns, formatSorterToRules, getColumnLabel } from '@/utils/tableUtils';
import { Space, Divider } from 'antd';
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';

import { useParams } from 'react-router-dom';

export default function QcReceiptsList() {
  // const { modal } = App.useApp();
  const { id: viewId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, setParams } = useQcReceiptQueryStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const searchForm = useForm({ values: params });

  const { pageNumber, pageSize, ...queryFields } = params;
  useUrlQuerySync({
    query: queryFields,
    page: pageNumber || 1,
    pageSize: pageSize || 20,
    setPagination: (p, s) => setParams({ pageNumber: p, pageSize: s }),
    setQuery: (q) => setParams(q),
  });

  // Fetch Data
  const openCreateDrawer = () => navigate('/production-quality/qc-receipts/create');

  // Fetch Data
  const { data: response, isLoading } = useQuery({
    queryKey: ['qcReceipts', params],
    queryFn: () => getApiV1QcReceipt({
      query: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        DocumentNumber: params.documentNumber || undefined,
        DateRange: params.dateRange ? [
          dayjs(params.dateRange[0]).format('YYYY-MM-DD'),
          dayjs(params.dateRange[1]).format('YYYY-MM-DD')
        ] : undefined,
      } as any,
    }),
  });

  const list = (response?.data?.data as any)?.data || (response?.data?.data as any) || [];
  let displayList = list;
  if (params.status) {
    displayList = list.filter((item: any) => item.status === params.status);
  }

  const total = (response?.data?.data as any)?.totalRecords || (response?.data as any)?.totalRecords || 0;

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (movementNumber: string) => deleteApiV1QcReceiptByMovementNumber({ path: { movementNumber } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceipts'] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '刪除失敗'),
  });

  const handleSearch = (values: any) => {
    setParams({
      ...values,
      pageNumber: 1,
    });
    setIsSearchModalOpen(false);
  };


  const handleClearTag = (key: string) => {
    setParams({ [key]: undefined, pageNumber: 1 });
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
    render: (_: any, record: any) => {
      const isUnconfirmed = record.status === 'Unconfirmed';
      return (
        <TableActions
          onView={() => navigate(`/production-quality/qc-receipts/${record.documentNumber}`)}
          onDelete={isUnconfirmed ? () => deleteMutation.mutate(record.documentNumber) : undefined}
          recordName={record.documentNumber}
          deleteConfirmType="modal"
        />
      );
    },
  };

    const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    const pageNumber = pagination.current || 1;
    const pageSize = pagination.pageSize || 20;
    const sortRules = formatSorterToRules(sorter);
    setParams({
      pageNumber,
      pageSize,
      SortRules: sortRules || undefined,
    });
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn, params.SortRules);

  return (
    <div className="p-[16px_16px_0px_16px] flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <Card
        variant="borderless"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 4px 16px' }
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <div style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
              QC 檢驗單管理
            </div>
          </div>
        }
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button type="default" icon={<SearchOutlined />} onClick={() => setIsSearchModalOpen(true)}>
              查詢
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
              新增單據
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', padding: '12px 16px', borderRadius: '6px', flexShrink: 0, gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>目前的查詢條件:</span>
            <DynamicSearchTags
              config={qcReceiptSearchConfig()}
              params={params}
              onClose={handleClearTag}
            />
          </div>
          {params.SortRules && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', paddingLeft: '16px', borderLeft: '1px solid #d9d9d9' }}>
              <span style={{ fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>排序順序:</span>
              <Space size={[4, 8]} wrap>
                {params.SortRules.split(',').map((rule: string) => {
                  const [field, order] = rule.split(':');
                  const label = getColumnLabel(field, mainTableColumns());
                  const orderText = order === 'asc' ? '升序 ↗' : '降序 ↘';
                  return (
                    <Tag
                      key={field}
                      color="blue"
                      closable
                      onClose={() => {
                        const remainingRules = params.SortRules.split(',')
                          .filter((r: string) => !r.startsWith(`${field}:`))
                          .join(',');
                        setParams({ SortRules: remainingRules || undefined, pageNumber: 1 });
                      }}
                    >
                      {label} ({orderText})
                    </Tag>
                  );
                })}
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                  onClick={() => setParams({ SortRules: undefined, pageNumber: 1 })}
                >
                  清除排序
                </Button>
              </Space>
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <style>{`
            .ant-table-wrapper { height: 100%; display: flex; flex-direction: column; }
            .ant-spin-nested-loading { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-spin { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-spin-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table-body { flex: 1; overflow-y: auto !important; max-height: none !important; }
            .ant-table-pagination { margin-top: auto !important; margin-bottom: 0 !important; }
            .ant-table-thead > tr > th { text-align: center !important; }
          `}</style>
          <Table
            onChange={handleTableChange}
            bordered
            rowClassName={(record: any) => {
              return record.documentNumber === viewId ? 'selected-table-row' : '';
            }}
            style={{ flex: 1 }}
            columns={columns}
            dataSource={displayList}
            rowKey="documentNumber"
            loading={isLoading}
            scroll={{ x: 'max-content', y: 300 }}
            pagination={{
              current: params.pageNumber,
              pageSize: params.pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 筆資料`,
              
            }}
          />
        </div>
      </Card>

      <Modal
        title={
          <div style={{ fontSize: '18px', fontWeight: 600, paddingBottom: '12px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
            查詢條件設定
          </div>
        }
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button icon={<ClearOutlined />} onClick={() => {
              const emptyVals = Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = undefined; return acc; }, {});
              searchForm.reset(emptyVals);
              setParams({ ...emptyVals, [params.pageNumber !== undefined ? 'pageNumber' : 'page']: 1 });
            }}>
              清除條件
            </Button>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" form="search-form">
              執行查詢
            </Button>
          </div>
        }
        width={MODAL_WIDTH_SEARCH}
        style={{ top: '10vh' }}
        styles={{
          body: {
            maxHeight: MODAL_BODY_MAX_HEIGHT,
            overflowY: 'auto',
            padding: '24px 24px 0 24px'
          }
        }}
        closeIcon={true}
      >
        <DynamicSearchForm
          config={qcReceiptSearchConfig()}
          form={searchForm}
          onSearch={handleSearch}
        />
      </Modal>
    </div>
  );
}
