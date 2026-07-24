import { Button, Form, Input, Checkbox, App, Alert } from "antd";
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import type { InputRef } from 'antd';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { postApiV1AuthLogin } from '@/api/generated/sdk.gen';

export default function Login() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setToken = useAuthStore((state) => state.setToken);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // 密碼欄位 Ref，用於登入失敗時的自動 Focus 與全選 (盲操優化)
  const passwordInputRef = useRef<InputRef>(null);

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
      setErrorMsg(null); // 清除先前錯誤

      const response = await postApiV1AuthLogin({
        body: {
          userName: values.username,
          password: values.password,
        },
      });

      // hey-api 的預設行為：發生 HTTP 錯誤時不會 throw，而是把錯誤內容放在 response.error 中
      if (response.error) {
        const errorData = response.error as any;
        const msg = errorData?.message || errorData?.title || '帳號或密碼錯誤，請重新輸入';
        setErrorMsg(msg);
        
        // 盲操優化：一秒內自動 Focus 密碼欄位並全選，讓使用者能直接重新輸入
        setTimeout(() => {
          passwordInputRef.current?.focus({ cursor: 'all' });
          passwordInputRef.current?.select();
        }, 100);
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
        
        const redirectParam = searchParams.get('redirect');
        if (redirectParam) {
          const targetUrl = decodeURIComponent(redirectParam);
          navigate(targetUrl, { replace: true });
        } else {
          navigate(ROUTES.HOME, { replace: true });
        }
      } else {
        setErrorMsg('系統未回傳 Token，請聯絡系統管理員');
      }
    } catch (error: any) {
      const errorData = error?.response?.data || error;
      const msg = errorData?.message || errorData?.title || '登入發生錯誤，請稍後再試';
      setErrorMsg(msg);
      
      setTimeout(() => {
        passwordInputRef.current?.focus({ cursor: 'all' });
        passwordInputRef.current?.select();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1 text-center">歡迎回來</h2>
      <p className="text-slate-400 text-xs text-center mb-6">請登入您的帳號以進入系統</p>

      {/* 內嵌式警示橫幅插槽 - 預留固定高度以實現 Zero CLS，防止輸入框/按鈕等物理座標向下擠壓 */}
      <div className="min-h-[48px] mb-4">
        {errorMsg ? (
          <Alert
            message={<span className="text-xs">{errorMsg}</span>}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            className="text-left border-red-900/30 bg-red-950/20 text-red-400"
          />
        ) : null}
      </div>
      
      <Form
        form={form}
        name="login"
        onFinish={onFinish}
        layout="vertical"
        requiredMark={false}
        size="large"
        initialValues={{ remember: false }}
        className="login-form"
      >
        <Form.Item
          name="username"
          label={<span className="text-slate-300 text-xs font-medium">電子郵件 / 帳號</span>}
          rules={[{ required: true, message: '請輸入帳號' }]}
          className="mb-4"
        >
          <Input 
            prefix={<UserOutlined className="text-slate-500" />} 
            placeholder="帳號 (預設: admin)" 
            autoFocus 
            className="bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 hover:border-slate-700 focus:border-blue-500"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span className="text-slate-300 text-xs font-medium">密碼</span>}
          rules={[{ required: true, message: '請輸入密碼' }]}
          className="mb-4"
        >
          <Input.Password 
            ref={passwordInputRef}
            prefix={<LockOutlined className="text-slate-500" />} 
            placeholder="密碼" 
            className="bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 hover:border-slate-700 focus:border-blue-500"
          />
        </Form.Item>

        <div className="flex justify-between items-center mb-5">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox className="text-slate-400 text-xs">記住我</Checkbox>
          </Form.Item>
          <a 
            className="text-blue-400 hover:text-blue-300 text-xs transition-colors cursor-pointer"
            onClick={() => navigate(ROUTES.FORGET_PASSWORD)}
          >
            忘記密碼？
          </a>
        </div>

        <Form.Item className="mb-0">
          <Button 
            type="primary" 
            htmlType="submit" 
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold h-11 rounded-lg transition-colors border-none shadow-lg shadow-blue-600/30" 
            loading={loading}
          >
            登入
          </Button>
        </Form.Item>

      </Form>
    </>
  );
}
