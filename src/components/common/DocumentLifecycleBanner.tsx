import React from 'react';
import { Steps } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export interface LifecycleStep {
  title: string;
  status: 'wait' | 'process' | 'finish' | 'error';
  date?: string | null;
  user?: string | null;
  isManualClose?: boolean;
}

interface DocumentLifecycleBannerProps {
  steps: LifecycleStep[];
}

export const DocumentLifecycleBanner: React.FC<DocumentLifecycleBannerProps> = ({ steps }) => {
  return (
    <div className="mb-4 px-6 py-3 bg-transparent rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
      <Steps
        labelPlacement="vertical"
        current={steps.findIndex(s => s.status === 'process')}
        items={steps.map((step) => {
          let icon = undefined;
          if (step.isManualClose && step.status === 'finish') {
             // Custom styling for manual close to differentiate from normal success green
             icon = (
               <div className="w-8 h-8 rounded-full bg-gray-400 dark:bg-gray-600 border border-gray-400 dark:border-gray-600 flex items-center justify-center text-white mx-auto transition-colors">
                 <CheckOutlined />
               </div>
             );
          }

          return {
            title: step.isManualClose ? <span className="text-gray-600 dark:text-gray-400">{step.title}</span> : step.title,
            status: step.status,
            icon,
            description: (step.date || step.user) ? (
              <div className="text-center text-xs mt-1 text-gray-500 dark:text-gray-400">
                {step.date && <div className="whitespace-nowrap">{dayjs(step.date).format('YYYY-MM-DD HH:mm')}</div>}
                {step.user && <div className="whitespace-nowrap">{step.user}</div>}
              </div>
            ) : undefined,
          };
        })}
      />
    </div>
  );
};
