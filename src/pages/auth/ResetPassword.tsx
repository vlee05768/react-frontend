import { Button, Form, Input } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('Reset password:', values);
    // TODO: 串接重設密碼 API
    navigate(ROUTES.LOGIN);
  };

  return (
    <div>
      <h2 className="text-xl text-white mb-6 text-center">重設密碼</h2>
      <Form form={form} layout="vertical" onFinish={onFinish} size="large">
        <Form.Item
          name="password"
          rules={[{ required: true, message: '請輸入新密碼' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="新密碼" autoFocus />
        </Form.Item>
        
        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: '請確認新密碼' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('兩次輸入的密碼不一致'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="確認新密碼" />
        </Form.Item>

        <Form.Item className="mt-8 mb-0">
          <Button type="primary" htmlType="submit" className="w-full mb-4">
            確認重設
          </Button>
          <Button type="default" className="w-full" onClick={() => navigate(ROUTES.LOGIN)}>
            返回登入
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
