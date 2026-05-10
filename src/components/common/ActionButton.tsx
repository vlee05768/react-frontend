import React from 'react';
import { Button, theme } from 'antd';
import type { ButtonProps } from 'antd';

export interface ActionButtonProps extends Omit<ButtonProps, 'type' | 'danger'> {
  intent?: 'success' | 'warning' | 'error' | 'primary' | 'default';
  variant?: 'solid' | 'outlined' | 'dashed' | 'text' | 'link';
}

export const ActionButton: React.FC<ActionButtonProps> = ({ 
  intent = 'default', 
  variant = 'solid',
  style, 
  ...rest 
}) => {
  const { token } = theme.useToken();

  if (intent === 'error') {
    return <Button danger type={variant === 'solid' ? 'primary' : variant as any} style={style} {...rest} />;
  }
  if (intent === 'primary') {
    return <Button type={variant === 'solid' ? 'primary' : variant as any} style={style} {...rest} />;
  }
  if (intent === 'default') {
    return <Button type={variant === 'solid' ? 'default' : variant as any} style={style} {...rest} />;
  }

  const customStyle: React.CSSProperties = { ...style };
  
  if (intent === 'success') {
    customStyle.backgroundColor = variant === 'solid' ? token.colorSuccess : 'transparent';
    customStyle.borderColor = token.colorSuccess;
    customStyle.color = variant === 'solid' ? '#fff' : token.colorSuccess;
  }

  if (intent === 'warning') {
    customStyle.backgroundColor = variant === 'solid' ? token.colorWarning : 'transparent';
    customStyle.borderColor = token.colorWarning;
    customStyle.color = variant === 'solid' ? '#fff' : token.colorWarning;
  }

  return <Button style={customStyle} {...rest} />;
};
