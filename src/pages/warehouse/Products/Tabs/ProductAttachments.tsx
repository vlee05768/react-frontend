import { Card } from 'antd';
import { FileAttachmentZone } from '@/components/FileAttachment/FileAttachmentZone';

interface Props {
  productCode: string;
  isViewMode: boolean;
}

export default function ProductAttachments({ productCode, isViewMode: isMasterViewMode }: Props) {
  return (
    <Card size="small" title="產品附件" bordered={false} className="shadow-none">
      <FileAttachmentZone
        referenceType="Product"
        referenceId={productCode}
        readonly={!isMasterViewMode}
      />
    </Card>
  );
}
