// AI制限ウィジェット for Scriptable (iPhone ホーム画面用) v4
// Muse / Codex / Claude の残り制限をまとめて表示する。
// データは GitHub (shion8120/muse-usage の usage.json) から自動取得。
// Muse分は りんは が1時間ごとに更新、Codex/Claude分は PC「kz」の
// fetch-limits.ps1 が取得して同じJSONにマージされる。
//
// 使い方:
// 1. App Storeで「Scriptable」を入れる
// 2. このファイルを「ファイル」アプリで iCloud Drive > Scriptable へ移動
//    （または Scriptable で新規作成して中身を貼り付け、名前を MuseUsageWidget にする）
// 3. ホーム画面に Scriptable ウィジェット（正方形）を追加し、
//    ウィジェット編集で Script = MuseUsageWidget を選ぶ

const JSON_URL = "https://raw.githubusercontent.com/shion8120/muse-usage/main/usage.json";

// 取得失敗時のフォールバック（2026-11-10 11:39 時点の実測値）
const FALLBACK = {
  plan: "Free",
  weeklyUsedPercent: 5,
  weeklyRemainingPercent: 95,
  resetAt: "2026-11-17T04:18:00+09:00",
  resetText: "11/17 4:18",
  additionalTokensLeft: "3B",
  additionalUsedPercent: 0,
  codex: {
    plan: "plus",
    fiveHourUsedPercent: 0,
    fiveHourResetAt: "2026-11-10T16:38:53+09:00",
    fiveHourResetText: "11/10 16:38",
    weeklyUsedPercent: 7,
    weeklyResetAt: "2026-11-11T19:03:56+09:00",
    weeklyResetText: "11/11 19:03"
  },
  claude: {
    plan: "pro",
    fiveHourUsedPercent: 17,
    fiveHourResetAt: "2026-11-10T15:00:00+09:00",
    fiveHourResetText: "11/10 15:00",
    weeklyUsedPercent: 37,
    weeklyResetAt: "2026-11-12T20:00:00+09:00",
    weeklyResetText: "11/12 20:00"
  },
  updatedText: "11/10 11:56"
};

const COLORS = {
  muse: new Color("#8b5cf6"),
  codex: new Color("#10a37f"),
  claude: new Color("#d97757"),
  sub: new Color("#9a9aa3"),
  faint: new Color("#6e6e76"),
  track: new Color("#3f3f46")
};

async function loadData() {
  try {
    const req = new Request(JSON_URL);
    req.timeoutInterval = 10;
    const json = await req.loadJSON();
    return { ...FALLBACK, ...json };
  } catch (e) {
    return FALLBACK;
  }
}

function makeBar(percent, width, height, color) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.setFillColor(COLORS.track);
  const bg = new Path();
  bg.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2);
  ctx.addPath(bg);
  ctx.fillPath();
  const p = Math.min(100, Math.max(0, percent));
  if (p > 0) {
    const w = Math.max(height, width * p / 100);
    ctx.setFillColor(color);
    const fg = new Path();
    fg.addRoundedRect(new Rect(0, 0, w, height), height / 2, height / 2);
    ctx.addPath(fg);
    ctx.fillPath();
  }
  return ctx.getImage();
}

function addText(parent, text, font, color) {
  const t = parent.addText(text);
  t.font = font;
  t.textColor = color;
  return t;
}

