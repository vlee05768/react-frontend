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
      <div className="w-1 h-6 bg-[var(--ant-color-primary)] rounded-[2px]" />
      <div className="m-0 font-semibold text-[20px] text-[var(--ant-color-text)]">
        {title}
      </div>
    </div>
  ) : title;

  return (
    <Card
      variant="borderless"
      className="flex-1 flex flex-col overflow-hidden"
      style={style}
      classNames={{
        header: 'border-b border-[var(--ant-color-border-secondary)] px-6 py-4',
        body: 'flex-1 overflow-hidden flex flex-col p-4 pb-1'
      }}
      styles={{
        body: bodyStyle
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
          .ant-table-content, .ant-table-body { flex: 1; overflow-x: auto !important; overflow-y: auto !important; max-height: none !important; }
          .ant-table-pagination { margin-top: auto !important; margin-bottom: 0 !important; }
          .ant-table-thead > tr > th { text-align: center !important; }
        `}</style>
      )}
      {children}
    </Card>
  );
}

export default PageCard;
