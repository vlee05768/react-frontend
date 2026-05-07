import React, { useState, useEffect } from 'react';
import { Upload, Button, Row, Col, Empty, Modal, message, Tooltip, Spin, Card } from 'antd';
import dayjs from 'dayjs';
import { 
  UploadOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileOutlined,
  InboxOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { 
  getApiV1FileAttachment, 
  postApiV1FileAttachmentBatchUpload,
  deleteApiV1FileAttachmentBatchDelete 
} from '@/api/generated/sdk.gen';
import type { FileAttachmentDto } from '@/api/generated/types.gen';

const { Dragger } = Upload;

export interface FileAttachmentZoneProps {
  referenceType: string;
  referenceId: string;
  readonly?: boolean;
}

export const FileAttachmentZone: React.FC<FileAttachmentZoneProps> = ({
  referenceType,
  referenceId,
  readonly = false,
}) => {
  const [attachments, setAttachments] = useState<FileAttachmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const fetchAttachments = async () => {
    if (!referenceId) return;
    setLoading(true);
    try {
      const { data } = await getApiV1FileAttachment({
        query: {
          referenceType,
          referenceId,
        }
      });
      if (data) {
        setAttachments(data);
      }
    } catch (error) {
      message.error('取得附件失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [referenceType, referenceId]);

  const handleUploadSubmit = async () => {
    const files = fileList.map(f => f.originFileObj as Blob).filter(Boolean);
    if (files.length === 0) return;

    setUploading(true);
    try {
      await postApiV1FileAttachmentBatchUpload({
        body: {
          referenceType,
          referenceId,
          files,
        }
      });
      message.success('上傳成功');
      setUploadModalVisible(false);
      setFileList([]);
      fetchAttachments();
    } catch (error) {
      message.error('上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (attachment: FileAttachmentDto) => {
    Modal.confirm({
      title: '確認刪除',
      content: `確定要刪除檔案「${attachment.fileName || '未命名檔案'}」嗎？`,
      okText: '刪除',
      okType: 'danger',
      cancelText: '取消',
      centered: true,
      onOk: async () => {
        if (!attachment.id) return;
        try {
          await deleteApiV1FileAttachmentBatchDelete({
            body: {
              referenceType,
              referenceId,
              ids: [attachment.id]
            }
          });
          message.success('刪除成功');
          fetchAttachments();
        } catch (error) {
          message.error('刪除失敗');
        }
      }
    });
  };

  const handleDownload = (attachment: FileAttachmentDto) => {
    if (attachment.presignedUrl) {
      const a = document.createElement('a');
      a.href = attachment.presignedUrl;
      a.download = attachment.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      message.warning('無法取得檔案連結');
    }
  };

  const handleView = (attachment: FileAttachmentDto) => {
    if (attachment.presignedUrl) {
      window.open(attachment.presignedUrl, '_blank', 'noopener,noreferrer');
    } else {
      message.warning('無法取得檔案連結');
    }
  };

  const getFileIcon = (fileName?: string | null) => {
    if (!fileName) return <FileOutlined />;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FileImageOutlined style={{ color: '#1890ff' }} />;
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#f5222d' }} />;
    return <FileOutlined style={{ color: '#8c8c8c' }} />;
  };

  // 處理貼上事件
  useEffect(() => {
    if (!uploadModalVisible) return;
    
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const newFiles: UploadFile[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            newFiles.push({
              uid: `-paste-${Date.now()}-${i}`,
              name: file.name || `Pasted_Image_${dayjs().format('YYYYMMDD_HHmmss')}.png`,
              status: 'done',
              size: file.size,
              type: file.type,
              originFileObj: file as any,
            });
          }
        }
      }
      
      if (newFiles.length > 0) {
        setFileList(prev => [...prev, ...newFiles]);
        message.info(`已從剪貼簿加入 ${newFiles.length} 個檔案`);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [uploadModalVisible]);

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false; // 防止自動上傳
    },
  };

  return (
    <div>
      <Spin spinning={loading}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>附件管理</h3>
          {!readonly && (
            <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalVisible(true)}>
              上傳附件
            </Button>
          )}
        </div>

        <Row gutter={[16, 16]}>
          {attachments.length === 0 ? (
            <Col span={24}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暫無附件" />
            </Col>
          ) : (
            attachments.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} xl={6} xxl={4} key={item.id || item.fileName}>
                <Card
                  hoverable
                  size="small"
                  actions={[
                    <Tooltip key="view" title="檢視"><EyeOutlined onClick={() => handleView(item)} /></Tooltip>,
                    <Tooltip key="download" title="下載"><DownloadOutlined onClick={() => handleDownload(item)} /></Tooltip>,
                    ...(!readonly ? [<Tooltip key="delete" title="刪除"><DeleteOutlined onClick={() => handleDelete(item)} style={{ color: '#ff4d4f' }} /></Tooltip>] : []),
                  ]}
                >
                  <Card.Meta
                    avatar={getFileIcon(item.fileName)}
                    title={<Tooltip title={item.fileName}><div style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.fileName || '未命名'}</div></Tooltip>}
                    description={`${((item.fileSize || 0) / 1024).toFixed(2)} KB`}
                  />
                </Card>
              </Col>
            ))
          )}
        </Row>
      </Spin>

      <Modal
        title="上傳附件"
        open={uploadModalVisible}
        onOk={handleUploadSubmit}
        onCancel={() => {
          setUploadModalVisible(false);
          setFileList([]);
        }}
        confirmLoading={uploading}
        okText="開始上傳"
        cancelText="取消"
        okButtonProps={{ disabled: fileList.length === 0 }}
        width={600}
        centered
        destroyOnHidden
      >
        <div style={{ marginBottom: 16, color: '#8c8c8c' }}>
          💡 提示：您可以直接在彈窗開啟時 <strong>Ctrl+V / Cmd+V</strong> 貼上截圖。
        </div>
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">點擊或拖曳檔案至此區域</p>
          <p className="ant-upload-hint">
            支援單次或批量上傳。您可以點擊選擇檔案，或是拖曳檔案進入。
          </p>
        </Dragger>
      </Modal>
    </div>
  );
};