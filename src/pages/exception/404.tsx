import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen items-center justify-center bg-[#141414]">
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您存取的頁面不存在。"
        extra={<Button type="primary" onClick={() => navigate(ROUTES.HOME)}>回首頁</Button>}
      />
    </div>
  );
}
