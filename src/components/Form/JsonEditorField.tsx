import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';
import { Button, Typography, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, FormatPainterOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface JsonEditorFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export const JsonEditorField: React.FC<JsonEditorFieldProps> = ({ value, onChange, disabled }) => {
  const [localValue, setLocalValue] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 初始化與同步外部 value
  useEffect(() => {
    // 確保 value 是字串。如果是 null / undefined，給空字串。如果是物件(不該發生但防呆)，轉字串
    let initialValue = '';
    if (typeof value === 'string') {
      initialValue = value;
    } else if (value !== undefined && value !== null) {
       try {
           initialValue = JSON.stringify(value, null, 2);
       } catch(e) {
           initialValue = String(value);
       }
    }

    setLocalValue(initialValue);
    validateJson(initialValue);
  }, [value]);

  const validateJson = (str: string) => {
    if (!str || str.trim() === '') {
      setIsValid(true);
      setErrorMsg(null);
      return;
    }
    try {
      JSON.parse(str);
      setIsValid(true);
      setErrorMsg(null);
    } catch (e: any) {
      setIsValid(false);
      setErrorMsg(e.message);
    }
  };

  const handleChange = (val: string) => {
    setLocalValue(val);
    validateJson(val);
    if (onChange) {
      onChange(val);
    }
  };

  const handleFormat = () => {
    if (!localValue || localValue.trim() === '') return;
    try {
      const parsed = JSON.parse(localValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setLocalValue(formatted);
      if (onChange) {
        onChange(formatted);
      }
      setIsValid(true);
      setErrorMsg(null);
    } catch (e: any) {
      // 如果格式不正確就無法 format
    }
  };

  return (
    <div className="flex flex-col w-full border border-gray-700 rounded-md overflow-hidden bg-[#282c34]">
      {/* 工具列 */}
      <div className="flex justify-between items-center p-2 bg-[#21252b] border-b border-gray-700">
        <Space>
          <Button 
            type="text" 
            size="small" 
            icon={<FormatPainterOutlined />} 
            onClick={handleFormat}
            disabled={disabled || !isValid || !localValue}
            className="text-gray-300 hover:text-white"
          >
            自動排版 (Format)
          </Button>
        </Space>
        <div>
          {(!localValue || localValue.trim() === '') ? (
             <Text className="text-gray-400 text-xs">尚無資料</Text>
          ) : isValid ? (
            <Space className="text-green-500 text-xs">
              <CheckCircleOutlined /> 格式正確
            </Space>
          ) : (
            <Space className="text-red-500 text-xs">
              <CloseCircleOutlined /> 格式錯誤
            </Space>
          )}
        </div>
      </div>

      {/* CodeMirror 編輯器 */}
      <div className={`w-full ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
        <CodeMirror
          value={localValue}
          height="200px"
          theme={oneDark}
          extensions={[
            json(),
            linter(jsonParseLinter()),
            lintGutter()
          ]}
          onChange={handleChange}
          readOnly={disabled}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />
      </div>

      {/* 錯誤提示區 */}
      {!isValid && errorMsg && (
        <div className="p-2 bg-red-900/30 border-t border-red-800">
          <Text className="text-red-400 text-xs break-all">
            {errorMsg}
          </Text>
        </div>
      )}
    </div>
  );
};
