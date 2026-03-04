import { useState } from "react";

const states = [
  { id: "空闲", step: 1 },
  { id: "扫描中", step: 2 },
  { id: "发现机会", step: 3 },
  { id: "执行中", step: 4 },
  { id: "持仓中", step: 5 },
  { id: "平仓", step: 6 },
  { id: "结算", step: 7 },
];

const riskItems = [
  {
    num: "01",
    title: "仅 1 倍杠杆",
    description:
      "不使用任何杠杆放大。每一美元的敞口都有一美元的保证金支撑，完全消除爆仓风险。",
  },
  {
    num: "02",
    title: "止损 -1.5%",
    description:
      "未实现亏损超过 -1.5% 时自动退出。硬编码，不可协商。防止基差异常波动造成损失。",
  },
  {
    num: "03",
    title: "单仓不超 20%",
    description:
      "单个交易对不超过总仓位的 20%。集中度风险是套利策略的隐形杀手。",
  },
  {
    num: "04",
    title: "测试网优先",
    description:
      "每次策略更新必须在测试网运行至少 72 小时，通过后才允许使用真实资金。无例外。",
  },
  {
    num: "05",
    title: "保证金监控",
    description:
      "每 30 秒检查一次保证金率。如果保证金率低于 50%，Agent 立即开始减仓。",
  },
  {
    num: "06",
    title: "自动退出",
    description:
      "当资金费率低于盈亏平衡阈值或基差超过 1% 时，所有仓位自动平仓。无需人工干预。",
  },
];

const masterPrompt = `你是一个资金费率套利 Agent。你的任务是在 Binance USDT-M 永续合约上执行资金费率套利。

策略：
1. 扫描所有 USDT-M 交易对，筛选资金费率 > 0.03%
2. 验证：基差 < 0.5%，持仓量 > $100M，费率连续 3 期稳定
3. 开仓：现货买入 + 永续做空（等额名义价值）
4. 持仓：每 8 小时收取资金费率
5. 平仓：费率降至 0.01% 以下或基差超过 1% 时退出

风控规则：
- 单仓上限：每对不超过 20%
- 总敞口上限：不超过 60%
- 止损：未实现亏损 < -1.5% 时退出
- Delta 中性偏差容忍度 2% 以内
- 仅 1x 杠杆，不使用保证金放大`;

export default function HowItWorks() {
  const [copied, setCopied] = useState(false);
  const activeState = 4;

  const handleCopy = () => {
    navigator.clipboard.writeText(masterPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12">
      {/* 标题 */}
      <div>
        <h1
          className="font-bold uppercase tracking-tighter leading-[0.9]"
          style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
        >
          使用说明
        </h1>
      </div>

      {/* 策略解释 */}
      <section>
        <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-8">
          策略原理
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          <div className="border-2 border-border p-8 md:p-12 flex flex-col items-center justify-center text-center">
            <span className="text-[4rem] md:text-[5rem] font-bold text-green leading-none tracking-tighter">
              现货
              <br />
              做多
            </span>
            <span className="text-4xl text-muted-foreground mt-4 font-mono">+</span>
          </div>

          <div className="border-2 border-border border-t-0 md:border-t-2 md:border-l-0 p-8 md:p-12 flex flex-col items-center justify-center text-center">
            <span className="text-[4rem] md:text-[5rem] font-bold text-red leading-none tracking-tighter">
              永续
              <br />
              做空
            </span>
            <span className="text-4xl text-muted-foreground mt-4 font-mono">=</span>
          </div>

          <div className="border-2 border-border border-t-0 md:border-t-2 md:border-l-0 p-8 md:p-12 flex flex-col items-center justify-center text-center">
            <span className="text-[4rem] md:text-[5rem] font-bold text-accent leading-none tracking-tighter">
              DELTA
              <br />
              中性
            </span>
          </div>
        </div>

        <p className="text-lg text-muted-foreground mt-8 max-w-3xl">
          资金费率是永续合约中多空双方之间的定期支付。当费率为正时，多头向空头支付费用。
          通过持有 Delta 中性仓位——现货做多 + 永续做空——你可以在几乎没有方向性风险的情况下
          捕获这笔收益。两个相反的仓位互相抵消价格波动，只留下资金费率作为纯收益。
          在牛市中，这个策略通常能产生 20-100%+ 的年化收益。
        </p>
      </section>

      {/* 状态机 */}
      <section>
        <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-8">
          状态机
        </h2>

        {/* 桌面端：横向 */}
        <div className="hidden md:flex items-stretch gap-0">
          {states.map((state, i) => (
            <div key={state.id} className="flex items-center">
              <div
                className={`border-2 p-6 min-w-[140px] ${
                  i + 1 === activeState
                    ? "border-accent bg-accent/5"
                    : "border-border"
                }`}
              >
                <div className="text-[4rem] font-mono text-muted-foreground/30 leading-none font-bold">
                  {String(state.step).padStart(2, "0")}
                </div>
                <div
                  className={`text-sm uppercase tracking-widest mt-2 font-bold ${
                    i + 1 === activeState ? "text-accent" : "text-foreground"
                  }`}
                >
                  {state.id}
                </div>
              </div>
              {i < states.length - 1 && (
                <div className="w-8 h-[2px] bg-border flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* 移动端：纵向 */}
        <div className="flex md:hidden flex-col gap-0">
          {states.map((state, i) => (
            <div key={state.id} className="flex flex-col items-start">
              <div
                className={`border-2 p-6 w-full ${
                  i + 1 === activeState
                    ? "border-accent bg-accent/5"
                    : "border-border"
                } ${i > 0 ? "border-t-0" : ""}`}
              >
                <div className="text-[4rem] font-mono text-muted-foreground/30 leading-none font-bold">
                  {String(state.step).padStart(2, "0")}
                </div>
                <div
                  className={`text-sm uppercase tracking-widest mt-2 font-bold ${
                    i + 1 === activeState ? "text-accent" : "text-foreground"
                  }`}
                >
                  {state.id}
                </div>
              </div>
              {i < states.length - 1 && (
                <div className="w-[2px] h-8 bg-border ml-12" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 复制 Prompt 区域 */}
      <section className="p-12 -mx-4" style={{ backgroundColor: "#DFE104" }}>
        <h2
          className="font-bold uppercase tracking-tighter leading-[0.85]"
          style={{ fontSize: "clamp(2rem, 6vw, 5rem)", color: "#09090B" }}
        >
          准备好了？
        </h2>
        <p className="text-lg mt-4" style={{ color: "rgba(9,9,11,0.7)" }}>
          复制完整策略 Prompt，粘贴到你的 OpenClaw 🦞 Agent 即可运行
        </p>
        <button
          onClick={handleCopy}
          className="mt-8 h-14 px-10 uppercase tracking-wider font-bold text-base border-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          style={{ backgroundColor: "#09090B", color: "#FAFAFA" }}
        >
          {copied ? "✓ 已复制" : "复制策略 PROMPT"}
        </button>
      </section>

      {/* 风控规则 */}
      <section>
        <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-8">
          风控规则
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
          {riskItems.map((item) => (
            <div key={item.num} className="bg-background p-8 md:p-10">
              <div className="text-[4rem] font-mono text-muted-foreground/30 leading-none font-bold">
                {item.num}
              </div>
              <h3 className="text-xl font-bold uppercase mt-3">{item.title}</h3>
              <p className="text-base text-muted-foreground mt-2">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
