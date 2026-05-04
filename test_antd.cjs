const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { DatePicker } = require('antd');

const App = () => React.createElement(DatePicker);
console.log(ReactDOMServer.renderToString(React.createElement(App)));
