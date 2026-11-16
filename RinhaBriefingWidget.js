// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: calendar;
// Rinha Briefing Widget (Scriptable) v1
// 大サイズ: 今日の持ち物 + 今日の予定/締切 + 明日の予告
// 中サイズ: 今日分を凝縮 / 小サイズ: 持ち物 + 次の予定
// データ: GitHub shion8120/muse-usage の briefing.json (燐羽が毎朝/毎晩/随時更新)

const JSON_URL = "https://raw.githubusercontent.com/shion8120/muse-usage/main/briefing.json";

const FALLBACK = {
  version: 1,
  updatedAt: "2026-11-16T18:25:00+09:00",
  updatedText: "11/16 18:25",
  alert: "",
  today: {
    date: "2026-11-16",
    dateText: "11/16(月)",
    bring: ["ESP"],
    events: [
      { time: "15:30-17:00", title: "情報ネットワーク概論" },
      { time: "17:15-18:45", title: "情報学ゼミ" }
    ],
    deadlines: [],
    notes: []
  },
  tomorrow: {
    date: "2026-11-17",
    dateText: "11/17(火)",
    bring: [],
    events: [
      { time: "13:00-13:30", title: "キャリアミニ講座", detail: "208教室・申込不要" }
    ],
    deadlines: [
      { title: "筆記試験対策講座の視聴URLは今日まで" }
    ],
    notes: []
  }
};

const C = {
  text: new Color("#ffffff"),
  sub: new Color("#d1d1d6"),
  dim: new Color("#8e8e93"),
  accent: new Color("#c4b5fd"),
  warn: new Color("#ffb340"),
  line: new Color("#3a3a3c")
};

function baseWidget(padding) {
  const w = new ListWidget();
  const grad = new LinearGradient();
  grad.colors = [new Color("#26262b"), new Color("#17171a")];
  grad.locations = [0, 1];
  w.backgroundGradient = grad;
  w.setPadding(padding[0], padding[1], padding[2], padding[3]);
  return w;
}

function txt(parent, s, size, color, bold) {
  const t = parent.addText(String(s == null ? "" : s));
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.minimumScaleFactor = 0.85;
  t.lineLimit = 1;
  return t;
}

function header(w, d) {
  const row = w.addStack();
  row.centerAlignContent();
  txt(row, "✦ 燐羽", 13, C.accent, true);
  row.addSpacer(8);
  const day = d.today || {};
  txt(row, day.dateText || "", 15, C.text, true);
  txt(row, " 今日", 13, C.sub, false);
  row.addSpacer();
  txt(row, "更新 " + (d.updatedText || ""), 9, C.dim, false);
}

function bringLines(parent, items, size) {
  if (!items || items.length === 0) {
    txt(parent, "特になし", size, C.dim, false);
    return;
  }
  items.slice(0, 4).forEach(function (it) {
    const row = parent.addStack();
    row.centerAlignContent();
    txt(row, "☐ ", size, C.accent, true);
    txt(row, it, size, C.text, true);
  });
}

function eventLines(parent, events, max, titleSize) {
  if (!events || events.length === 0) {
    txt(parent, "予定なし", titleSize, C.dim, false);
    return;
  }
  events.slice(0, max).forEach(function (ev) {
    const row = parent.addStack();
    row.centerAlignContent();
    if (ev.time) {
      const tm = txt(row, ev.time, 10, C.dim, false);
      tm.font = Font.monospacedSystemFont(10);
      row.addSpacer(6);
    }
    let label = ev.title || "";
    if (ev.detail) label += "（" + ev.detail + "）";
    txt(row, label, titleSize, C.text, false);
  });
}

function deadlineLines(parent, deadlines, size) {
  (deadlines || []).slice(0, 2).forEach(function (dl) {
    const row = parent.addStack();
    row.centerAlignContent();
    txt(row, "⚠️ ", size, C.warn, true);
    txt(row, dl.title || "", size, C.warn, true);
  });
}

function divider(w) {
  w.addSpacer(7);
  const s = w.addStack();
  s.backgroundColor = C.line;
  s.size = new Size(0, 1);
  w.addSpacer(7);
}

