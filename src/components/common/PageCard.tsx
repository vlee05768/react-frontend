import React from 'react';
import { Card } from 'antd';

export interface PageCardProps {
  /** Card title, can be string or ReactNode. If string is passed, it automatically renders with standard blue accent bar. */
  title: React.ReactNode;
  /** Actions on the right side of card header */
  extra?: React.ReactNode;
  /** Card body children */
  children: React.ReactNode;
  /** Custom wrapper styles */
  style?: React.CSSProperties;
  /** Custom Card body styles */
  bodyStyle?: React.CSSProperties;
  /** If true, injects the necessary CSS override styles to make antd Table fit exactly to 100% height without scrolling viewport. Default is true. */
  adaptTableHeight?: boolean;
}

/**
 * ErpPageCard is a shared UI component for ERP module master layout.
 * It encapsulates the standard padding, borderless style, flexbox container layouts,
 * title accent bars, and optional standard Table high-performance auto-stretch CSS overrides.
 */
export function PageCard({
  title,
  extra,
  children,
  style,
  bodyStyle,
  adaptTableHeight = true,
}: PageCardProps) {
  // Auto-wrap string titles with standard ERP accent blue bar
  const renderedTitle = typeof title === 'string' ? (
    <div className="flex items-center gap-3">
      <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
      <div className="m-0 font-semibold" style={{ fontSize: '20px' }}>
        {title}
      </div>
    </div>
  ) : title;

  return (
    <Card
      variant="borderless"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...style }}
      styles={{
        header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
        body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 4px 16px', ...bodyStyle }
      }}
      title={renderedTitle}
      extra={extra}
    >
      {adaptTableHeight && (
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
      )}
      {children}
    </Card>
  );
}

export default PageCard;
