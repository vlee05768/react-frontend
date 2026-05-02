import { Button } from 'antd';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export default function Dashboard() {
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl mb-4">ERP Dashboard (Sprint 1)</h1>
      <p className="mb-4">登入成功！底層架構已建置完成。</p>
      <Button type="primary" danger onClick={handleLogout}>登出</Button>
    </div>
  );
}
