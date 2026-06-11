import { lazy, Suspense, type ReactNode, type LazyExoticComponent, type ComponentType } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { ROUTES } from '@/constants/routes';
import AuthLayout from '@/layouts/AuthLayout';
import Login from '@/pages/auth/Login';
import ForgetPassword from '@/pages/auth/ForgetPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import ActivateAccount from '@/pages/auth/ActivateAccount';
import NotFound from '@/pages/exception/404';
import Forbidden from '@/pages/exception/403';
import Dashboard from '@/pages/Dashboard';
import MainLayout from '@/layouts/MainLayout';
import { useAuthStore } from '@/stores/useAuthStore';

// 路由延遲載入封裝輔助 HOC
const withSuspense = <P extends object>(
  LazyComponent: LazyExoticComponent<ComponentType<P>>
) => {
  return (props: P) => (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center p-8 min-h-[200px]">
          <Spin size="large" description="頁面載入中..." />
        </div>
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
};

// 延遲載入頁面組件
const Employee = withSuspense(lazy(() => import('@/pages/basic/employees')));
const Profile = withSuspense(lazy(() => import('@/pages/system/Profile')));
const UserList = withSuspense(lazy(() => import('@/pages/system/UserList')));
const RoleList = withSuspense(lazy(() => import('@/pages/system/RoleList')));
const SystemMaintenance = withSuspense(lazy(() => import('@/pages/system/SystemMaintenance')));
const GeneralTypeLayout = withSuspense(lazy(() => import('@/pages/system/general-types/GeneralTypeLayout')));
const StorageList = withSuspense(lazy(() => import('@/pages/warehouse/storages/StorageList')));
const StorageInventoryList = withSuspense(lazy(() => import('@/pages/warehouse/inventory/StorageInventoryList')));
const MaterialInventoryList = withSuspense(lazy(() => import('@/pages/warehouse/material-inventory/MaterialInventoryList')));
const StorageTransactionsList = withSuspense(lazy(() => import('@/pages/warehouse/inventory-movements/StorageTransactionsList')));
const ProductsList = withSuspense(lazy(() => import('@/pages/warehouse/Products/ProductsList')));
const InventoryAdjustmentList = withSuspense(lazy(() => import('@/pages/warehouse/inventory-adjustments/InventoryAdjustmentList')));
const BrandModelsLayout = withSuspense(lazy(() => import('@/pages/warehouse/BrandModels/BrandModelsLayout')));
const OrdersList = withSuspense(lazy(() => import('@/pages/sales/orders/OrdersList')));
const PurchaseOrdersList = withSuspense(lazy(() => import('@/pages/purchase/orders/PurchaseOrdersList')));
const PurchaseOrderDrawer = withSuspense(lazy(() => import('@/pages/purchase/orders/PurchaseOrderDrawer')));
const PurchaseReceiptsList = withSuspense(lazy(() => import('@/pages/purchase/receipts/PurchaseReceiptsList')));
const PurchaseReceiptDrawer = withSuspense(lazy(() => import('@/pages/purchase/receipts/PurchaseReceiptDrawer')));
const SalesDeliveriesList = withSuspense(lazy(() => import('@/pages/sales/sales-deliveries/SalesDeliveriesList')));
const SalesDeliveryDrawer = withSuspense(lazy(() => import('@/pages/sales/sales-deliveries/SalesDeliveryDrawer')));
const CustomerStatementList = withSuspense(lazy(() => import('@/pages/sales/statements/CustomerStatementList')));
const OrderDrawer = withSuspense(lazy(() => import('@/pages/sales/orders/OrderDrawer')));
const MaterialList = withSuspense(lazy(() => import('@/pages/warehouse/materials/MaterialList')));
const MoldList = withSuspense(lazy(() => import('@/pages/production-quality/molds/MoldList')));
const MachineList = withSuspense(lazy(() => import('@/pages/production-quality/machines/MachineList')));

// Named export 延遲載入
const WorkOrdersList = withSuspense(
  lazy(() =>
    import('@/pages/production-quality/work-orders/WorkOrdersList').then((module) => ({
      default: module.WorkOrdersList,
    }))
  )
);

const QcReceiptsList = withSuspense(lazy(() => import('@/pages/production-quality/qc-receipts/QcReceiptsList')));
const QcReceiptDrawer = withSuspense(lazy(() => import('@/pages/production-quality/qc-receipts/QcReceiptDrawer')));
const ProductionReceiptsList = withSuspense(lazy(() => import('@/pages/production-quality/production-receipts/ProductionReceiptsList')));
const ProductionReceiptDrawer = withSuspense(lazy(() => import('@/pages/production-quality/production-receipts/ProductionReceiptDrawer')));
const BusinessPartnerList = withSuspense(lazy(() => import('@/pages/basic/business-partners/BusinessPartnerList')));

// 路由守衛
function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  if (!token) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.LOGIN}?redirect=${redirectUrl}`} replace />;
  }
  return children;
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <Login /> },
      { path: ROUTES.FORGET_PASSWORD, element: <ForgetPassword /> },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPassword /> },
      { path: ROUTES.ACTIVATE_ACCOUNT, element: <ActivateAccount /> },
    ],
  },
  {
    path: ROUTES.HOME,
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'basic/employees/:viewId?', element: <Employee /> },
      { path: 'profile', element: <Profile /> },
      { path: 'system/users/:viewId?', element: <UserList /> },
      { path: 'system/roles/:viewId?', element: <RoleList /> },
      { path: 'system/maintenance', element: <SystemMaintenance /> },
      { path: 'system/general-types', element: <GeneralTypeLayout /> },
      { path: 'warehouse/storages/:viewId?', element: <StorageList /> },
      { path: 'warehouse/inventory', element: <StorageInventoryList /> },
      { path: 'warehouse/material-inventory', element: <MaterialInventoryList /> },
      { path: 'warehouse/inventory-movements', element: <StorageTransactionsList /> },
      { path: 'warehouse/products/:viewId?', element: <ProductsList /> },
      { path: 'warehouse/inventory-adjustments/:viewId?', element: <InventoryAdjustmentList /> },
      { path: 'warehouse/brand-models', element: <BrandModelsLayout /> },
      { path: 'warehouse/materials/:viewId?', element: <MaterialList /> },
      { path: 'production-quality/molds/:viewId?', element: <MoldList /> },
      { path: 'production-quality/machines/:viewId?', element: <MachineList /> },
      { path: 'production-quality/work-orders/:viewId?', element: <WorkOrdersList /> },
      { path: 'production-quality/qc-receipts', element: <QcReceiptsList /> },
      { path: 'production-quality/qc-receipts/:id', element: <><QcReceiptsList /><QcReceiptDrawer /></> },
      { path: 'production-quality/production-receipts', element: <ProductionReceiptsList /> },
      { path: 'production-quality/production-receipts/:id', element: <><ProductionReceiptsList /><ProductionReceiptDrawer /></> },
      { path: 'sales/orders', element: <OrdersList /> },
      { path: 'sales/orders/:id', element: <><OrdersList /><OrderDrawer /></> },
      { path: 'sales/sales-deliveries', element: <SalesDeliveriesList /> },
      { path: 'sales/sales-deliveries/:id', element: <><SalesDeliveriesList /><SalesDeliveryDrawer /></> },
      { path: 'sales/statements', element: <CustomerStatementList /> },

      { path: 'purchase/orders', element: <PurchaseOrdersList /> },
      { path: 'purchase/orders/:id', element: <><PurchaseOrdersList /><PurchaseOrderDrawer /></> },
      { path: 'purchase/receipts', element: <PurchaseReceiptsList /> },
      { path: 'purchase/receipts/:id', element: <><PurchaseReceiptsList /><PurchaseReceiptDrawer /></> },

      { path: 'basic/business-partners/:viewId?', element: <BusinessPartnerList /> },
    ]
  },
  { path: ROUTES.FORBIDDEN, element: <Forbidden /> },
  { path: '*', element: <NotFound /> },
]);
