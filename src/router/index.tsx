import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import AuthLayout from '@/layouts/AuthLayout';
import Login from '@/pages/auth/Login';
import ForgetPassword from '@/pages/auth/ForgetPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import NotFound from '@/pages/exception/404';
import Forbidden from '@/pages/exception/403';
import Dashboard from '@/pages/Dashboard';
import MainLayout from '@/layouts/MainLayout';
import Employee from '@/pages/basic/Employee';
import Profile from '@/pages/system/Profile';
import UserList from '@/pages/system/UserList';
import RoleList from '@/pages/system/RoleList';
import SystemMaintenance from '@/pages/system/SystemMaintenance';
import GeneralTypeLayout from '@/pages/system/GeneralType/GeneralTypeLayout';
import StorageList from '@/pages/warehouse/StorageList';
import StorageInventoryList from '@/pages/warehouse/StorageInventory/StorageInventoryList';
import StorageTransactionsList from '@/pages/warehouse/StorageTransactions/StorageTransactionsList';
import ProductsList from '@/pages/warehouse/Products/ProductsList';
import InventoryAdjustmentList from '@/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList';
import OrdersList from '@/pages/sales/orders/OrdersList';
import OrderDrawer from '@/pages/sales/orders/OrderDrawer';
import MaterialList from '@/pages/purchase/Material/MaterialList';
import MoldList from '@/pages/production/MoldList';
import MachineList from '@/pages/production/MachineList';
import BusinessPartnerList from '@/pages/basic/BusinessPartner/BusinessPartnerList';
import FormDemo from '@/pages/demo/FormDemo';
import { useAuthStore } from '@/stores/useAuthStore';

// 路由守衛
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return children;
};

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <Login /> },
      { path: ROUTES.FORGET_PASSWORD, element: <ForgetPassword /> },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPassword /> },
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
      { path: 'employee/:viewId?', element: <Employee /> },
      { path: 'profile', element: <Profile /> },
      { path: 'system/users/:viewId?', element: <UserList /> },
      { path: 'system/roles/:viewId?', element: <RoleList /> },
      { path: 'system/maintenance', element: <SystemMaintenance /> },
      { path: 'system/general-types', element: <GeneralTypeLayout /> },
      { path: 'warehouse/storages/:viewId?', element: <StorageList /> },
      { path: 'warehouse/inventory', element: <StorageInventoryList /> },
      { path: 'warehouse/inventory-movements', element: <StorageTransactionsList /> },
      { path: 'warehouse/products/:viewId?', element: <ProductsList /> },
      { path: 'warehouse/inventory-adjustments/:viewId?', element: <InventoryAdjustmentList /> },
      { path: 'purchase/materials/:viewId?', element: <MaterialList /> },
      { path: 'production-quality/molds/:viewId?', element: <MoldList /> },
      { path: 'production-quality/machines/:viewId?', element: <MachineList /> },
      { path: 'sales/orders', element: <OrdersList /> },
      { path: 'sales/orders/:id', element: <><OrdersList /><OrderDrawer /></> },
      { path: 'business-partners/:viewId?', element: <BusinessPartnerList /> },
      { path: 'demo/form', element: <FormDemo /> }
    ]
  },
  { path: ROUTES.FORBIDDEN, element: <Forbidden /> },
  { path: '*', element: <NotFound /> },
]);
