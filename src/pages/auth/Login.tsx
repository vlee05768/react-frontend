
import { Button, Form, Input, Checkbox, message , Modal} from "antd";
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { postApiV1AuthLogin } from '@/api/generated/sdk.gen';

export default function Login() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 處理「記住我」：組件載入時讀取 localStorage
  useEffect(() => {
    const rememberedUsername = localStorage.getItem('erp_remembered_username');
    if (rememberedUsername) {
      form.setFieldsValue({
        username: rememberedUsername,
        remember: true,
      });
    }
  }, [form]);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      const response = await postApiV1AuthLogin({
        body: {
          userName: values.username,
          password: values.password,
        },
      });

      // hey-api 的預設行為：發生 HTTP 錯誤時不會 throw，而是把錯誤內容放在 response.error 中
      if (response.error) {
        const errorData = response.error as any;
        Modal.error({ 
          centered: true, 
          title: '登入失敗', 
          content: errorData?.message || errorData?.title || '帳號或密碼錯誤，請重新輸入' 
        });
        return; // 停留在 Login 畫面
      }

      const token = response.data?.data?.token;
      if (token) {
        // 處理「記住我」：儲存或清除 localStorage
        if (values.remember) {
          localStorage.setItem('erp_remembered_username', values.username);
        } else {
          localStorage.removeItem('erp_remembered_username');
        }

        setToken(token);
        message.success('登入成功');
        navigate(ROUTES.HOME);
      } else {
        Modal.error({ 
          centered: true, 
          title: '登入失敗', 
          content: '系統未回傳 Token，請聯絡管理員' 
        });
      }
    } catch (error: any) {
      Modal.error({ 
        centered: true, 
        title: '系統錯誤', 
        content: error?.message || '發生未知的錯誤，請稍後再試' 
      });
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
      initialValues={{ remember: false }}
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