// ===== 大サイズ (メイン) =====
function buildLarge(d) {
  const w = baseWidget([14, 16, 12, 16]);
  const today = d.today || {};
  const tomorrow = d.tomorrow || {};

  header(w, d);
  if (d.alert) {
    w.addSpacer(4);
    txt(w, "⚠️ " + d.alert, 12, C.warn, true);
  }
  w.addSpacer(9);

  txt(w, "🎒 今日の持ち物", 13, C.accent, true);
  w.addSpacer(3);
  bringLines(w, today.bring, 15);
  w.addSpacer(9);

  txt(w, "📅 今日の予定", 13, C.accent, true);
  w.addSpacer(3);
  eventLines(w, today.events, 4, 12);
  if (today.deadlines && today.deadlines.length > 0) {
    w.addSpacer(5);
    deadlineLines(w, today.deadlines, 12);
  }
  (today.notes || []).slice(0, 1).forEach(function (n) {
    w.addSpacer(3);
    txt(w, n, 10, C.dim, false);
  });

  divider(w);

  const tHead = w.addStack();
  tHead.centerAlignContent();
  txt(tHead, "➡️ 明日 ", 13, C.accent, true);
  txt(tHead, tomorrow.dateText || "", 13, C.text, true);
  w.addSpacer(3);
  if (tomorrow.bring && tomorrow.bring.length > 0) {
    const row = w.addStack();
    row.centerAlignContent();
    txt(row, "🎒 ", 11, C.accent, true);
    txt(row, tomorrow.bring.slice(0, 4).join(" ・ "), 12, C.text, true);
  }
  eventLines(w, tomorrow.events, 3, 12);
  deadlineLines(w, tomorrow.deadlines, 11);
  (tomorrow.notes || []).slice(0, 1).forEach(function (n) {
    txt(w, n, 10, C.dim, false);
  });
  w.addSpacer();
  return w;
}

// ===== 中サイズ: 今日分のみ凝縮 =====
function buildMedium(d) {
  const w = baseWidget([12, 16, 10, 16]);
  const today = d.today || {};
  const tomorrow = d.tomorrow || {};
  header(w, d);
  w.addSpacer(7);
  const row = w.addStack();
  row.centerAlignContent();
  txt(row, "🎒 ", 13, C.accent, true);
  const bringText = (today.bring && today.bring.length > 0) ? today.bring.slice(0, 4).join(" ・ ") : "特になし";
  txt(row, bringText, 14, C.text, true);
  w.addSpacer(6);
  eventLines(w, today.events, 3, 12);
  deadlineLines(w, today.deadlines, 11);
  w.addSpacer(4);
  const tRow = w.addStack();
  tRow.centerAlignContent();
  txt(tRow, "➡️ 明日 " + (tomorrow.dateText || "") + "：", 10, C.dim, false);
  const first = (tomorrow.events && tomorrow.events[0]) ? ((tomorrow.events[0].time || "") + " " + (tomorrow.events[0].title || "")) : "予定なし";
  txt(tRow, first, 10, C.sub, false);
  w.addSpacer();
  return w;
}

// ===== 小サイズ: 持ち物 + 次の予定 =====
function buildSmall(d) {
  const w = baseWidget([12, 12, 10, 12]);
  const today = d.today || {};
  header(w, d);
  w.addSpacer(8);
  txt(w, "🎒 持ち物", 12, C.accent, true);
  w.addSpacer(3);
  bringLines(w, today.bring, 13);
  w.addSpacer(8);
  txt(w, "📅 次", 12, C.accent, true);
  w.addSpacer(3);
  eventLines(w, today.events, 2, 11);
  w.addSpacer();
  return w;
}

async function loadData() {
  try {
    const req = new Request(JSON_URL);
    req.timeoutInterval = 15;
    const d = await req.loadJSON();
    if (d && d.today && d.tomorrow) return d;
    return FALLBACK;
  } catch (e) {
    return FALLBACK;
  }
}

const data = await loadData();
let widget;
if (config.widgetFamily === "small") {
  widget = buildSmall(data);
} else if (config.widgetFamily === "medium") {
  widget = buildMedium(data);
} else {
  widget = buildLarge(data);
}
widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentLarge();
}
Script.complete();
