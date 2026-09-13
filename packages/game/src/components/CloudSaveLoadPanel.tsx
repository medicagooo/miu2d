import { type CloudPlayer, type CloudSaveSlot, isSaveData, LOCAL_SAVE_FORMAT } from "@miu2d/types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WebSaveLoadPanelProps } from "./WebSaveLoadPanel";

const button = "px-3 py-2 rounded bg-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed";
const input = "w-full px-3 py-2 rounded bg-white/10 border border-white/15 text-white";
class CloudError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/cloud-save/v1${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new CloudError(response.status, result.error ?? "云端请求失败");
  return result as T;
}

/** Deliberately separate from full-backend AuthContext/tRPC. Only a host-only
 * HttpOnly cookie authenticates this deployment, with no original-site login.
 */
export function CloudSaveLoadPanel(props: WebSaveLoadPanelProps & { active: boolean }) {
  const {
    gameSlug,
    canSave,
    saveBlockedReason,
    onCollectSaveData,
    onLoadSaveData,
    onClose,
    active,
  } = props;
  const [user, setUser] = useState<CloudPlayer | null>(null);
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saves, setSaves] = useState<CloudSaveSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<{
    kind: "load" | "overwrite" | "delete";
    save: CloudSaveSlot;
  } | null>(null);
  const [pendingSave, setPendingSave] = useState(false);
  const currentProps = useRef(props);
  currentProps.current = props;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, []);
  // Always install mode-lifecycle invalidation, even while the session effect
  // skips its request because a mutation is in flight.
  // biome-ignore lint/correctness/useExhaustiveDependencies: these lifecycle changes intentionally invalidate requests without reading their values
  useEffect(() => {
    generation.current += 1;
    return () => {
      generation.current += 1;
    };
  }, [active, gameSlug, props.visible]);

  const report = useCallback((error: unknown) => {
    if (error instanceof CloudError && error.status === 401) {
      setUser(null);
      setSaves([]);
    }
    setMessage(error instanceof Error ? error.message : "操作失败，请重试");
  }, []);
  const refresh = useCallback(async () => {
    const result = await api<{ saves: CloudSaveSlot[] }>(
      `/saves?game=${encodeURIComponent(gameSlug)}`
    );
    setSaves(result.saves);
  }, [gameSlug]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current || !checked) return;
    generation.current += 1;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      report(error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!active) return;
    if (lock.current) return;
    // Invalidate old checks when a mutation begins. Re-entry cannot interact
    // with stale account/list controls while this new check is outstanding.
    const epoch = ++generation.current;
    setChecked(false);
    setConfirm(null);
    let cancelled = false;
    void api<{ user: CloudPlayer | null }>("/auth/session")
      .then(async (result) => {
        if (cancelled || epoch !== generation.current) return;
        setUser(result.user);
        if (result.user) {
          const list = await api<{ saves: CloudSaveSlot[] }>(
            `/saves?game=${encodeURIComponent(gameSlug)}`
          );
          if (!cancelled && epoch === generation.current) setSaves(list.saves);
        } else setSaves([]);
        if (!cancelled && epoch === generation.current) setChecked(true);
      })
      .catch((error) => {
        if (!cancelled && epoch === generation.current) {
          setChecked(true);
          report(error);
        }
      });
    return () => {
      cancelled = true;
      generation.current += 1;
    };
  }, [active, gameSlug, report]);

  async function save(existing?: CloudSaveSlot) {
    // Recheck latest engine guards after authentication/confirmation/network waits.
    const latest = currentProps.current;
    if (!latest.canSave || latest.saveBlockedReason)
      throw new Error(latest.saveBlockedReason ?? "当前无法保存");
    const snapshot = latest.onCollectSaveData();
    if (!snapshot || !isSaveData(snapshot.data)) throw new Error("当前无法获取存档");
    await api(
      `/saves/${existing?.id ?? crypto.randomUUID()}?game=${encodeURIComponent(latest.gameSlug)}`,
      "PUT",
      {
        revision: existing?.revision ?? 0,
        name: existing?.name ?? (saveName.trim() || `存档 ${new Date().toLocaleString("zh-CN")}`),
        data: snapshot.data,
      }
    );
    setPendingSave(false);
    setSaveName("");
    setMessage("已保存到云端");
    await refresh();
  }
  async function authenticate() {
    if (mode === "register" && password !== confirmPassword)
      throw new Error("两次输入的密码不一致");
    const result = await api<{ user: CloudPlayer }>(`/auth/${mode}`, "POST", {
      email,
      password,
      name,
    });
    setUser(result.user);
    setPassword("");
    setConfirmPassword("");
    if (pendingSave) await save();
    else await refresh();
  }
  async function performConfirmation() {
    if (!confirm) return;
    const action = confirm;
    setConfirm(null);
    if (action.kind === "overwrite") {
      await save(action.save);
      return;
    }
    if (action.kind === "delete") {
      await api(`/saves/${action.save.id}?game=${encodeURIComponent(gameSlug)}`, "DELETE", {
        revision: action.save.revision,
      });
      await refresh();
      setMessage("云端存档已删除");
      return;
    }
    const latest = currentProps.current;
    if (latest.saveBlockedReason) throw new Error(latest.saveBlockedReason);
    const epoch = generation.current;
    const saved = await api<{ format: string; gameSlug: string; data: unknown }>(
      `/saves/${action.save.id}?game=${encodeURIComponent(gameSlug)}`
    );
    // Closing or selecting local cancels application of an outstanding cloud
    // response. It must never replace progress loaded afterwards from a file.
    if (
      !mounted.current ||
      epoch !== generation.current ||
      !currentProps.current.active ||
      !currentProps.current.visible
    )
      return;
    if (currentProps.current.saveBlockedReason)
      throw new Error(currentProps.current.saveBlockedReason);
    if (
      saved.format !== LOCAL_SAVE_FORMAT ||
      saved.gameSlug !== currentProps.current.gameSlug ||
      !isSaveData(saved.data)
    )
      throw new Error("存档格式或游戏不匹配");
    if (!(await onLoadSaveData(saved.data))) throw new Error("读档失败，请检查存档");
    onClose();
  }
  return (
    <div className="p-6 text-sm text-white/80 space-y-4">
      {saveBlockedReason && <output className="text-amber-200">{saveBlockedReason}</output>}
      {!checked && <output>正在检查登录状态…</output>}
      {checked && !user && (
        <>
          <p>登录或注册后可保存、加载云端存档。此账号仅用于本站。</p>
          {canSave && (
            <button
              type="button"
              className={button}
              disabled={busy || !!saveBlockedReason}
              onClick={() => {
                setPendingSave(true);
                setMessage("请先登录或注册，成功后将保存当前进度");
              }}
            >
              保存到云端
            </button>
          )}
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(authenticate);
            }}
          >
            <fieldset disabled={busy} className="space-y-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  aria-pressed={mode === "login"}
                  onClick={() => setMode("login")}
                >
                  登录
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "register"}
                  onClick={() => setMode("register")}
                >
                  注册新用户
                </button>
              </div>
              {mode === "register" && (
                <label className="block">
                  昵称
                  <input
                    className={input}
                    value={name}
                    maxLength={40}
                    required
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="nickname"
                  />
                </label>
              )}
              <label className="block">
                邮箱
                <input
                  className={input}
                  type="email"
                  value={email}
                  maxLength={254}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className="block">
                密码
                <input
                  className={input}
                  type="password"
                  value={password}
                  minLength={8}
                  maxLength={72}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </label>
              {mode === "register" && (
                <label className="block">
                  确认密码
                  <input
                    className={input}
                    type="password"
                    value={confirmPassword}
                    required
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
              )}
              <button className={button} type="submit">
                {mode === "login" ? "登录" : "注册并登录"}
                {pendingSave ? "并保存" : ""}
              </button>
            </fieldset>
          </form>
        </>
      )}
      {checked && user && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="break-all">
              {user.name} · {user.email}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api("/auth/logout", "POST", {});
                  setUser(null);
                  setSaves([]);
                  setPendingSave(false);
                  setConfirm(null);
                })
              }
            >
              退出登录
            </button>
          </div>
          {canSave && (
            <div className="flex gap-2">
              <input
                aria-label="云端存档名称"
                className={input}
                placeholder="存档名称（可选）"
                maxLength={80}
                value={saveName}
                disabled={busy || !!saveBlockedReason}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <button
                type="button"
                className={`${button} shrink-0`}
                disabled={busy || !!saveBlockedReason}
                onClick={() => void run(() => save())}
              >
                保存到云端
              </button>
            </div>
          )}
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => void run(refresh)}
          >
            刷新云端存档
          </button>
          {saves.length === 0 && <p>当前游戏暂无云端存档。</p>}
          {saves.map((item) => (
            <div key={item.id} className="p-3 rounded-lg bg-white/5 space-y-2">
              <p className="break-all">{item.name}</p>
              <p className="text-xs text-white/50">
                {new Date(item.updatedAt).toLocaleString("zh-CN")}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  className={button}
                  disabled={busy || !!saveBlockedReason}
                  onClick={() => setConfirm({ kind: "load", save: item })}
                >
                  加载云端存档
                </button>
                {canSave && (
                  <button
                    type="button"
                    className={button}
                    disabled={busy || !!saveBlockedReason}
                    onClick={() => setConfirm({ kind: "overwrite", save: item })}
                  >
                    覆盖
                  </button>
                )}
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => setConfirm({ kind: "delete", save: item })}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </>
      )}
      {confirm && (
        <div role="alert" className="p-3 rounded border border-amber-300/40 space-y-2">
          <p>
            {confirm.kind === "load"
              ? "加载将替换当前游戏进度"
              : confirm.kind === "overwrite"
                ? "覆盖将替换此云端存档"
                : "删除后将无法加载此存档"}
            ：{confirm.save.name}
          </p>
          <button
            type="button"
            className={button}
            disabled={busy || (confirm.kind !== "delete" && !!saveBlockedReason)}
            onClick={() => void run(performConfirmation)}
          >
            确认
          </button>
          <button type="button" className="px-3" disabled={busy} onClick={() => setConfirm(null)}>
            取消
          </button>
        </div>
      )}
      {busy && <output>正在处理…</output>}
      {message && <output className="text-amber-100">{message}</output>}
    </div>
  );
}
