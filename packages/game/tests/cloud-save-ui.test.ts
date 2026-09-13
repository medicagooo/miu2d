import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom = new JSDOM('<div id="root"></div>', { url: "https://game.test" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { DemoSaveLoadPanel } = await import("../src/components/DemoSaveLoadPanel");
const { act } = React;
const user = { id: "player", name: "玩家", email: "player@example.test" };
const slot = { id: "00000000-0000-4000-8000-000000000000", gameSlug: "demo", name: "测试存档", revision: 1, updatedAt: Date.now() };
const snapshot = { version: 1, player: {}, state: {}, snapshot: {} };
let resolveLoad: ((value: Response) => void) | undefined;
let resolveSession: ((value: Response) => void) | undefined;
let holdSession = false;
let holdLoad = false;
let account: typeof user | null = user;
let loads = 0;
let holdEngine = false;
let resolveEngine: (() => void) | undefined;
let root = createRoot(document.getElementById("root")!);
globalThis.fetch = async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.endsWith("/auth/session")) {
    if (holdSession) return new Promise<Response>((resolve) => { resolveSession = resolve; });
    return Response.json({ user: account });
  }
  if (url.endsWith("/auth/login")) { account = user; return Response.json({ user }); }
  if (url.endsWith("/auth/logout")) { account = null; return Response.json({ success: true }); }
  if (url.includes("/saves/")) {
    if (holdLoad) return new Promise<Response>((resolve) => { resolveLoad = resolve; });
    return Response.json({ format: "miu2d-local-v1", gameSlug: "demo", data: snapshot });
  }
  if (url.includes("/saves?")) return Response.json({ saves: [slot] });
  throw new Error(`Unexpected fetch ${url}`);
};
const props = { gameSlug: "demo", visible: true, canSave: true, onCollectSaveData: () => ({ data: snapshot }), onLoadSaveData: async () => { loads++; if (holdEngine) await new Promise<void>((resolve) => { resolveEngine = resolve; }); return true; }, onClose: () => {} };
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
async function render() { await act(async () => { root.render(React.createElement(DemoSaveLoadPanel, props)); }); await flush(); }
function findButton(text: string) {
  return [...document.querySelectorAll("button")].find((element) => element.textContent === text && !element.closest("[hidden]"));
}
async function click(text: string) {
  const el = findButton(text);
  assert.ok(el, `button ${text} exists`);
  assert.equal(el.disabled, false, `${text} enabled`);
  await act(async () => { el.click(); }); await flush();
}
async function fill(selector: string, value: string) {
  const element = document.querySelector(selector) as HTMLInputElement;
  assert.ok(element);
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}
await render();
await click("云端存档");
holdLoad = true;
await click("加载云端存档"); await click("确认");
assert.ok(resolveLoad);
await click("本地存档");
await click("云端存档");
await act(async () => { resolveLoad!(Response.json({ format: "miu2d-local-v1", gameSlug: "demo", data: snapshot })); });
await flush();
assert.equal(loads, 0, "switching local invalidates delayed cloud load");

await click("加载云端存档"); await click("确认");
await click("本地存档"); await click("云端存档");
await act(async () => { resolveLoad!(Response.json({ format: "miu2d-local-v1", gameSlug: "demo", data: snapshot })); });
await flush();
assert.equal(loads, 0, "repeated mode switches still invalidate loads after a skipped session check");

await click("云端存档");
await click("加载云端存档"); await click("确认");
await act(async () => { root.unmount(); });
await act(async () => { resolveLoad!(Response.json({ format: "miu2d-local-v1", gameSlug: "demo", data: snapshot })); });
assert.equal(loads, 0, "closing panel invalidates delayed cloud load");

root = createRoot(document.getElementById("root")!);
account = null; holdLoad = false;
await render(); await click("云端存档");
assert.ok(findButton("登录"));
await click("本地存档"); holdSession = true; await click("云端存档");
assert.ok(resolveSession);
assert.equal(findButton("登录"), undefined, "login controls hidden during pending session check");
await click("本地存档"); holdSession = false; await click("云端存档");
await fill('input[type="email"]', "player@example.test");
await fill('input[type="password"]', "test-password-123");
await act(async () => { document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
await flush();
assert.ok(findButton("退出登录"), "login completed");
await act(async () => { resolveSession!(Response.json({ user: null })); });
await flush();
assert.ok(findButton("退出登录"), "obsolete anonymous check cannot clear authenticated UI");
await click("本地存档");
let resolveFile: ((value: string) => void) | undefined;
const fileInput = document.querySelector('input[type="file"]')!;
Object.defineProperty(fileInput, "files", { configurable: true, value: [{ size: 100, text: () => new Promise<string>((resolve) => { resolveFile = resolve; }) }] });
await act(async () => { fileInput.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
assert.ok(resolveFile);
await click("云端存档");
await act(async () => { resolveFile!(JSON.stringify({ format: "miu2d-local-v1", gameSlug: "demo", data: snapshot })); });
assert.equal(loads, 0, "switching cloud invalidates a pending local file read");
holdEngine = true;
await click("加载云端存档"); await click("确认");
assert.equal(loads, 1);
assert.equal(findButton("本地存档")!.disabled, true, "cannot switch sources while engine applies a snapshot");
await act(async () => { resolveEngine!(); });
await flush();
assert.equal(findButton("本地存档")!.disabled, false);
await act(async () => { root.unmount(); });
console.log("UI regressions passed: mode switch and close cancel delayed cloud loads; pending session disables login; obsolete session cannot overwrite successful login.");
