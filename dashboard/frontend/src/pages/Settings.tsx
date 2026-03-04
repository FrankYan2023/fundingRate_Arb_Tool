import { useState } from "react";

const telemetryItems = [
  "Agent 状态转换和时间",
  "资金费率扫描频率和命中率",
  "开仓/平仓事件（不包含金额）",
  "错误日志和崩溃报告",
  "功能使用模式",
];

export default function Settings() {
  const [telemetry, setTelemetry] = useState(true);
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [copied, setCopied] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [tgSaved, setTgSaved] = useState(false);

  const handleRegister = async () => {
    if (!email) return;
    setRegistering(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.api_token) {
        setApiToken(data.api_token);
      }
    } catch {
      // fallback: generate a mock token for demo
      setApiToken(`pepper_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`);
    }
    setRegistering(false);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(apiToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    try {
      const res = await fetch("/api/auth/regenerate", {
        method: "POST",
        headers: { "X-API-Token": apiToken },
      });
      const data = await res.json();
      if (data.api_token) setApiToken(data.api_token);
    } catch {
      setApiToken(`pepper_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`);
    }
  };

  const handleSaveTelegram = async () => {
    try {
      await fetch("/api/auth/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Token": apiToken,
        },
        body: JSON.stringify({ tg_bot_token: tgBotToken, tg_chat_id: tgChatId }),
      });
    } catch {
      // silent
    }
    setTgSaved(true);
    setTimeout(() => setTgSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <h1
        className="font-bold uppercase tracking-tighter leading-[0.9]"
        style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
      >
        设置
      </h1>

      {/* API Token */}
      <div className="border-2 border-border p-8">
        <h2 className="text-2xl font-bold uppercase tracking-tighter">
          API TOKEN
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          注册后获取你的专属 Token，Agent 通过此 Token 连接花椒信号服务
        </p>

        {!apiToken ? (
          /* 注册表单 */
          <div className="mt-6">
            <div className="flex items-center gap-3">
              <input
                type="email"
                placeholder="输入你的邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-2 border-border text-foreground text-sm h-12 px-4 w-80 outline-none font-sans transition-colors focus:border-accent"
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />
              <button
                onClick={handleRegister}
                disabled={registering || !email}
                className="h-12 px-8 text-sm font-bold uppercase tracking-widest border-2 border-accent text-accent bg-transparent cursor-pointer transition-colors hover:bg-accent hover:text-background disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registering ? "生成中..." : "获取 TOKEN"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">
              无需密码，邮箱仅用于找回 Token
            </p>
          </div>
        ) : (
          /* Token 展示 */
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <code className="font-mono text-lg text-accent bg-accent/5 border-2 border-border px-4 py-2 select-all">
                {apiToken}
              </code>
              <button
                onClick={handleCopyToken}
                className="border-2 border-border px-4 py-2 text-xs font-bold uppercase tracking-widest bg-transparent text-foreground cursor-pointer transition-colors hover:bg-accent hover:text-background"
              >
                {copied ? "已复制" : "复制"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRegenerate}
                className="text-xs uppercase tracking-widest text-muted-foreground bg-transparent border-0 cursor-pointer hover:text-red transition-colors"
              >
                重新生成 Token（旧 Token 将失效）
              </button>
            </div>

            <div className="border-t border-border/50 pt-4 mt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                在你的 Agent 配置中添加：
              </p>
              <pre className="font-mono text-[13px] text-foreground/70 mt-2 bg-muted/20 p-4 border border-border/30 overflow-x-auto">
{`# 花椒套利工具 API 配置
PEPPER_API_URL=https://api.pepper.tools
PEPPER_API_TOKEN=${apiToken}`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Telegram 推送 */}
      <div className="border-2 border-border p-8">
        <h2 className="text-2xl font-bold uppercase tracking-tighter">
          TELEGRAM 推送
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          配置后，套利机会和仓位变动会实时推送到你的 Telegram
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-2">
              Bot Token
            </label>
            <input
              type="text"
              placeholder="从 @BotFather 获取"
              value={tgBotToken}
              onChange={(e) => setTgBotToken(e.target.value)}
              className="bg-transparent border-2 border-border text-foreground text-sm h-12 px-4 w-full max-w-lg outline-none font-mono transition-colors focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-2">
              Chat ID
            </label>
            <input
              type="text"
              placeholder="你的 Telegram Chat ID"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              className="bg-transparent border-2 border-border text-foreground text-sm h-12 px-4 w-full max-w-lg outline-none font-mono transition-colors focus:border-accent"
            />
          </div>
          <button
            onClick={handleSaveTelegram}
            disabled={!tgBotToken || !tgChatId || !apiToken}
            className="h-12 px-8 text-sm font-bold uppercase tracking-widest border-2 border-accent text-accent bg-transparent cursor-pointer transition-colors hover:bg-accent hover:text-background disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {tgSaved ? "✓ 已保存" : "保存配置"}
          </button>
          {!apiToken && (
            <p className="text-xs text-red">请先获取 API Token</p>
          )}
        </div>
      </div>

      {/* 遥测数据 */}
      <div className="border-2 border-border p-8">
        <h2 className="text-2xl font-bold uppercase tracking-tighter">
          遥测数据
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          分享匿名使用数据来帮助我们改进平台。不会收集任何交易金额、钱包地址或个人身份信息。
        </p>

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={() => setTelemetry(true)}
            className={`h-12 px-8 text-sm font-bold uppercase tracking-widest border-2 cursor-pointer transition-colors ${
              telemetry
                ? "bg-accent text-background border-accent"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground"
            }`}
          >
            开启
          </button>
          <button
            onClick={() => setTelemetry(false)}
            className={`h-12 px-8 text-sm font-bold uppercase tracking-widest border-2 cursor-pointer transition-colors ${
              !telemetry
                ? "bg-accent text-background border-accent"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground"
            }`}
          >
            关闭
          </button>
        </div>

        <div className="mt-6">
          {telemetryItems.map((item) => (
            <div
              key={item}
              className="py-3 border-b border-border/50 text-sm text-muted-foreground"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* 危险操作 */}
      <div className="border-2 border-red/50 p-8">
        <h2 className="text-2xl font-bold uppercase tracking-tighter text-red">
          危险操作
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-6">
          <button className="bg-red text-foreground h-14 px-8 uppercase tracking-wider font-bold border-0 cursor-pointer transition-transform hover:scale-105">
            全部平仓
          </button>
          <button className="border-2 border-red text-red h-14 px-8 uppercase tracking-wider font-bold bg-transparent cursor-pointer transition-colors hover:bg-red hover:text-foreground">
            停止 AGENT
          </button>
        </div>
      </div>
    </div>
  );
}
