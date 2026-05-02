import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#141414]">
      <div className="w-full max-w-md p-8 bg-[#1f1f1f] rounded-lg shadow-xl border border-[#303030]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">ERP 系統</h1>
          <p className="text-gray-400 text-sm">企業資源規劃管理平台</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
