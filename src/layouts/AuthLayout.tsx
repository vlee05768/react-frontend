import { Outlet } from 'react-router-dom';
import { useSystemVersion } from '@/hooks/useSystemVersion';

export default function AuthLayout() {
  const logoSrc = import.meta.env.VITE_LOGO_DARK || '/assets/tungfu-logo-dark.svg';
  const { frontendVersion, backendVersion } = useSystemVersion();

  return (
    <div className="bg-gray-900 flex items-center justify-center min-h-screen relative overflow-hidden w-screen flex-col">
      {/* Background Decoration */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-purple-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

      <div className="relative w-full max-w-md px-6 flex-1 flex flex-col justify-center">
        {/* Logo Centered */}
        <div className="flex justify-center mb-10">
          <img src={logoSrc} alt="Tungfu Logo" className="h-12 w-auto drop-shadow-lg" />
        </div>

        {/* Auth Card */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <Outlet />
        </div>
      </div>

      {/* VERSION INFO: Bottom of Login Screen */}
      <div className="relative z-10 pb-6 w-full text-center">
        <div className="inline-flex items-center space-x-3 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-full text-xs text-gray-400 border border-gray-700/50 shadow-sm">
          <span>UI: <span className="font-mono text-gray-300 font-medium">{frontendVersion}</span></span>
          <span className="w-1 h-1 rounded-full bg-gray-600"></span>
          <span>API: <span className="font-mono text-gray-300 font-medium">{backendVersion}</span></span>
        </div>
      </div>
    </div>
  );
}
