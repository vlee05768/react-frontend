import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export default function Forbidden() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen items-center justify-center bg-[#141414]">
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您沒有權限存取此頁面。"
        extra={<Button type="primary" onClick={() => navigate(ROUTES.HOME)}>回首頁</Button>}
      />
    </div>
  );
}
