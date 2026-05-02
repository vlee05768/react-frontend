import { Button, Form, Input, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { postApiV1AuthLogin } from '@/api/generated/sdk.gen';

export default function Login() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      const response = await postApiV1AuthLogin({
        body: {
          userName: values.username,
          password: values.password,
        },
      });

      const token = response.data?.data?.token;
      if (token) {
        setToken(token);
        message.success('登入成功');
        navigate(ROUTES.HOME);
      } else {
        message.error(response.data?.message || '登入失敗，請檢查帳號密碼');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '登入發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      name="login"
      onFinish={onFinish}
      layout="vertical"
      requiredMark={false}
      size="large"
    >
      <Form.Item
        name="username"
        rules={[{ required: true, message: '請輸入帳號' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="帳號 (預設: admin)" autoFocus />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: '請輸入密碼' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="密碼" />
      </Form.Item>

      <div className="flex justify-between items-center mb-6">
        <Form.Item name="remember" valuePropName="checked" noStyle>
          <Checkbox>記住我</Checkbox>
        </Form.Item>
        <a 
          className="text-blue-400 hover:text-blue-300 cursor-pointer"
          onClick={() => navigate(ROUTES.FORGET_PASSWORD)}
        >
          忘記密碼？
        </a>
      </div>

      <Form.Item>
        <Button type="primary" htmlType="submit" className="w-full" size="large" loading={loading}>
          登入
        </Button>
      </Form.Item>
    </Form>
  );
}
