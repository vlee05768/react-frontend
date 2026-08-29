import { Button, Form, Input, App, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { postApiV1AuthResetPassword } from '@/api/generated/sdk.gen';

export default function ResetPassword() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tokenFromQuery = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const emailFromQuery = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const isLinkInvalid = !tokenFromQuery || !emailFromQuery;

  const onFinish = async (values: any) => {
    if (isLinkInvalid) {
      message.error('無效的重設密碼連結，請重新申請');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const response = await postApiV1AuthResetPassword({
        body: {
          email: emailFromQuery,
          token: tokenFromQuery,
          password: values.password,
          confirmPassword: values.confirmPassword,
        },
      });

      if (response.error) {
        const errorData = response.error as any;
        const msg = errorData?.message || errorData?.title || '重設密碼失敗，Token 可能已過期';
        setErrorMsg(msg);
        message.error(msg);
        return;
      }

      message.success('密碼重設成功，請使用新密碼登入');
      navigate(ROUTES.LOGIN);
    } catch (err: any) {
      const msg = err?.message || '重設密碼失敗，請稍後再試';
      setErrorMsg(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl text-white mb-6 text-center">重設密碼</h2>

      {isLinkInvalid ? (
        <div className="space-y-6">
          <Alert
            message="無效的重設密碼連結"
            description="此連結缺少必要的驗證參數或已失效，請重新申請重設密碼。"
            type="error"
            showIcon
          />
          <div className="space-y-4">
            <Button
              type="primary"
              className="w-full"
              size="large"
              onClick={() => navigate(ROUTES.FORGET_PASSWORD)}
            >
              前往忘記密碼頁面重新申請
            </Button>
            <Button
              type="default"
              className="w-full"
              size="large"
              onClick={() => navigate(ROUTES.LOGIN)}
            >
              返回登入
            </Button>
          </div>
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          {errorMsg && (
            <Alert
              message={errorMsg}
              type="error"
              showIcon
              className="mb-4"
              closable
              onClose={() => setErrorMsg(null)}
            />
          )}

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
            <Button
              type="primary"
              htmlType="submit"
              className="w-full mb-4"
              loading={loading}
            >
              確認重設
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
      )}
    </div>
  );
}
