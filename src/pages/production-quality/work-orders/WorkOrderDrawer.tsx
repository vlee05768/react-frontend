import { useState, useEffect, useRef } from "react";
import { Space, Button, App, Drawer, Spin, Empty } from "antd";
import { CheckCircleOutlined, SyncOutlined, LockOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  getApiV1WorkOrderByWorkOrderNumber,
  postApiV1WorkOrder,
  putApiV1WorkOrderByWorkOrderNumber,
  postApiV1WorkOrderByWorkOrderNumberPreparationConfirm,
  postApiV1WorkOrderByWorkOrderNumberPreparationConfirmCancel,
  postApiV1WorkOrderByWorkOrderNumberLaminationConfirm,
  postApiV1WorkOrderByWorkOrderNumberLaminationConfirmCancel,
  postApiV1WorkOrderByWorkOrderNumberProductionComplete,
  postApiV1WorkOrderByWorkOrderNumberProductionCompleteCancel,
  postApiV1WorkOrderByWorkOrderNumberWarehousingComplete,
  postApiV1WorkOrderByWorkOrderNumberWarehousingCompleteCancel,
  getApiV1WorkOrderRequisitionWoByWorkOrderNumber,
  getApiV1WorkOrderReturnWoByWorkOrderNumber,
  getApiV1WorkOrderReturnByDocumentNumber,
  postApiV1WorkOrderReturnByDocumentNumberConfirm
} from "@/api/generated/sdk.gen";
import { getApiErrorMessage } from "@/utils/apiError";
import dayjs from "dayjs";
import { MasterDetailTabs } from "@/components/Form/MasterDetailTabs";
import { DynamicForm } from "@/components/Form/DynamicForm";
import { ActionButton } from "@/components/common/ActionButton";
import { useNavigate } from "react-router-dom";
import { formConfig } from "./WorkOrderConfig";
import { DRAWER_WIDTH_MAIN } from "@/constants";
import { DrawerTitle } from "@/components/Form/DrawerTitle";
import { DocumentLifecycleBanner } from "@/components/common/DocumentLifecycleBanner";
import type { LifecycleStep } from "@/components/common/DocumentLifecycleBanner";
import { ActionBar } from "@/components/common/ActionBar";
import { WorkOrderItemsTab } from "./WorkOrderItemsTab";
import { WorkOrderRequisitionTab } from "./WorkOrderRequisitionTab";
import { WorkOrderReturnTab } from "./WorkOrderReturnTab";
import { DocumentWatchButton } from '@/components/common/DocumentWatchButton';

interface WorkOrderDrawerProps {
  id?: string;
  isCreateMode?: boolean;
  onClose: () => void;
}

