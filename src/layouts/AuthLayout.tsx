import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  const logoSrc = import.meta.env.VITE_LOGO_DARK || '/assets/tungfu-logo-dark.svg';

  return (
    <div className="bg-gray-900 flex items-center justify-center min-h-screen relative overflow-hidden w-screen">
      {/* Background Decoration */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-purple-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

      <div className="relative w-full max-w-md px-6">
        {/* Logo Centered */}
        <div className="flex justify-center mb-10">
          <img src={logoSrc} alt="Tungfu Logo" className="h-12 w-auto drop-shadow-lg" />
        </div>

        {/* Auth Card */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
