import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MaterialEstimatedCostRecalculationAction } from './MaterialEstimatedCostRecalculationAction';

const permission = 'BasicData.Materials.Update';

describe('MaterialEstimatedCostRecalculationAction', () => {
  it('does not render or invoke recalculation without Update permission', () => {
    const onClick = vi.fn();
    const hasPermission = vi.fn(() => false);

    render(
      <MaterialEstimatedCostRecalculationAction hasPermission={hasPermission} onClick={onClick}>
        重算全部估算成本
      </MaterialEstimatedCostRecalculationAction>,
    );

    expect(hasPermission).toHaveBeenCalledWith(permission);
    expect(screen.queryByRole('button', { name: /重算全部估算成本/ })).not.toBeInTheDocument();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('allows recalculation through the button when Update permission is granted', () => {
    const onClick = vi.fn();
    const hasPermission = vi.fn((code: string) => code === permission);

    render(
      <MaterialEstimatedCostRecalculationAction hasPermission={hasPermission} onClick={onClick}>
        重算全部估算成本
      </MaterialEstimatedCostRecalculationAction>,
    );

    fireEvent.click(screen.getByRole('button', { name: /重算全部估算成本/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
