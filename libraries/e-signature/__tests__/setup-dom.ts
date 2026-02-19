import { GlobalWindow } from "happy-dom";

const window = new GlobalWindow();

// @ts-ignore
globalThis.document = window.document;
// @ts-ignore
globalThis.window = window;
// @ts-ignore
globalThis.navigator = window.navigator;
// @ts-ignore
globalThis.HTMLElement = window.HTMLElement;
// @ts-ignore
globalThis.Element = window.Element;
// @ts-ignore
globalThis.URL.createObjectURL = () => "blob:mock";
// @ts-ignore
globalThis.URL.revokeObjectURL = () => {};
