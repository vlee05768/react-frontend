import React, { useState, useEffect } from 'react';
import { Upload, Button, Row, Col, Empty, Modal, App, Tooltip, Spin, Card, theme } from 'antd';
import dayjs from 'dayjs';
import { 
  UploadOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  DownloadOutlined,
  FilePdfOutlined,
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
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
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
      // Handle ApiResponse wrapper or direct array
      const resultData = (data as any)?.data || data;
      if (Array.isArray(resultData)) {
        setAttachments(resultData);
      } else {
        setAttachments([]);
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
    const files = fileList.map(f => (f.originFileObj || f) as Blob).filter(Boolean);
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
    modal.confirm({
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

  const iconList = [
    'xls', 'wav', 'txt', 'svg', 'raw', 'rar', 'psd', 'ppt', 'png', 'php',
    'pdf', 'mp4', 'mp3', 'mov', 'js', 'jpg', 'html', 'gif', 'exe', 'eps',
    'doc', 'dll', 'csv', 'css', 'avi', 'ai', 'zip'
  ];

  const getIconName = (ext: string) => {
    if (ext === 'jpeg') return 'jpg';
    if (ext === 'xlsx') return 'xls';
    if (ext === 'docx') return 'doc';
    if (ext === 'pptx') return 'ppt';
    return ext;
  };

  const getFileIcon = (attachment: FileAttachmentDto) => {
    if (!attachment.fileName) return <FileOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />;
    const ext = attachment.fileName.split('.').pop()?.toLowerCase() || '';
    
    // 圖片檔案直接顯示縮圖 (如果有 url)
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) && attachment.presignedUrl) {
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 4 }}>
          <img src={attachment.presignedUrl} alt={attachment.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      );
    }
    
    // 其他檔案或無 url 的圖片，判斷是否有我們自訂的圖示
    const iconName = getIconName(ext);
    if (iconList.includes(iconName)) {
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 4 }}>
          <img src={`/file-icons/${iconName}.jpg`} alt={ext} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      );
    }

    // Fallback: 預設圖示
    if (ext === 'pdf') return <FilePdfOutlined style={{ fontSize: 32, color: token.colorError }} />;
    return <FileOutlined style={{ fontSize: 32, color: token.colorTextSecondary }} />;
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
    listType: "picture",
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList(prev => {
        // 防止重複加入同一個檔案
        if (prev.some(f => f.uid === file.uid)) return prev;
        
        const newFile: UploadFile = {
          uid: file.uid,
          name: file.name,
          status: 'done',
          size: file.size,
          type: file.type,
          originFileObj: file,
        };
        return [...prev, newFile];
      });
      return false; // 防止自動上傳
    },
    itemRender: (originNode, file) => {
      // 這裡可以針對 Dragger 裡面的檔案做渲染處理
      // 因為尚未上傳所以沒有 presignedUrl，但如果是圖片可以轉 base64，非圖片則顯示對應靜態 icon
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const iconName = getIconName(ext);
      
      if (iconList.includes(iconName)) {
        return (
          <div className="ant-upload-list-item ant-upload-list-item-done" style={{ marginTop: 8 }}>
            <div className="ant-upload-list-item-info">
              <span className="ant-upload-span">
                <div className="ant-upload-list-item-thumbnail" style={{ width: 48, height: 48 }}>
                  <img src={`/file-icons/${iconName}.jpg`} alt={ext} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
                </div>
                <span className="ant-upload-list-item-name" title={file.name}>{file.name}</span>
              </span>
            </div>
            <span className="ant-upload-list-item-actions">
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => uploadProps.onRemove?.(file)} />
            </span>
          </div>
        );
      }
      return originNode;
    }
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
                  styles={{ body: { padding: 0 } }}
                >
                  <Tooltip title={`${item.fileName || '未命名'} - ${((item.fileSize || 0) / 1024).toFixed(2)} KB`}>
                    <div 
                      style={{ padding: '12px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => handleView(item)}
                    >
                      <div style={{ width: 64, height: 64, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: token.colorFillAlter, borderRadius: 4, flexShrink: 0, marginRight: 12 }}>
                        {getFileIcon(item)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, color: token.colorText }}>
                          {item.fileName || '未命名'}
                        </div>
                        <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
                          {`${((item.fileSize || 0) / 1024).toFixed(2)} KB`}
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                  <div style={{ 
                    borderTop: `1px solid ${token.colorBorderSecondary}`, 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    padding: '8px 0',
                    backgroundColor: token.colorFillAlter,
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8
                  }}>
                    <Tooltip title="檢視">
                      <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleView(item)} style={{ color: token.colorTextSecondary }} />
                    </Tooltip>
                    <div style={{ width: 1, height: 16, backgroundColor: token.colorSplit, margin: '0 8px' }} />
                    <Tooltip title="下載">
                      <Button type="text" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(item)} style={{ color: token.colorTextSecondary }} />
                    </Tooltip>
                    {!readonly && (
                      <>
                        <div style={{ width: 1, height: 16, backgroundColor: token.colorSplit, margin: '0 8px' }} />
                        <Tooltip title="刪除">
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item)} />
                        </Tooltip>
                      </>
                    )}
                  </div>
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