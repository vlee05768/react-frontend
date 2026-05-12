const { JSDOM } = require("jsdom");
const dom = new JSDOM(`<!DOCTYPE html><html><body><form id="f1" onsubmit="event.preventDefault(); window.submitted = true;"></form><button form="f1" type="submit">Submit</button></body></html>`);
dom.window.document.querySelector("button").click();
console.log(dom.window.submitted);
