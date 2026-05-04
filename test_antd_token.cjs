const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { DatePicker, ConfigProvider, theme } = require('antd');

const App = () => React.createElement(
  ConfigProvider, 
  { theme: { algorithm: theme.darkAlgorithm, components: { DatePicker: { colorIcon: '#ff0000', colorIconHover: '#00ff00', colorTextQuaternary: '#0000ff' } } } }, 
  React.createElement(DatePicker)
);

console.log(ReactDOMServer.renderToString(React.createElement(App)));
