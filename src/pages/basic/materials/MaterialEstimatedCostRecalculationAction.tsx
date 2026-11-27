import { CalculatorOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ReactNode } from 'react';

const MATERIAL_UPDATE_PERMISSION = 'BasicData.Materials.Update';

type MaterialEstimatedCostRecalculationActionProps = {
  hasPermission: (permission: string) => boolean;
  onClick: () => void;
  loading?: boolean;
  children: ReactNode;
};

export function MaterialEstimatedCostRecalculationAction({
  hasPermission,
  onClick,
  loading = false,
  children,
}: MaterialEstimatedCostRecalculationActionProps) {
  if (!hasPermission(MATERIAL_UPDATE_PERMISSION)) return null;

  return (
    <Button
      type="default"
      icon={<CalculatorOutlined />}
      loading={loading}
      onClick={onClick}
      className="font-medium"
    >
      {children}
    </Button>
  );
}
