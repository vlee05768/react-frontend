import { useState } from 'react';
import { App } from 'antd';
import { getApiErrorMessage } from '@/utils/apiError';

export interface UseFileDownloadOptions {
  apiFunction: () => Promise<any>;
  successMessage?: string;
  filename?: string;
  openInNewTab?: boolean; // Default to true for PDF reports, false for Excel downloads
}

export function useFileDownload() {
  const { message, modal } = App.useApp();
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadFile = async ({
    apiFunction,
    successMessage = '檔案處理完成',
    filename = 'download',
    openInNewTab = true,
  }: UseFileDownloadOptions) => {
    setIsDownloading(true);
    // Use an Ant Design global message to indicate processing
    const hideLoading = message.loading('檔案產生中，請稍候...', 0);

    try {
      const response = await apiFunction();
      
      // Ensure we extract the Blob correctly based on Axios/Hey-API structure
      let blobData = response;
      if (response?.data && response.data instanceof Blob) {
        blobData = response.data;
      } else if (response?.data?.data && response.data.data instanceof Blob) {
        blobData = response.data.data; // Handles nested wrapper sometimes
      } else if (response && !(response instanceof Blob)) {
        // Fallback for raw data if it isn't parsed as Blob directly
        blobData = new Blob([response], { type: openInNewTab ? "application/pdf" : "application/octet-stream" });
      }

      // Explicitly set type to ensure the browser knows how to render it (especially for PDF)
      const blob = new Blob([blobData], { type: openInNewTab ? "application/pdf" : blobData.type });
      const url = window.URL.createObjectURL(blob);

      if (openInNewTab) {
        window.open(url, '_blank');
        message.success(successMessage || '檔案已於新分頁開啟');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success(successMessage || '檔案下載完成');
      }
    } catch (error) {
      console.error('File download failed:', error);
      modal.error({
        title: '檔案下載失敗',
        content: getApiErrorMessage(error),
        centered: true,
      });
    } finally {
      hideLoading();
      setIsDownloading(false);
    }
  };

  return { downloadFile, isDownloading };
}