import { GlobalWindow } from "happy-dom";

const window = new GlobalWindow();

// @ts-expect-error
globalThis.document = window.document;
// @ts-expect-error
globalThis.window = window;
// @ts-expect-error
globalThis.navigator = window.navigator;
// @ts-expect-error
globalThis.HTMLElement = window.HTMLElement;
// @ts-expect-error
globalThis.Element = window.Element;
// @ts-expect-error
globalThis.URL.createObjectURL = () => "blob:mock";
// @ts-expect-error
globalThis.URL.revokeObjectURL = () => {};
