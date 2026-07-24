import { Outlet } from 'react-router-dom';
import { useSystemVersion } from '@/hooks/useSystemVersion';

export default function AuthLayout() {
  const logoSrc = import.meta.env.VITE_LOGO_DARK || '/assets/tungfu-logo-dark.svg';
  const { frontendVersion, backendVersion } = useSystemVersion();

  return (
    <div className="bg-[#0B0F19] text-slate-100 min-h-screen flex flex-col justify-between items-center py-12 px-4 relative w-screen overflow-hidden">
      
      {/* Tiny light, clean background accents without heavy filter paints */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-blue-950/20 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Main Content Area */}
      <div className="my-auto w-full max-w-[440px] z-10 flex flex-col items-center">
        {/* Corporate Logo */}
        <div className="mb-8 transition-transform duration-300 hover:scale-[1.01]">
          <img src={logoSrc} alt="Tungfu Logo" className="h-11 w-auto filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
        </div>

        {/* High Density Auth Card with Zero CLS space */}
        <div className="w-full bg-[#111827] border border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-8">
          <Outlet />
        </div>
      </div>

      {/* System Version info (Footer) */}
      <div className="text-center z-10 pt-8">
        <div className="inline-flex items-center space-x-3 px-4 py-1.5 bg-slate-900/60 rounded-full text-[11px] text-slate-400 border border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
          <span>UI 版本: <span className="font-mono text-blue-400 font-medium">{frontendVersion}</span></span>
          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
          <span>API 版本: <span className="font-mono text-emerald-400 font-medium">{backendVersion}</span></span>
        </div>
        <p className="mt-2 text-[10px] text-slate-600">© 2026 東富電子有限公司. All rights reserved.</p>
      </div>

    </div>
  );
}
