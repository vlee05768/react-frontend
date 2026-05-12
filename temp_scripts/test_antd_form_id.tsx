import React from 'react';
import { Form } from 'antd';
import { renderToString } from 'react-dom/server';

export default function Test() {
  return <Form id="my-test-form"><Form.Item name="test"><input /></Form.Item></Form>;
}
console.log(renderToString(<Test />));
