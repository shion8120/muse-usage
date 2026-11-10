// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: chart-pie;
// AI Limits Widget (Scriptable) v5
// 中サイズ(横長): 3つの二重リング円グラフ (外=週間 / 内=5時間、Museは内=追加トークン)
// 小サイズ(正方形): 従来のバー表示
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
  bg: new Color("#1c1c1e"),
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

// 二重リングを描く (外リング/内リングとも「残り%」)
function makeRingImage(size, outerPct, innerPct, colorOuter, colorInner, centerText, centerSub) {
  const dc = new DrawContext();
  dc.size = new Size(size, size);
  dc.opaque = false;
  dc.respectScreenScale = true;
  const cx = size / 2, cy = size / 2;
  const track = new Color("#ffffff", 0.13);

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
  drawRing(size / 2 - 21, 7, clampPct(innerPct), colorInner);

  // 中央テキスト
  dc.setTextAlignedCenter();
  dc.setTextColor(C.text);
  dc.setFont(Font.boldSystemFont(19));
  dc.drawTextInRect(centerText, new Rect(cx - 40, cy - 17, 80, 24));
  dc.setTextColor(C.dim);
  dc.setFont(Font.systemFont(8));
  dc.drawTextInRect(centerSub, new Rect(cx - 40, cy + 7, 80, 12));
  return dc.getImage();
}

function servicesFrom(d) {
  const muse = {
    key: "muse", name: "Muse",
    plan: planLabel(d.plan),
    outer: clampPct(d.weeklyRemainingPercent),
    inner: clampPct(100 - (d.additionalUsedPercent || 0)),
    innerDesc: "追加 " + clampPct(100 - (d.additionalUsedPercent || 0)) + "% (" + (d.additionalTokensLeft || "-") + ")",
    reset: "リセット " + (d.resetText || "")
  };
  function sub(s, key) {
    if (!s) return { key: key, name: key === "codex" ? "Codex" : "Claude", plan: "", outer: 0, inner: 0, innerDesc: "未設定", reset: "", empty: true };
    return {
      key: key, name: key === "codex" ? "Codex" : "Claude",
      plan: planLabel(s.plan),
      outer: clampPct(100 - (s.weeklyUsedPercent || 0)),
      inner: clampPct(100 - (s.fiveHourUsedPercent || 0)),
      innerDesc: "5h " + clampPct(100 - (s.fiveHourUsedPercent || 0)) + "% left",
      reset: "リセット " + (s.weeklyResetText || "")
    };
  }
  return [muse, sub(d.codex, "codex"), sub(d.claude, "claude")];
}

// ===== 横長 (中サイズ): リング×3 =====
function buildWide(d) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(10, 14, 10, 14);

  const head = w.addStack();
  head.centerAlignContent();
  const t = head.addText("✦ AI Limits");
  t.font = Font.boldSystemFont(12);
  t.textColor = C.text;
  head.addSpacer();
  const up = head.addText("Updated " + (d.updatedText || ""));
  up.font = Font.systemFont(9);
  up.textColor = C.dim;
  w.addSpacer(4);

  const row = w.addStack();
  row.layoutHorizontally();
  const services = servicesFrom(d);
  services.forEach((s, i) => {
    if (i > 0) row.addSpacer();
    const col = row.addStack();
    col.layoutVertically();
    col.centerAlignContent();

    const imgHolder = col.addStack();
    imgHolder.addSpacer();
    const center = s.empty ? "—" : String(Math.round(s.outer)) + "%";
    const img = makeRingImage(84, s.outer, s.inner, SERVICE_COLORS[s.key], SERVICE_LIGHT[s.key], center, "WEEKLY");
    const im = imgHolder.addImage(img);
    im.imageSize = new Size(84, 84);
    imgHolder.addSpacer();
    col.addSpacer(3);

    const nm = col.addStack();
    nm.centerAlignContent();
    nm.addSpacer();
    const dot = nm.addText("● ");
    dot.font = Font.systemFont(9);
    dot.textColor = new Color(SERVICE_COLORS[s.key]);
    const nameT = nm.addText(s.name + (s.plan ? " " + s.plan : ""));
    nameT.font = Font.boldSystemFont(11);
    nameT.textColor = C.text;
    nm.addSpacer();
    col.addSpacer(1);

    const inner = col.addText(s.innerDesc);
    inner.font = Font.systemFont(9);
    inner.textColor = new Color(SERVICE_LIGHT[s.key]);
    inner.centerAlignText();
    const rs = col.addText(s.reset);
    rs.font = Font.systemFont(8);
    rs.textColor = C.dim;
    rs.centerAlignText();
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
  w.backgroundColor = C.bg;
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
