import { Button, Form, Input } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export default function ForgetPassword() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('Forget password email:', values);
    // TODO: 串接忘記密碼 API
    navigate(ROUTES.RESET_PASSWORD);
  };

  return (
    <div>
      <h2 className="text-xl text-white mb-6 text-center">忘記密碼</h2>
      <Form form={form} layout="vertical" onFinish={onFinish} size="large">
        <Form.Item
          name="email"
          rules={[
            { required: true, message: '請輸入信箱' },
            { type: 'email', message: '信箱格式不正確' }
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="請輸入註冊時的電子信箱" autoFocus />
        </Form.Item>

        <Form.Item className="mt-8 mb-0">
          <Button type="primary" htmlType="submit" className="w-full mb-4">
            發送重設驗證碼
          </Button>
          <Button type="default" className="w-full" onClick={() => navigate(ROUTES.LOGIN)}>
            返回登入
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