function capPlan(p) {
  if (!p) return "";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

// 正方形（小）用：1サービス = 名前行 + バー + 補足行
function smallBlock(w, W, name, plan, leftPct, color, subText) {
  const row = w.addStack();
  row.layoutHorizontally();
  row.bottomAlignContent();
  addText(row, name, Font.boldSystemFont(12.5), Color.white());
  if (plan) {
    row.addSpacer(4);
    addText(row, plan, Font.systemFont(9), COLORS.sub);
  }
  row.addSpacer();
  if (leftPct !== null && leftPct !== undefined) {
    addText(row, `${leftPct}% left`, Font.boldSystemFont(13), Color.white());
  } else {
    addText(row, "未設定", Font.systemFont(11), COLORS.sub);
  }
  w.addSpacer(2.5);
  const bar = w.addImage(makeBar(leftPct || 0, W, 5.5, color));
  bar.imageSize = new Size(W, 5.5);
  w.addSpacer(2);
  addText(w, subText, Font.systemFont(9), COLORS.sub);
}

// 中サイズ用：1サービス = 名前行 + 2本バー（ラベル付き）
function mediumBlock(w, W, name, plan, color, lines) {
  const row = w.addStack();
  row.layoutHorizontally();
  addText(row, name, Font.boldSystemFont(13), Color.white());
  if (plan) {
    row.addSpacer(4);
    addText(row, plan, Font.systemFont(9.5), COLORS.sub);
  }
  row.addSpacer();
  w.addSpacer(3);
  for (const ln of lines) {
    const lr = w.addStack();
    lr.layoutHorizontally();
    addText(lr, ln.label, Font.systemFont(9.5), COLORS.sub);
    lr.addSpacer();
    addText(lr, `${ln.left}% left`, Font.boldSystemFont(10.5), Color.white());
    w.addSpacer(1.5);
    const bar = w.addImage(makeBar(ln.left, W, 5, color));
    bar.imageSize = new Size(W, 5);
    w.addSpacer(2.5);
  }
}

async function buildWidget(data) {
  const family = config.widgetFamily || "medium";
  const isSmall = family === "small";
  const W = isSmall ? 132 : 300;

  const w = new ListWidget();
  const grad = new LinearGradient();
  grad.colors = [new Color("#232329"), new Color("#17171c")];
  grad.locations = [0, 1];
  w.backgroundGradient = grad;
  w.setPadding(11, 13, 9, 13);

  const head = w.addStack();
  head.layoutHorizontally();
  addText(head, "✦ ", Font.boldSystemFont(12), COLORS.muse);
  addText(head, "AI Limits", Font.boldSystemFont(13), Color.white());
  head.addSpacer();
  addText(head, data.updatedText || "", Font.systemFont(9), COLORS.faint);
  w.addSpacer(isSmall ? 6 : 7);

  const museLeft = data.weeklyRemainingPercent;
  const codex = data.codex;
  const claude = data.claude;
  const claudeReady = claude && !claude.status && !claude.error &&
    typeof claude.weeklyUsedPercent === "number";

  if (isSmall) {
    smallBlock(w, W, "Muse", capPlan(data.plan), museLeft, COLORS.muse,
      `週間 · リセット ${data.resetText} · 追加 ${data.additionalTokensLeft}`);
    w.addSpacer(7);
    if (codex && !codex.error) {
      smallBlock(w, W, "Codex", capPlan(codex.plan), 100 - codex.weeklyUsedPercent, COLORS.codex,
        `5h 使用${codex.fiveHourUsedPercent}% · 週間リセット ${codex.weeklyResetText}`);
    } else {
      smallBlock(w, W, "Codex", "", null, COLORS.codex, "取得できませんでした");
    }
    w.addSpacer(7);
    if (claudeReady) {
      smallBlock(w, W, "Claude", capPlan(claude.plan), 100 - claude.weeklyUsedPercent, COLORS.claude,
        `5h 使用${claude.fiveHourUsedPercent}% · 週間リセット ${claude.weeklyResetText}`);
    } else {
      smallBlock(w, W, "Claude", "", null, COLORS.claude,
        "PCでClaude Codeにログインすると表示されます");
    }
  } else {
    mediumBlock(w, W, "Muse", capPlan(data.plan), COLORS.muse, [
      { label: `週間 · リセット ${data.resetText}`, left: museLeft },
      { label: `追加トークン ${data.additionalTokensLeft}`, left: 100 - data.additionalUsedPercent }
    ]);
    w.addSpacer(4);
    if (codex && !codex.error) {
      mediumBlock(w, W, "Codex", capPlan(codex.plan), COLORS.codex, [
        { label: `5時間 · リセット ${codex.fiveHourResetText}`, left: 100 - codex.fiveHourUsedPercent },
        { label: `週間 · リセット ${codex.weeklyResetText}`, left: 100 - codex.weeklyUsedPercent }
      ]);
    } else {
      addText(w, "Codex · 取得できませんでした", Font.systemFont(11), COLORS.sub);
    }
    w.addSpacer(4);
    if (claudeReady) {
      mediumBlock(w, W, "Claude", capPlan(claude.plan), COLORS.claude, [
        { label: `5時間 · リセット ${claude.fiveHourResetText}`, left: 100 - claude.fiveHourUsedPercent },
        { label: `週間 · リセット ${claude.weeklyResetText}`, left: 100 - claude.weeklyUsedPercent }
      ]);
    } else {
      addText(w, "Claude · PCでClaude Codeにログインすると表示されます", Font.systemFont(11), COLORS.sub);
    }
  }

  w.refreshAfterDate = new Date(Date.now() + 1000 * 60 * 30);
  return w;
}

const data = await loadData();
const widget = await buildWidget(data);
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}
Script.complete();
