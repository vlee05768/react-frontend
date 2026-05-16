import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, Table, Card } from 'antd';
import { SearchOutlined, EyeOutlined , ClearOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants/ui';
import { getApiV1ProductionReceipt } from '@/api/generated';
import { useProductionReceiptQueryStore } from './useProductionReceiptQueryStore';
import { productionReceiptSearchConfig, mainTableColumns } from './ProductionReceiptConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import { Tooltip, Space, Divider } from 'antd';
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';

import { useParams } from 'react-router-dom';

export default function ProductionReceiptsList() {
  const { id: viewId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { params, setParams } = useProductionReceiptQueryStore();
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

  const { data: response, isLoading } = useQuery({
    queryKey: ['productionReceipts', params],
    queryFn: () => getApiV1ProductionReceipt({
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

  const handleSearch = (values: any) => {
    setParams({
      ...values,
      pageNumber: 1,
    });
    setIsSearchModalOpen(false);
  };

  const handleSearchReset = () => {
    searchForm.reset(Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = null; return acc; }, {}));
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
      return (
        <Space>
          <Tooltip title="檢視">
            <Button 
              type="text" 
              icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
              style={{ color: '#1890ff' }} 
              onClick={() => navigate(`/production-quality/production-receipts/${record.documentNumber}`)} 
            />
          </Tooltip>
        </Space>
      );
    },
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn);

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
          <div className="flex items-center gap-3">
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <div className="m-0 font-semibold" style={{fontSize: '20px'}}>
              生產入庫單管理
            </div>
          </div>
        }
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button type="default" icon={<SearchOutlined />} onClick={() => setIsSearchModalOpen(true)}>
              進階查詢
            </Button>
          </Space>
        }
      >
        <div className="mb-4 flex items-center p-[12px_16px]" style={{flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', borderRadius: '6px', flexShrink: 0 }}>
          <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>目前的查詢條件:</span>
          <DynamicSearchTags
            config={productionReceiptSearchConfig()}
            params={params}
            onClose={handleClearTag}
          />
        </div>
        
        <div className="flex flex-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
            bordered
            rowClassName={(record: any) => record.documentNumber === viewId ? 'selected-table-row' : ''}
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
              onChange: (page, pageSize) => setParams({ pageNumber: page, pageSize }),
            }}
          />
        </div>
      </Card>

      <Modal
        title={
          <div className="font-semibold pb-3 mb-2" style={{fontSize: '18px', borderBottom: '1px solid #f0f0f0'}}>
            查詢條件設定
          </div>
        }
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2" style={{borderTop: '1px solid #f0f0f0'}}>
            <Button icon={<ClearOutlined />} onClick={handleSearchReset}>
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
          config={productionReceiptSearchConfig()}
          form={searchForm}
          onSearch={handleSearch}
        />
      </Modal>
    </div>
  );
}
