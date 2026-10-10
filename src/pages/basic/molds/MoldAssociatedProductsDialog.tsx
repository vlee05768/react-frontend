import { useEffect, useState } from 'react';
import { Button, Empty, Modal, Spin, Table, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMoldProducts, type MoldProduct } from '@/api/moldProducts';
import { useAuthStore } from '@/stores/useAuthStore';
import { buildTableColumns } from '@/utils/tableUtils';
import { associatedProductsTableColumns } from './MoldConfig';
import { canViewMoldProducts } from './moldProductPermissions';

interface Mold {
  code: string;
  name?: string | null;
}

interface Props {
  open: boolean;
  mold: Mold | null;
  onClose: () => void;
}

export default function MoldAssociatedProductsDialog({ open, mold, onClose }: Props) {
  const canViewProducts = useAuthStore(canViewMoldProducts);
  useEffect(() => {
    if (open && !canViewProducts) onClose();
  }, [open, canViewProducts, onClose]);
  if (!open || !canViewProducts || !mold) return null;
  // Mount per opening/mold: page resets before querying, not in a later effect.
  return <AssociatedProductsContent key={mold.code} mold={mold} onClose={onClose} />;
}

function AssociatedProductsContent({ mold, onClose }: { mold: Mold; onClose: () => void }) {
  const canViewProducts = useAuthStore(canViewMoldProducts);
  const [pageNumber, setPageNumber] = useState(1);
  const query = useQuery({
    queryKey: ['moldAssociatedProducts', mold.code, pageNumber],
    enabled: canViewProducts,
    queryFn: ({ signal }) => {
      if (!canViewMoldProducts(useAuthStore.getState())) throw new Error('無有效產品檢視權限');
      return getMoldProducts(mold.code, pageNumber, signal);
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <Modal
      open
      centered
      title={`使用模具：${mold.code}${mold.name ? ` - ${mold.name}` : ''}`}
      onCancel={onClose}
      footer={<Button onClick={onClose}>關閉</Button>}
      width={640}
      destroyOnHidden
    >
      <div data-testid="associated-products-body" className="h-[520px] overflow-auto">
        {query.isFetching ? (
          <div role="status" className="flex justify-center py-10"><Spin description="載入關聯產品中..." /></div>
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Typography.Text type="danger">無法載入關聯產品。</Typography.Text>
            <Button icon={<ReloadOutlined />} onClick={() => query.refetch()}>重試</Button>
          </div>
        ) : query.data?.data?.length ? (
          <Table<MoldProduct>
            rowKey="code"
            size="small"
            bordered
            pagination={{ current: pageNumber, pageSize: 100, total: query.data.totalRecords ?? 0, showSizeChanger: false, onChange: setPageNumber }}
            scroll={{ x: 'max-content', y: 420 }}
            dataSource={query.data.data ?? []}
            columns={buildTableColumns(associatedProductsTableColumns())}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="目前沒有產品使用此模具" />
        )}
      </div>
    </Modal>
  );
}
