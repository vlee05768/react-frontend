import { useState } from 'react';
import { Button, Form, Input, App, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { postApiV1AuthForgotPassword } from '@/api/generated/sdk.gen';

export default function ForgetPassword() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const onFinish = async (values: { email: string }) => {
    if (loading) return;

    try {
      setLoading(true);
      const response = await postApiV1AuthForgotPassword({
        body: {
          email: values.email,
        },
      });

      if (response.error) {
        const errorData = response.error as any;
        const msg = errorData?.message || errorData?.title || '發送失敗，請稍後再試';
        message.error(msg);
        return;
      }

      message.success('重設密碼信已發送，請至您的信箱查收');
      setSubmittedEmail(values.email);
      setIsSuccess(true);
    } catch (error: any) {
      const errorData = error?.response?.data || error;
      const msg = errorData?.message || errorData?.title || '發送失敗，請稍後再試';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-4">
        <Result
          status="success"
          title={<span className="text-white text-xl font-bold">重設密碼信已發送</span>}
          subTitle={
            <div className="text-slate-400 text-sm mt-2 leading-relaxed">
              我們已將重設密碼連結發送至 <span className="text-blue-400 font-medium">{submittedEmail}</span>
              <br />
              請至您的電子信箱查收並依指示完成重設密碼。
            </div>
          }
          extra={[
            <Button
              type="primary"
              key="login"
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold h-11 rounded-lg transition-colors border-none shadow-lg shadow-blue-600/30 mb-3"
              onClick={() => navigate(ROUTES.LOGIN)}
            >
              返回登入
            </Button>,
            <Button
              type="default"
              key="resend"
              className="w-full"
              onClick={() => {
                setIsSuccess(false);
                form.resetFields();
              }}
            >
              重新輸入信箱
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-2 text-center">忘記密碼</h2>
      <p className="text-slate-400 text-xs text-center mb-6">請輸入您的註冊信箱以接收重設密碼驗證碼</p>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        size="large"
        requiredMark={false}
        className="forget-password-form"
      >
        <Form.Item
          name="email"
          label={<span className="text-slate-300 text-xs font-medium">電子信箱</span>}
          rules={[
            { required: true, message: '請輸入電子信箱' },
            { type: 'email', message: '電子信箱格式不正確' },
          ]}
          className="mb-6"
        >
          <Input
            prefix={<MailOutlined className="text-slate-500" />}
            placeholder="請輸入註冊時的電子信箱"
            autoFocus
            className="bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 hover:border-slate-700 focus:border-blue-500"
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold h-11 rounded-lg transition-colors border-none shadow-lg shadow-blue-600/30 mb-3"
            loading={loading}
          >
            發送重設驗證碼
          </Button>
          <Button
            type="default"
            className="w-full"
            onClick={() => navigate(ROUTES.LOGIN)}
            disabled={loading}
          >
            返回登入
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
