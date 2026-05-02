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
      { path: 'employee/:viewId?', element: <Employee /> }
    ]
  },
  { path: ROUTES.FORBIDDEN, element: <Forbidden /> },
  { path: '*', element: <NotFound /> },
]);