export function WorkOrderDrawer({
  id,
  isCreateMode = false,
  onClose,
}: WorkOrderDrawerProps) {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [editMode, setEditMode] = useState<'update' | 'prepare' | 'work' | null>(isCreateMode ? 'update' : null);
  const isEditing = editMode !== null;
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('master_info');

  const isViewMode = !isCreateMode && editMode === null;

  const hasAutoSwitchedRef = useRef(false);

  useEffect(() => {
    hasAutoSwitchedRef.current = false;
  }, [id]);

  const { data, isLoading } = useQuery({
    queryKey: ["workorder", id],
    queryFn: () => getApiV1WorkOrderByWorkOrderNumber({ path: { workOrderNumber: id! } }),
    enabled: !!id && !isCreateMode,
  });

  const { data: requisitionsData } = useQuery({
    queryKey: ["requisitions", id],
    queryFn: () => getApiV1WorkOrderRequisitionWoByWorkOrderNumber({ path: { workOrderNumber: id! } }),
    enabled: !!id && !isCreateMode,
  });

  const reqList = (requisitionsData?.data as any)?.data || [];
  const hasRequisition = reqList.length > 0;
  const requisition = hasRequisition ? reqList[0] : null;
  const isRequisitionConfirmed = requisition && !!requisition.confirmDate;

  const rawData = (data?.data as any)?.data || undefined;
  
  // Format dates to avoid dayjs crash in form
  const record: any = rawData ? {
    ...rawData,
    workOrderDate: rawData.workOrderDate ? dayjs(rawData.workOrderDate) : undefined,
    productionDate: rawData.productionDate ? dayjs(rawData.productionDate) : undefined,
    _ui_editMode: editMode,
  } : isCreateMode ? {
    storageCode: 'TW-QC-GEN',
    _ui_editMode: editMode,
  } : undefined;

  useEffect(() => {
    if (!isViewMode) {
      setActiveTab('master_info');
    }
  }, [isViewMode]);

  useEffect(() => {
    if (isViewMode && record && !isLoading) {
      if (!hasAutoSwitchedRef.current) {
        if (Array.isArray(record.items) && record.items.length === 0) {
          setActiveTab('materials');
        }
        hasAutoSwitchedRef.current = true;
      }
    }
  }, [isViewMode, record, isLoading]);

  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrder({ body: values }),
    onSuccess: () => {
      message.success("新增製令成功");
      queryClient.invalidateQueries({ queryKey: ["workorders"] });
      onClose();
    },
    onError: (error) => {
      modal.error({ title: "新增失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => putApiV1WorkOrderByWorkOrderNumber({ path: { workOrderNumber: id! }, body: values }),
    onSuccess: () => {
      // 💡 如果是備料確認或生產完工，不要單獨跳出「更新製令成功」提示，由後續作業統一通知
      if (editMode !== "prepare" && editMode !== "work") {
        message.success("更新製令成功");
      }
      queryClient.invalidateQueries({ queryKey: ["workorder", id] });
      queryClient.invalidateQueries({ queryKey: ["workorders"] });
      setEditMode(null);
    },
    onError: (error) => {
      modal.error({ title: "更新失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

    const handleSubmit = async (values: any) => {
    if (isCreateMode) {
      createMutation.mutate(values);
    } else if (editMode === 'prepare') {
      modal.confirm({
        title: '備料完成確認',
        content: '確定要確認備料完成嗎？確認後將無法隨意修改明細，並進入貼合。',
        centered: true,
        width: 400,
        onOk: async () => {
          try {
            await updateMutation.mutateAsync(values);
            await preparationConfirmMut.mutateAsync({});
            setEditMode(null);
          } catch (e) {
            // Error handled by mutation
          }
        }
      });
    } else if (editMode === 'work') {
      // 驗證人員工時
      const hours = values.personnelWorkingHours || [];
      const validHours = hours.filter(
        (item: any) => item.employeeNumber && item.employeeNumber.trim() && item.hours != null && item.hours > 0
      );

      if (validHours.length === 0) {
        modal.error({ 
          title: '驗證失敗', 
          content: '請至少輸入一筆有效的人員工時（需包含員工帳號和工時大於 0）', 
          centered: true 
        });
        return;
      }

      modal.confirm({
        title: '生產完成確認',
        content: '確定要確認生產完成嗎？確認後將進入入庫程序。',
        centered: true,
        width: 400,
        onOk: async () => {
          try {
            const productDto = {
              actualQuantity: values.actualQuantity,
              defectReason: values.defectReason,
              productionDate: values.productionDate?.format ? values.productionDate.format('YYYY-MM-DD') : values.productionDate,
              storageCode: values.storageCode,
              notes: values.notes,
              personnelWorkingHours: validHours,
            };
            await productionCompleteMut.mutateAsync(productDto);
            setEditMode(null);
          } catch (e) {
            // Error handled by mutation
          }
        }
      });
    } else {
      updateMutation.mutate(values);
    }
  };


  const handleCancel = () => {
    if (isCreateMode) {
      onClose();
    } else {
      setEditMode(null);
    }
  };

  // Status transitions
  const useStatusMutation = (
    mutationFn: (args: any) => Promise<any>,
    successMessage: string,
    onSuccessCallback?: () => void
  ) => useMutation({
    mutationFn,
    onSuccess: () => {
      message.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ["workorder", id] });
      queryClient.invalidateQueries({ queryKey: ["workorders"] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", id] });
      queryClient.invalidateQueries({ queryKey: ["requisition"] });
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    },
    onError: (error) => {
      modal.error({ title: "作業失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const preparationConfirmMut = useStatusMutation(
    () => postApiV1WorkOrderByWorkOrderNumberPreparationConfirm({ path: { workOrderNumber: id! } }),
    "備料確認成功"
  );
  const preparationCancelMut = useStatusMutation(
    () => postApiV1WorkOrderByWorkOrderNumberPreparationConfirmCancel({ path: { workOrderNumber: id! } }),
    "取消備料確認成功"
  );
  
  const laminationConfirmMut = useStatusMutation(
    () => postApiV1WorkOrderByWorkOrderNumberLaminationConfirm({ path: { workOrderNumber: id! } }),
    "貼合確認成功"
  );
  const laminationCancelMut = useStatusMutation(
    () => postApiV1WorkOrderByWorkOrderNumberLaminationConfirmCancel({ path: { workOrderNumber: id! } }),
    "取消貼合確認成功"
  );
  
  const productionCompleteMut = useStatusMutation(
    (bodyData: any) => postApiV1WorkOrderByWorkOrderNumberProductionComplete({ path: { workOrderNumber: id! }, body: bodyData }),
    "生產完成成功"
  );
  const productionCancelMut = useStatusMutation(
    () => postApiV1WorkOrderByWorkOrderNumberProductionCompleteCancel({ path: { workOrderNumber: id! } }),
    "取消生產完成成功"
  );
  
  const warehousingCompleteMut = useStatusMutation(
    () => postApiV1WorkOrderByWorkOrderNumberWarehousingComplete({ path: { workOrderNumber: id! } }),
    "入庫完成成功"
  );
  const warehousingCancelMut = useStatusMutation(
    () => postApiV1WorkOrderByWorkOrderNumberWarehousingCompleteCancel({ path: { workOrderNumber: id! } }),
    "取消入庫完成成功",
    () => {
      window.location.reload();
    }
  );

  
  const isDraft = record && !record.preparationConfirmDate;
  const isPrepCompleted = record && !!record.preparationConfirmDate && !record.laminationConfirmDate;
  const isInProduction = record && !!record.laminationConfirmDate && !record.productionCompleteDate;
  const isProdCompleted = record && !!record.productionCompleteDate && !record.warehousingCompleteDate;
  const isWarehousingCompleted = record && !!record.warehousingCompleteDate;

  // Query returns for the work order
  const { data: returnsResponse } = useQuery({
    queryKey: ["returns", id],
    queryFn: () =>
      getApiV1WorkOrderReturnWoByWorkOrderNumber({
        path: { workOrderNumber: id! },
      }),
    enabled: !!id && !isCreateMode && !!isWarehousingCompleted,
  });

  const returnList = (returnsResponse?.data as any)?.data || [];
  const activeDocNo = returnList.length > 0 ? returnList[0].documentNumber : null;

  // Query detail for the return document
  const { data: detailResponse } = useQuery({
    queryKey: ["return", activeDocNo],
    queryFn: () =>
      getApiV1WorkOrderReturnByDocumentNumber({
        path: { documentNumber: activeDocNo! },
      }),
    enabled: !!activeDocNo && !!isWarehousingCompleted,
  });

  const activeReturnRecord = (detailResponse?.data as any)?.data;
  const isReturnPosted = activeReturnRecord && !!activeReturnRecord.confirmDate;

  const confirmReturnMutation = useMutation({
    mutationFn: () =>
      postApiV1WorkOrderReturnByDocumentNumberConfirm({
        path: { documentNumber: activeDocNo! },
      }),
    onSuccess: () => {
      message.success("還料入庫過帳成功！剩餘卷料已還原至倉庫可用狀態");
      queryClient.invalidateQueries({ queryKey: ["return", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["returns", id] });
      queryClient.invalidateQueries({ queryKey: ["wipRollsAll", id] });
      queryClient.invalidateQueries({ queryKey: ["workorder", id] });
      queryClient.invalidateQueries({ queryKey: ["workorders"] });
    },
    onError: (error) => {
      modal.error({
        title: "還料過帳失敗",
        content: getApiErrorMessage(error),
        centered: true,
      });
    },
  });

  const getHeaderActions = () => {
    if (isCreateMode || isEditing) return null;
    if (!record) return null;

    return (
      <Space>
        <DocumentWatchButton documentType="WorkOrder" documentKey={record?.workOrderNumber} />
        {isWarehousingCompleted && activeDocNo && !isReturnPosted && (
          <ActionButton
            key="confirm-return-header"
            intent="success"
            icon={<CheckCircleOutlined />}
            disabled={isDetailEditing}
            loading={confirmReturnMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              const returnItems = activeReturnRecord?.items || [];
              if (returnItems.length === 0) {
                message.warning(
                  "此退料單尚無任何明細項目，請先編輯並點選下方「新增退回物料」加入項目！"
                );
                return;
              }
              modal.confirm({
                title: "確認還料入庫",
                content: "確定要執行此還料入庫過帳確認嗎？此操作將使剩餘卷料還原至倉庫可用狀態，且此單據將無法再修改。",
                okText: "確定",
                cancelText: "取消",
                centered: true,
                onOk: () => {
                  confirmReturnMutation.mutate();
                },
              });
            }}
          >
            還料入庫
          </ActionButton>
        )}
        {isDraft && (
          <ActionButton 
            key="prepare-confirm"
            intent="success" 
            icon={<CheckCircleOutlined />} 
            disabled={isDetailEditing || !hasRequisition || isRequisitionConfirmed}
            onClick={(e) => { 
              e.preventDefault(); 
              modal.confirm({
                title: '備料完成確認',
                content: '確定要確認備料完成嗎？系統將自動對關聯的領料單進行確認過帳，並進入貼合。',
                centered: true, 
                width: 400,
                onOk: async () => {
                  try {
                    await preparationConfirmMut.mutateAsync({});
                  } catch (e) {
                    // Error is already shown by mutation onError
                  }
                },
              });
            }}
          >
            備料確認
          </ActionButton>
        )}

        {isPrepCompleted && (
          <>
            <ActionButton 
              key="lamination"
              intent="success" 
              icon={<CheckCircleOutlined />} 
              disabled={isDetailEditing}
              onClick={(e) => { e.preventDefault(); modal.confirm({
                title: '貼合確認',
                content: '確定要確認貼合嗎？確認後將進入生產。',
                centered: true, width: 400,
                onOk: async () => {
                  try {
                    await laminationConfirmMut.mutateAsync({});
                  } catch (e) {
                    // Error is already shown by mutation onError
                  }
                },
              })}}
            >
              貼合確認
            </ActionButton>
            <ActionButton 
              key="cancel-prepare"
              intent="warning" 
              icon={<SyncOutlined />} 
              disabled={isDetailEditing}
              onClick={(e) => { e.preventDefault(); modal.confirm({
                title: '取消備料確認',
                content: '確定要取消備料確認嗎？取消後將回到新單據狀態。',
                centered: true, width: 400,
                onOk: async () => {
                  try {
                    await preparationCancelMut.mutateAsync({});
                  } catch (e) {
                    // Error is already shown by mutation onError
                  }
                },
              })}}
            >
              取消備料確認
            </ActionButton>
          </>
        )}

        {isInProduction && (
          <>
            <ActionButton 
              key="work"
              intent="primary" 
              icon={<CheckCircleOutlined />} 
              disabled={isDetailEditing}
              onClick={(e) => { e.preventDefault(); setEditMode('work'); }}
            >
              生產作業
            </ActionButton>
            <ActionButton 
              key="cancel-lamination"
              intent="warning" 
              icon={<SyncOutlined />} 
              disabled={isDetailEditing}
              onClick={(e) => { e.preventDefault(); modal.confirm({
                title: '取消貼合確認',
                content: '確定要取消貼合確認嗎？取消後將回到製令備料狀態。',
                centered: true, width: 400,
                onOk: async () => {
                  try {
                    await laminationCancelMut.mutateAsync({});
                  } catch (e) {
                    // Error is already shown by mutation onError
                  }
                },
              })}}
            >
              取消貼合確認
            </ActionButton>
          </>
        )}

        {isProdCompleted && (
          <>
            <ActionButton 
              key="warehousing"
              intent="success" 
              icon={<LockOutlined />} 
              disabled={isDetailEditing}
              onClick={(e) => { e.preventDefault(); modal.confirm({
                title: '入庫完成',
                content: '確定要確認入庫完成嗎？確認後製令將完成所有流程。',
                centered: true, width: 400,
                onOk: async () => {
                  try {
                    await warehousingCompleteMut.mutateAsync({});
                  } catch (e) {
                    // Error is already shown by mutation onError
                  }
                },
              })}}
            >
              入庫完成
            </ActionButton>
            <ActionButton 
              key="cancel-production"
              intent="warning" 
              icon={<SyncOutlined />} 
              disabled={isDetailEditing}
              onClick={(e) => { e.preventDefault(); modal.confirm({
                title: '取消生產完成',
                content: '確定要取消生產完成確認嗎？取消後將回到生產中（貼合已確認）狀態。',
                centered: true, width: 400,
                onOk: async () => {
                  try {
                    await productionCancelMut.mutateAsync({});
                  } catch (e) {
                    // Error is already shown by mutation onError
                  }
                },
              })}}
            >
              取消生產完成
            </ActionButton>
          </>
        )}

        {isWarehousingCompleted && (
          <ActionButton 
            key="cancel-warehousing"
            intent="warning" 
            icon={<SyncOutlined />} 
            disabled={isDetailEditing}
            onClick={(e) => { e.preventDefault(); modal.confirm({
              title: '取消入庫完成',
              content: '確定要取消入庫完成確認嗎？取消後將回到生產完成狀態。',
              centered: true, width: 400,
              onOk: async () => {
                try {
                  await warehousingCancelMut.mutateAsync({});
                } catch (e) {
                  // Error is already shown by mutation onError
                }
              },
            })}}
          >
            取消入庫完成
          </ActionButton>
        )}
      </Space>
    );
  };

  const getActionBarActions = () => {
    if (isCreateMode || isEditing) {
      const submitText = editMode === 'prepare' ? '備料完成確認' : editMode === 'work' ? '生產完成確認' : '儲存';
      return (
        <Space>
          <Button key="save" type="primary" onClick={() => (document.getElementById("workOrderForm") as HTMLFormElement)?.requestSubmit()} loading={createMutation.isPending || updateMutation.isPending || preparationConfirmMut.isPending || productionCompleteMut.isPending}>
            {submitText}
          </Button>
          <Button key="cancel" onClick={handleCancel}>取消</Button>
        </Space>
      );
    }

    if (!record) return null;

    return (
      <Space>
        {isDraft && (
          <Button key="edit" type="primary" onClick={(e) => { e.preventDefault(); setEditMode('update'); }} disabled={isDetailEditing}>
            編輯
          </Button>
        )}
      </Space>
    );
  };


  const masterForm = (
    <DynamicForm
      formId="workOrderForm"
      fields={formConfig}
      defaultValues={record}
      isViewMode={isViewMode}
      isUpdateMode={isEditing}
      onSubmit={handleSubmit}
      hideDefaultFooter
    />
  );


  let statusText = "草稿 / 備料中";
  let statusColor = "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
  if (record) {
    if (isWarehousingCompleted) {
      statusText = "完工入庫";
      statusColor = "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    } else if (isProdCompleted) {
      statusText = "待入庫";
      statusColor = "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    } else if (isInProduction) {
      statusText = "生產中";
      statusColor = "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    } else if (isPrepCompleted) {
      statusText = "待貼合";
      statusColor = "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    }
  }
  const statusTag = record ? <span className={`px-2 py-0.5 text-xs border rounded transition-colors ${statusColor}`}>{statusText}</span> : undefined;

  let steps: LifecycleStep[] = [];
  if (record) {
    steps = [
      {
        title: 'Draft',
        status: record.preparationConfirmDate ? 'finish' : 'process',
        date: record.createdAt,
        user: record.createdBy ? `建立: ${record.createdBy}` : null,
      },
      {
        title: '製令備料',
        status: !record.preparationConfirmDate ? 'wait' : (record.laminationConfirmDate ? 'finish' : 'process'),
        date: record.preparationConfirmDate,
        user: record.preparationConfirmUser ? `備料: ${record.preparationConfirmUser}` : null,
      },
      {
        title: '貼合',
        status: !record.laminationConfirmDate ? 'wait' : (record.productionCompleteDate ? 'finish' : 'process'),
        date: record.laminationConfirmDate,
        user: record.laminationConfirmUser ? `貼合: ${record.laminationConfirmUser}` : null,
      },
      {
        title: '生產',
        status: !record.productionCompleteDate ? 'wait' : (record.warehousingCompleteDate ? 'finish' : 'process'),
        date: record.productionCompleteDate,
        user: record.productionCompleteUser 
          ? `生產: ${record.productionCompleteUser}` : null,
      },
      {
        title: '完工入庫',
        status: !record.warehousingCompleteDate ? 'wait' : 'finish',
        date: record.warehousingCompleteDate,
        user: record.warehousingCompleteUser ? `入庫: ${record.warehousingCompleteUser}` : null,
      },
      {
        title: '製令退料入庫',
        status: !record.warehousingCompleteDate 
          ? 'wait' 
          : (record.pendingWipRollsCount > 0 ? 'process' : 'finish'),
        date: record.latestReturnDate || null,
        user: record.warehousingCompleteDate && record.pendingWipRollsCount > 0
          ? `待清退 (${record.pendingWipRollsCount}卷)`
          : record.latestReturnUser ? `退料: ${record.latestReturnUser}` : null,
      }
    ];
  }

  const drawerStyles = {
    body: { padding: 0, overflow: 'hidden' as const } // Remove body padding and hide outer scrollbar
  };

  return (
    <Drawer
      styles={drawerStyles}
      title={<DrawerTitle moduleName="製令" isCreate={isCreateMode} isEdit={isEditing} record={record} displayField={(r) => r?.workOrderNumber || ''} statusTag={statusTag} />}
      extra={getHeaderActions()}
      open={true}
      onClose={() => {
        if (onClose) onClose();
        navigate('/production-quality/work-orders');
      }}
      size={DRAWER_WIDTH_MAIN as any}
      
      mask={{ closable: isViewMode }}
      keyboard={isViewMode}
    >

      <Spin spinning={isLoading}>
        <ActionBar 
            createdBy={record?.createdBy}
            createdAt={record?.createdAt}
            updatedBy={record?.updatedBy}
            updatedAt={record?.updatedAt}
            actions={getActionBarActions()}
          />
        <div className="py-2 px-6">
          {!isCreateMode && record && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
          heightOffset={!isCreateMode && record ? 320 : 160}
          viewId={id}
          entityType="WorkOrder"
          isCreateMode={isCreateMode}
          isEditMode={isEditing}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          masterContent={
            <div className={activeTab === 'master_info' ? 'block' : 'hidden'}>
              {masterForm}
            </div>
          }
          disableTabSwitching={isDetailEditing}
          detailTabs={[
            {
              key: "materials",
              label: "材料明細",
              children: record ? (
                <WorkOrderItemsTab
                  masterData={record}
                  isMasterViewMode={isViewMode}
                  onEditingChange={setIsDetailEditing}
                />
              ) : <Empty description="請先儲存製令主檔" />
            },
            {
              key: "requisitions",
              label: "製令領料記錄",
              children: record ? (
                <WorkOrderRequisitionTab masterData={record} />
              ) : <Empty description="請先儲存製令主檔" />
            },
            {
              key: "returns",
              label: "製令退料記錄",
              disabled: record?.status !== 'WarehousingCompleted',
              children: record ? (
                <WorkOrderReturnTab masterData={record} onEditingChange={setIsDetailEditing} />
              ) : <Empty description="請先儲存製令主檔" />
            }
          ]}
        />
        </div>
      </Spin>
    </Drawer>
  );};
