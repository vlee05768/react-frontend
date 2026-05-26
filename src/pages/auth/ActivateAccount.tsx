import { useState, useEffect } from 'react';
import { Button, Form, Input, message, Modal } from 'antd';
import { LockOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { postApiV1AuthActivateAccount } from '@/api/generated/sdk.gen';

export default function ActivateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'reset' | 'success' | 'error'>('reset');
  const [errorMessage, setErrorMessage] = useState('');

  // 從 URL 查詢參數中獲取 email 和 token
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  useEffect(() => {
    // 驗證必要參數
    if (!email || !token) {
      setErrorMessage('缺少必要的參數，請重新從郵件中點擊啟用連結');
      setStep('error');
      return;
    }

    // 驗證 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('無效的電子郵件格式');
      setStep('error');
      return;
    }

    // 檢查 token 格式 (基本長度檢查)
    if (token.length < 10) {
      setErrorMessage('無效的驗證 token');
      setStep('error');
      return;
    }

    console.log('啟用帳號頁面初始化:', {
      email,
      tokenLength: token.length,
    });
  }, [email, token]);

  const onFinish = async (values: any) => {
    if (loading) return;

    try {
      setLoading(true);

      const response = await postApiV1AuthActivateAccount({
        body: {
          email,
          token,
          password: values.password,
        },
      });

      if (response.error) {
        const errorData = response.error as any;
        const errorMsg = errorData?.message || errorData?.title || '啟用帳號並設定密碼失敗，請稍後再試';

        // 檢查是否為 token 相關錯誤
        const errMsgLower = errorMsg.toLowerCase();
        if (
          errMsgLower.includes('token') ||
          errMsgLower.includes('invalid') ||
          errorMsg.includes('無效') ||
          errorMsg.includes('過期')
        ) {
          setErrorMessage(errorMsg);
          setStep('error');
        } else {
          Modal.error({
            centered: true,
            title: '啟用帳號失敗',
            content: errorMsg,
          });
        }
        return;
      }

      message.success('帳號啟用成功');
      setStep('success');
    } catch (error: any) {
      console.error('啟用帳號發生錯誤:', error);
      const errorData = error?.response?.data || error;
      Modal.error({
        centered: true,
        title: '啟用帳號失敗',
        content: errorData?.message || errorData?.title || '啟用發生異常，請稍後再試',
      });
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigate(ROUTES.LOGIN);
  };

  return (
    <div>
      {step === 'reset' && (
        <>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">啟用帳號</h2>
          <p className="text-gray-400 text-sm text-center mb-6">
            為完成帳號啟用，請設定您的密碼。
          </p>

          {/* 顯示郵件資訊 */}
          <div className="bg-gray-900 border border-gray-700/60 rounded-lg p-3 text-center mb-6">
            <span className="text-gray-400 text-xs">
              正在為電子郵件地址 <strong className="text-blue-400 font-semibold">{email}</strong> 啟用帳號並設定密碼
            </span>
          </div>

          <Form
            form={form}
            name="activate"
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="password"
              label={<span className="text-gray-300 text-sm">新密碼</span>}
              rules={[{ required: true, message: '請輸入新密碼' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-500" />}
                placeholder="密碼"
                autoFocus
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span className="text-gray-300 text-sm">確認新密碼</span>}
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
              <Input.Password
                prefix={<LockOutlined className="text-gray-500" />}
                placeholder="請再次輸入新密碼"
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500"
              />
            </Form.Item>

            {/* 密碼設定規則 */}
            <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-4 mb-6">
              <div className="text-gray-300 text-xs font-semibold mb-2">密碼設定規則</div>
              <ul className="text-gray-400 text-xs list-disc pl-4 space-y-1">
                <li>長度至少 6 個字元</li>
                <li>需包含大、小寫英文字母 (A-Z, a-z)</li>
                <li>需包含數字 (0-9) 與特殊符號 (!@#$%^&*)</li>
              </ul>
            </div>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg transition-colors border-none shadow-lg shadow-blue-600/30"
                loading={loading}
              >
                啟用帳號並設定密碼
              </Button>
              <Button
                type="default"
                className="w-full h-11 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 bg-transparent mt-3"
                onClick={goToLogin}
              >
                返回登入
              </Button>
            </Form.Item>
          </Form>
        </>
      )}

      {step === 'success' && (
        <div className="text-center py-4">
          <div className="mb-6 flex justify-center">
            <CheckCircleFilled className="text-green-500 text-6xl" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">帳號啟用成功！</h3>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            您的帳號已成功啟用並設定密碼，請點擊下方按鈕登入系統。
          </p>
          <Button
            type="primary"
            onClick={goToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg transition-colors border-none shadow-lg shadow-blue-600/30"
          >
            前往登入
          </Button>
        </div>
      )}

      {step === 'error' && (
        <div className="text-center py-4">
          <div className="mb-6 flex justify-center">
            <CloseCircleFilled className="text-red-500 text-6xl" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">啟用連結無效</h3>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            {errorMessage || '連結無效、過期，或已被使用。'}
          </p>
          <Button
            type="primary"
            onClick={goToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg transition-colors border-none shadow-lg shadow-blue-600/30"
          >
            返回登入
          </Button>
        </div>
      )}
    </div>
  );
}
