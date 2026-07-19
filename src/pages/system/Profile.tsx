import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, Collapse, Row, Col, message, Modal, Divider, Table, Popconfirm } from 'antd';
import { EditOutlined, UserOutlined, SaveOutlined, CloseOutlined, LockOutlined, StarFilled, LaptopOutlined } from '@ant-design/icons';
import { getApiV1AuthProfile, putApiV1AuthProfile, postApiV1AuthChangePassword } from '@/api/generated/sdk.gen';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useDocumentSubscriptionStore } from '@/stores/useDocumentSubscriptionStore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ROUTES } from '@/constants/routes';

const profileSchema = z.object({
  phoneNumber: z.string().optional().nullable(),
  extensionNumber: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '請輸入舊密碼'),
  newPassword: z.string().min(6, '新密碼至少需 6 個字元'),
  confirmPassword: z.string().min(1, '請再次輸入新密碼'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '兩次輸入的新密碼不相符',
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const getUAInfo = () => {
  if (typeof window === 'undefined') return { os: '未知', browser: '未知' };
  const ua = navigator.userAgent;
  let os = '未知';
  let browser = '未知';

  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browser = 'Google Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/opr/i.test(ua)) browser = 'Opera';

  return { os, browser };
};

export default function Profile() {
  const device = useDeviceDetect();
  const uaInfo = getUAInfo();

  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [activeKeys, setActiveKeys] = useState<string[]>(['profile', 'subscriptions', 'device']);
  
  const queryClient = useQueryClient();
  const { logout, user } = useAuthStore();
  const { mode } = useThemeStore();
  const navigate = useNavigate();

  const { subscriptions, fetchMySubscriptions, toggleSubscription, isLoading: isStoreLoading } = useDocumentSubscriptionStore();

  useEffect(() => {
    // 進入個人資料頁面時，強制重新拉取最新的關注單據清單
    fetchMySubscriptions(true);
  }, [fetchMySubscriptions]);

  // 1. Fetch Profile
  const { data: profileResponse, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getApiV1AuthProfile(),
  });
  
  const profile = profileResponse?.data?.data;

  // 2. Setup Profile Form
  const { control, handleSubmit: handleSubmitProfile, reset: resetProfile } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phoneNumber: profile?.phoneNumber || '',
      extensionNumber: profile?.extensionNumber || '',
    },
  });

  // Update default values when profile data is loaded
  useEffect(() => {
    if (profile) {
      resetProfile({
        phoneNumber: profile.phoneNumber || '',
        extensionNumber: profile.extensionNumber || '',
      });
    }
  }, [profile, resetProfile]);

  // 3. Setup Password Form
  const { 
    control: pwdControl, 
    handleSubmit: handleSubmitPassword, 
    reset: resetPassword,
    formState: { errors: pwdErrors }
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // 4. Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => putApiV1AuthProfile({ body: { phoneNumber: data.phoneNumber, extensionNumber: data.extensionNumber } as any }),
    onSuccess: (res) => {
      if (res.data?.success === false) {
        Modal.error({ centered: true, title: '錯誤提示', content: res.data?.message || '更新失敗' });
        return;
      }
      message.success('個人資料更新成功');
      setIsEditing(false);
      setActiveKeys(['profile', 'subscriptions']);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: error?.response?.data?.message || '更新失敗' });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) => postApiV1AuthChangePassword({ 
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      }
    }),
    onSuccess: (res) => {
      if (res.data?.success === false) {
        Modal.error({ centered: true, title: '錯誤提示', content: res.data?.message || '修改密碼失敗' });
        return;
      }
      message.success('密碼修改成功，請重新登入');
      setIsPasswordModalVisible(false);
      logout();
      navigate(ROUTES.LOGIN);
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: error?.response?.data?.message || '修改密碼失敗' });
    }
  });

  const onSubmitProfile = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitPassword = (data: PasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };

  const navigateToDocument = (documentType?: string | null, documentKey?: string | null) => {
    if (!documentKey || !documentType) return;
    if (documentType === 'SalesOrder' || documentType === 'Order') {
      navigate(`/sales/orders/${documentKey}`);
    } else if (documentType === 'SalesDelivery') {
      navigate(`/sales/sales-deliveries/${documentKey}`);
    } else if (documentType === 'WorkOrder') {
      navigate(`/production-quality/work-orders/${documentKey}`);
    } else if (documentType === 'ProductionReceipt') {
      navigate(`/production-quality/production-receipts/${documentKey}`);
    }
  };

  const handleCancelEdit = () => {
    resetProfile({
      phoneNumber: profile?.phoneNumber || '',
      extensionNumber: profile?.extensionNumber || '',
    });
    setIsEditing(false);
    setActiveKeys(['profile', 'subscriptions']);
  };

  const collapseItems = [
    {
      key: 'profile',
      label: (
        <div className="flex items-center gap-2 font-medium">
          <UserOutlined className={mode === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
          <span>個人資料</span>
        </div>
      ),
      children: (
        <div className="max-h-[calc(100vh-250px)] overflow-y-auto overflow-x-hidden pr-2">
          <Form layout="vertical" className="w-full">
            {/* 基本資訊 */}
            <div className="text-lg font-medium mb-4">基本資訊</div>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item label="姓名">
                  <Input value={profile?.name || ''} disabled  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="員工編號">
                  <Input value={profile?.employeeCode || ''} disabled  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="職位">
                  <Input value={profile?.position || ''} disabled  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="部門">
                  <Input value={profile?.department || ''} disabled  />
                </Form.Item>
              </Col>
            </Row>

            <Divider className={`${mode === "dark" ? "border-[#303030]" : "border-gray-200"}`} />

            {/* 聯絡資訊 */}
            <div className="text-lg font-medium mb-4">聯絡資訊</div>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item label={<><span className="text-red-500 mr-1">*</span>電子郵件</>}>
                  <Input value={profile?.email || ''} disabled  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="手機號碼">
                  <Input value={profile?.mobile || ''} disabled  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="電話號碼">
                  <Controller
                    name="phoneNumber"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} value={field.value || ""} disabled={!isEditing} />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="分機號碼">
                  <Controller
                    name="extensionNumber"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} value={field.value || ""} disabled={!isEditing} />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      )
    }
  ];

  collapseItems.push({
    key: 'device',
    label: (
      <div className="flex items-center gap-2 font-medium">
        <LaptopOutlined className={mode === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
        <span>設備與瀏覽器資訊</span>
      </div>
    ),
    children: (
      <div className="max-h-[calc(100vh-250px)] overflow-y-auto overflow-x-hidden pr-2">
        <div className="text-lg font-medium mb-4">目前登入設備屬性</div>
        <Row gutter={[24, 16]}>
          <Col xs={12} sm={8}>
            <div className="text-xs text-gray-400 mb-1">偵測設備類型</div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {device.isPDA ? '工業手持 PDA 掃描槍' : device.isMobile ? '智慧型手機' : device.isTablet ? '平板電腦' : '桌上型電腦 / 筆電'}
            </div>
          </Col>
          <Col xs={12} sm={8}>
            <div className="text-xs text-gray-400 mb-1">作業系統 (OS)</div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{uaInfo.os}</div>
          </Col>
          <Col xs={12} sm={8}>
            <div className="text-xs text-gray-400 mb-1">瀏覽器核心</div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{uaInfo.browser}</div>
          </Col>
          <Col xs={12} sm={8}>
            <div className="text-xs text-gray-400 mb-1">觸控螢幕支援</div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{device.isTouchDevice ? '支援 (Touch Screen)' : '不支援 (Mouse Only)'}</div>
          </Col>
          <Col xs={12} sm={8}>
            <div className="text-xs text-gray-400 mb-1">實時視窗大小 (Viewport)</div>
            <div className="text-sm font-semibold font-mono text-gray-800 dark:text-gray-200">{device.viewportWidth} × {device.viewportHeight}</div>
          </Col>
          <Col xs={12} sm={8}>
            <div className="text-xs text-gray-400 mb-1">螢幕硬體解析度 (Screen)</div>
            <div className="text-sm font-semibold font-mono text-gray-800 dark:text-gray-200">{typeof window !== 'undefined' ? `${window.screen.width} × ${window.screen.height}` : '未知'}</div>
          </Col>
          <Col xs={24}>
            <div className="text-xs text-gray-400 mb-1">完整 User Agent 字串</div>
            <div className="text-xs font-mono bg-gray-50 dark:bg-zinc-900/50 p-3 rounded border border-gray-100 dark:border-zinc-800 break-all text-gray-600 dark:text-gray-400">
              {typeof navigator !== 'undefined' ? navigator.userAgent : '未知'}
            </div>
          </Col>
        </Row>
      </div>
    )
  });

  if (isStoreLoading || (subscriptions && subscriptions.length > 0)) {
    collapseItems.push({
      key: 'subscriptions',
      label: (
        <div className="flex items-center gap-2 font-medium">
          <StarFilled className="text-amber-500 animate-pulse" />
          <span>關注單據清單</span>
        </div>
      ),
      children: (
        <div className="max-h-[calc(100vh-250px)] overflow-y-auto overflow-x-hidden pr-2">
          <Table
            dataSource={subscriptions}
            rowKey="id"
            loading={isStoreLoading}
            pagination={{ pageSize: 5 }}
            columns={[
              {
                title: '單據類型',
                dataIndex: 'documentTypeName',
                key: 'documentTypeName',
                render: (text) => <span className="font-medium">{text}</span>,
              },
              {
                title: '單據號碼',
                dataIndex: 'documentKey',
                key: 'documentKey',
                render: (text, record) => (
                  <Button 
                    type="link" 
                    className="p-0 font-mono text-blue-500 hover:text-blue-600 h-auto"
                    onClick={() => navigateToDocument(record.documentType, record.documentKey)}
                  >
                    {text}
                  </Button>
                ),
              },
              {
                title: '關注時間',
                dataIndex: 'subscribedAt',
                key: 'subscribedAt',
                render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
              },
              {
                title: '操作',
                key: 'action',
                align: 'center',
                render: (_, record) => (
                  <Popconfirm
                    title="確定要取消關注此單據嗎？"
                    onConfirm={() => toggleSubscription(record.documentType || '', record.documentKey || '')}
                    okText="確定"
                    cancelText="取消"
                  >
                    <Button
                      type="link"
                      danger
                      icon={<StarFilled className="text-red-500" />}
                    >
                      取消關注
                    </Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        </div>
      )
    });
  }

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto h-full p-4">
      {/* Header Area */}
      <div className={`flex items-center justify-between pb-4 border-b ${mode === 'dark' ? 'border-[#303030]' : 'border-gray-200'}`}>
        <h1 className={`text-2xl font-semibold m-0 ${mode === "dark" ? "text-gray-100" : "text-gray-800"}`}>
          <span className="font-bold">{user?.userName || profile?.userName}</span> 的個人資訊
        </h1>
        <div className="flex gap-2">
          <Button 
            type="default" 
            icon={<LockOutlined />}
            onClick={() => {
              resetPassword();
              setIsPasswordModalVisible(true);
            }}
            disabled={isEditing}
          >
            修改密碼
          </Button>
          {!isEditing ? (
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={() => {
                setIsEditing(true);
                setActiveKeys(['profile']);
              }}
            >
              編輯資料
            </Button>
          ) : (
            <>
              <Button onClick={handleCancelEdit} icon={<CloseOutlined />}>
                取消
              </Button>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                loading={updateProfileMutation.isPending}
                onClick={handleSubmitProfile(onSubmitProfile)}
              >
                儲存
              </Button>
            </>
          )}
        </div>
      </div>

      <Collapse 
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(typeof keys === 'string' ? [keys] : (keys as string[]))}
        items={collapseItems} 
        className={`${mode === 'dark' ? 'bg-[#141414] border-[#303030]' : 'bg-white'}`}
      />

      {/* Password Modal */}
      <Modal
        title="修改密碼"
        open={isPasswordModalVisible}
        onOk={handleSubmitPassword(onSubmitPassword)}
        onCancel={() => setIsPasswordModalVisible(false)}
        confirmLoading={changePasswordMutation.isPending}
        okText="確認修改"
        cancelText="取消"
      >
        <Form layout="vertical" className="mt-4">
          <Form.Item 
            label="舊密碼" 
            validateStatus={pwdErrors.currentPassword ? 'error' : ''}
            help={pwdErrors.currentPassword?.message as string}
            required
          >
            <Controller
              name="currentPassword"
              control={pwdControl}
              render={({ field }) => <Input.Password {...field} />}
            />
          </Form.Item>
          
          <Form.Item 
            label="新密碼"
            validateStatus={pwdErrors.newPassword ? 'error' : ''}
            help={pwdErrors.newPassword?.message as string}
            required
          >
            <Controller
              name="newPassword"
              control={pwdControl}
              render={({ field }) => <Input.Password {...field} />}
            />
          </Form.Item>
          
          <Form.Item 
            label="確認新密碼"
            validateStatus={pwdErrors.confirmPassword ? 'error' : ''}
            help={pwdErrors.confirmPassword?.message as string}
            required
          >
            <Controller
              name="confirmPassword"
              control={pwdControl}
              render={({ field }) => <Input.Password {...field} />}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
