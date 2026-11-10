// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: chart-pie;
// AI Limits Widget (Scriptable) v6
// 中サイズ(横長): 3つの二重リング円グラフ
//   メイン(外リング+中央の数字): Muse=週間 / Codex・Claude=5時間
//   内リング: Muse=追加トークン / Codex・Claude=週間
// 小サイズ(正方形): バー表示
// データ: GitHub shion8120/muse-usage の usage.json (1時間ごとに自動更新)

const JSON_URL = "https://raw.githubusercontent.com/shion8120/muse-usage/main/usage.json";

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
    fiveHourResetAt: "2026-11-10T17:12:17+09:00",
    fiveHourResetText: "11/10 17:12",
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
  updatedAt: "2026-11-10 12:12",
  updatedText: "11/10 12:12"
};

const C = {
  text: new Color("#ffffff"),
  sub: new Color("#aeaeb2"),
  dim: new Color("#8e8e93"),
  barBg: new Color("#3a3a3c")
};
const SERVICE_COLORS = { muse: "#8b5cf6", codex: "#10a37f", claude: "#d97757" };
const SERVICE_LIGHT = { muse: "#c4b5fd", codex: "#6ee7b7", claude: "#fdba74" };

function planLabel(p) {
  if (!p) return "";
  const s = String(p);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function clampPct(x) {
  const n = Number(x);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// 二重リング (どちらも「残り%」)。中央にメイン指標の数字を描く
function makeRingImage(size, outerPct, innerPct, colorOuter, colorInner, centerText, centerSub) {
  const dc = new DrawContext();
  dc.size = new Size(size, size);
  dc.opaque = false;
  dc.respectScreenScale = true;
  const cx = size / 2, cy = size / 2;
  const track = new Color("#ffffff", 0.10);

  function ringPath(r, pct) {
    const p = new Path();
    const steps = Math.max(2, Math.round(90 * pct / 100));
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * (Math.PI * 2 * pct / 100);
      const pt = new Point(cx + r * Math.cos(a), cy + r * Math.sin(a));
      if (i === 0) p.move(pt); else p.addLine(pt);
    }
    return p;
  }
  function drawRing(r, lw, pct, colorHex) {
    dc.addPath(ringPath(r, 100));
    dc.setStrokeColor(track);
    dc.setLineWidth(lw);
    dc.strokePath();
    if (pct > 0) {
      dc.addPath(ringPath(r, pct));
      dc.setStrokeColor(new Color(colorHex));
      dc.setLineWidth(lw);
      dc.strokePath();
    }
  }
  drawRing(size / 2 - 6, 9, clampPct(outerPct), colorOuter);
  drawRing(size / 2 - 20, 7, clampPct(innerPct), colorInner);

  dc.setTextAlignedCenter();
  dc.setTextColor(C.text);
  dc.setFont(Font.boldSystemFont(16));
  dc.drawTextInRect(centerText, new Rect(cx - 30, cy - 15, 60, 21));
  if (centerSub) {
    dc.setTextColor(C.dim);
    dc.setFont(Font.semiboldSystemFont(7));
    dc.drawTextInRect(centerSub, new Rect(cx - 30, cy + 6, 60, 10));
  }
  return dc.getImage();
}

function servicesFrom(d) {
  const muse = {
    key: "muse", name: "Muse", plan: planLabel(d.plan),
    outer: clampPct(d.weeklyRemainingPercent),
    inner: clampPct(100 - (d.additionalUsedPercent || 0)),
    main: clampPct(d.weeklyRemainingPercent), mainLabel: "WEEKLY",
    innerDesc: "追加 " + clampPct(100 - (d.additionalUsedPercent || 0)) + "% (" + (d.additionalTokensLeft || "-") + ")",
    reset: "週リセット " + (d.resetText || "")
  };
  function sub(s, key) {
    const nm = key === "codex" ? "Codex" : "Claude";
    if (!s) return { key: key, name: nm, plan: "", outer: 0, inner: 0, main: null, mainLabel: "", innerDesc: "未設定", reset: "" };
    const fiveLeft = clampPct(100 - (s.fiveHourUsedPercent || 0));
    const weekLeft = clampPct(100 - (s.weeklyUsedPercent || 0));
    return {
      key: key, name: nm, plan: planLabel(s.plan),
      outer: fiveLeft, inner: weekLeft,
      main: fiveLeft, mainLabel: "5H LEFT",
      innerDesc: "週 " + weekLeft + "% left",
      reset: "5hリセット " + (s.fiveHourResetText || "")
    };
  }
  return [muse, sub(d.codex, "codex"), sub(d.claude, "claude")];
}

// ===== 横長 (中サイズ): リング×3 =====
function buildWide(d) {
  const w = new ListWidget();
  const grad = new LinearGradient();
  grad.colors = [new Color("#26262b"), new Color("#17171a")];
  grad.locations = [0, 1];
  w.backgroundGradient = grad;
  w.setPadding(9, 14, 9, 14);

  const head = w.addStack();
  head.centerAlignContent();
  const t = head.addText("✦ AI Limits");
  t.font = Font.boldSystemFont(12);
  t.textColor = C.text;
  head.addSpacer();
  const up = head.addText("Updated " + (d.updatedText || ""));
  up.font = Font.systemFont(9);
  up.textColor = C.dim;
  w.addSpacer(5);

  const row = w.addStack();
  row.layoutHorizontally();
  const services = servicesFrom(d);
  services.forEach((s, i) => {
    if (i > 0) row.addSpacer(6);
    const col = row.addStack();
    col.layoutVertically();
    col.size = new Size(98, 0);

    const imgHolder = col.addStack();
    imgHolder.addSpacer();
    const center = s.main == null ? "—" : String(Math.round(s.main)) + "%";
    const img = makeRingImage(80, s.outer, s.inner, SERVICE_COLORS[s.key], SERVICE_LIGHT[s.key], center, s.mainLabel);
    const im = imgHolder.addImage(img);
    im.imageSize = new Size(80, 80);
    imgHolder.addSpacer();
    col.addSpacer(4);

    const nm = col.addStack();
    nm.centerAlignContent();
    nm.addSpacer();
    const dot = nm.addText("● ");
    dot.font = Font.systemFont(8);
    dot.textColor = new Color(SERVICE_COLORS[s.key]);
    const nameT = nm.addText(s.name);
    nameT.font = Font.boldSystemFont(11);
    nameT.textColor = C.text;
    if (s.plan) {
      nm.addSpacer(4);
      const chip = nm.addStack();
      chip.backgroundColor = new Color(SERVICE_COLORS[s.key], 0.30);
      chip.cornerRadius = 5;
      chip.setPadding(1, 5, 1, 5);
      const pt = chip.addText(s.plan);
      pt.font = Font.semiboldSystemFont(8);
      pt.textColor = C.text;
    }
    nm.addSpacer();
    col.addSpacer(2);

    const inner = col.addText(s.innerDesc);
    inner.font = Font.semiboldSystemFont(9);
    inner.textColor = new Color(SERVICE_LIGHT[s.key]);
    inner.centerAlignText();
    inner.minimumScaleFactor = 0.8;
    const rs = col.addText(s.reset);
    rs.font = Font.systemFont(8);
    rs.textColor = C.dim;
    rs.centerAlignText();
    rs.minimumScaleFactor = 0.8;
  });
  return w;
}

// ===== 正方形 (小サイズ): バー×3 =====
function bar(parent, leftPct, colorHex) {
  const track = parent.addStack();
  track.backgroundColor = C.barBg;
  track.cornerRadius = 3;
  track.size = new Size(0, 6);
  const wdt = Math.max(0, Math.min(128, Math.round(128 * clampPct(leftPct) / 100)));
  if (wdt > 0) {
    const fill = track.addStack();
    fill.backgroundColor = new Color(colorHex);
    fill.cornerRadius = 3;
    fill.size = new Size(wdt, 6);
  }
  track.addSpacer();
}

function section(parent, name, plan, leftPct, colorHex, subText) {
  const row = parent.addStack();
  row.centerAlignContent();
  const n = row.addText(name);
  n.font = Font.boldSystemFont(11);
  n.textColor = C.text;
  if (plan) {
    const p = row.addText(" " + plan);
    p.font = Font.systemFont(9);
    p.textColor = C.sub;
  }
  row.addSpacer();
  const v = row.addText(leftPct == null ? "未設定" : Math.round(leftPct) + "% left");
  v.font = Font.boldMonospacedSystemFont(13);
  v.textColor = new Color(colorHex);
  parent.addSpacer(2);
  if (leftPct == null) {
    const s = parent.addText(subText);
    s.font = Font.systemFont(8);
    s.textColor = C.dim;
  } else {
    bar(parent, leftPct, colorHex);
    parent.addSpacer(2);
    const s = parent.addText(subText);
    s.font = Font.systemFont(8);
    s.textColor = C.dim;
  }
}

function buildSquare(d) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#1c1c1e");
  w.setPadding(12, 12, 10, 12);
  const head = w.addStack();
  head.centerAlignContent();
  const t = head.addText("✦ AI Limits");
  t.font = Font.boldSystemFont(12);
  t.textColor = C.text;
  head.addSpacer();
  const up = head.addText(d.updatedText || "");
  up.font = Font.systemFont(8);
  up.textColor = C.dim;
  w.addSpacer(7);
  section(w, "Muse", planLabel(d.plan), d.weeklyRemainingPercent, SERVICE_COLORS.muse,
    "週 Resets " + (d.resetText || "") + " · 追加 " + (d.additionalTokensLeft || "-"));
  w.addSpacer(8);
  section(w, "Codex", d.codex ? planLabel(d.codex.plan) : "", d.codex ? 100 - d.codex.weeklyUsedPercent : null, SERVICE_COLORS.codex,
    d.codex ? "週 Resets " + d.codex.weeklyResetText + " · 5h " + (100 - d.codex.fiveHourUsedPercent) + "%" : "取得できませんでした");
  w.addSpacer(8);
  section(w, "Claude", d.claude ? planLabel(d.claude.plan) : "", d.claude ? 100 - d.claude.weeklyUsedPercent : null, SERVICE_COLORS.claude,
    d.claude ? "週 Resets " + d.claude.weeklyResetText + " · 5h " + (100 - d.claude.fiveHourUsedPercent) + "%" : "PCでClaude Codeにログインすると表示されます");
  return w;
}

async function loadData() {
  try {
    const req = new Request(JSON_URL);
    req.timeoutInterval = 15;
    return await req.loadJSON();
  } catch (e) {
    return FALLBACK;
  }
}

const data = await loadData();
let widget;
if (config.widgetFamily === "small") {
  widget = buildSquare(data);
} else {
  widget = buildWide(data);
}
widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
