const designs = [
  ["松绿日常", "light", "sidebar", "#f0f5f2", "#ffffff", "#20392b", "#4f6558", "#286246", "#ffffff", "#deece2", "#c3d6c9", 12, "适合长期使用，导航稳定，任务和状态一眼可见。", "侧边导航 · 柔和绿 · 舒展间距", true],
  ["黑白秩序", "light", "ledger", "#f6f6f6", "#ffffff", "#171717", "#595959", "#222222", "#ffffff", "#e9e9e9", "#c5c5c5", 0, "把打卡变成清晰的清单，减少视觉噪声。", "直角线框 · 行式任务 · 单色层级"],
  ["晴空轻盈", "light", "topbar", "#eef5fc", "#ffffff", "#183653", "#4a627b", "#205da2", "#ffffff", "#ddebf9", "#bdd2e6", 10, "清透蓝色配合横向导航，适合办公团队。", "顶部导航 · 清晰分区 · 蓝色状态", true],
  ["橘子行动", "light", "split", "#fff5ee", "#ffffff", "#502a19", "#805a44", "#a74416", "#ffffff", "#ffdfc8", "#e5c0a8", 12, "用温暖的行动区突出今天还要完成的事情。", "左右分栏 · 橙色行动区 · 大按钮"],
  ["丁香静谧", "light", "focus", "#f4f0fa", "#ffffff", "#372b50", "#665777", "#725397", "#ffffff", "#e9dff6", "#d0c1e0", 14, "任务集中在中间，适合轻量的日常习惯记录。", "居中布局 · 留白 · 淡紫色"],
  ["墨夜工作台", "dark", "sidebar", "#101820", "#192530", "#eef4fa", "#afc1d0", "#9cc8f8", "#102b49", "#253d54", "#3b5265", 8, "夜间办公用的稳定工作台，状态对比明确。", "深色导航 · 冷蓝动作 · 双列任务"],
  ["抹茶手帐", "light", "journal", "#eef2e7", "#fafcf6", "#354124", "#5b694d", "#53682f", "#ffffff", "#dce6c9", "#bdc9a8", 4, "日期、星期和任务像一页日常记录，轻松而有秩序。", "日期栏 · 手帐格线 · 自然绿"],
  ["珊瑚伙伴", "light", "tiles", "#fff0f0", "#ffffff", "#542b31", "#7b545a", "#a94054", "#ffffff", "#f8dce2", "#e4bdc5", 14, "平铺的任务让图片和说明有更大的展示空间。", "任务平铺 · 珊瑚色 · 圆形完成标识"],
  ["深海专注", "dark", "focus", "#102c35", "#173b46", "#edf9fa", "#b0cfd4", "#81dcdf", "#123b40", "#22535c", "#46737b", 12, "将注意力留在任务上，适合睡前完成打卡。", "单列专注 · 深青表面 · 大留白"],
  ["瑞士网格", "light", "grid", "#ffffff", "#f4f4f4", "#202020", "#575757", "#b32e25", "#ffffff", "#f6dfdc", "#bcbcbc", 0, "强网格和明确的大小对比，适合效率优先的团队。", "严格网格 · 红色主动作 · 方形组件"],
  ["晨光杏黄", "light", "bottom", "#fffbed", "#ffffff", "#473e1b", "#70653d", "#796019", "#ffffff", "#f6e9b5", "#d9cc99", 12, "移动端优先，底部导航让每天打卡更顺手。", "底部导航 · 杏黄提示 · 手机优先", true],
  ["终端绿光", "dark", "terminal", "#101a14", "#18251c", "#dff8e6", "#a8c9b0", "#9debb0", "#15331e", "#283f2f", "#45624b", 0, "紧凑的文字与等宽数字，适合偏技术的团队。", "等宽数字 · 命令栏 · 清单状态"],
  ["莓红便签", "light", "notes", "#faf0f4", "#ffffff", "#4b2637", "#765365", "#994062", "#ffffff", "#f3dae5", "#dcbdcb", 6, "将任务呈现为便签，说明与操作独立分层。", "便签排布 · 莓红 · 页角编号"],
  ["银灰控制台", "light", "compact", "#eef0f3", "#ffffff", "#2a3240", "#596170", "#4a586f", "#ffffff", "#e0e5ed", "#c1c8d3", 6, "在更小的空间看清更多任务，适合管理使用。", "紧凑工具栏 · 行式任务 · 银灰色"],
  ["海盐青柠", "light", "rail", "#f0f7f5", "#ffffff", "#263c35", "#516c61", "#426d38", "#ffffff", "#e1edcf", "#bfd4c8", 12, "细窄导航节省空间，任务沿时间顺序展开。", "窄导航 · 流程节点 · 青柠状态"],
  ["咖啡夜读", "dark", "journal", "#28201d", "#352b26", "#f9eee8", "#d0bcb0", "#efb58a", "#3e271a", "#513b2c", "#715947", 4, "像夜晚的记录本，让每天完成的事情慢慢沉淀。", "棕色深调 · 日期页签 · 日记结构"],
  ["靛蓝团队", "light", "dashboard", "#eff1fb", "#ffffff", "#282f57", "#596184", "#454f9f", "#ffffff", "#e0e4f8", "#c2c8e4", 10, "完成概览放在侧边，任务和团队管理都容易扩展。", "概览侧栏 · 靛蓝主色 · 工作台结构"],
  ["清透白瓷", "light", "outline", "#ffffff", "#ffffff", "#243b40", "#567076", "#24616f", "#ffffff", "#e5f0f2", "#b9ced2", 14, "白色表面与细线框，让图片和内容成为主角。", "纯白界面 · 细描边 · 轻量顶部导航"],
  ["电光运动", "dark", "poster", "#181b14", "#24291c", "#f1f6e8", "#c0c9ae", "#d2ee77", "#293411", "#394526", "#5c6848", 6, "突出今天的行动，适合运动或训练打卡。", "荧光动作 · 大标题 · 高对比任务"],
  ["粉蓝拼色", "light", "blocks", "#f0f3fa", "#ffffff", "#29344d", "#5b6580", "#485f9c", "#ffffff", "#e1e8fc", "#bfcbe0", 8, "导航、日期和任务以色块区分，轻快但保持清晰。", "拼色区域 · 大块日期 · 分段任务"],
  ["朱砂清单", "light", "magazine", "#f9f7f6", "#ffffff", "#472e2a", "#775d57", "#a63b2b", "#ffffff", "#f4ddd6", "#d8c2bc", 0, "标题像杂志目录，任务像每日待办页，表达克制。", "衬线标题 · 目录式任务 · 朱砂点色"],
  ["午夜紫晶", "dark", "tiles", "#21182e", "#30223f", "#f4ecff", "#cebbdf", "#d2aff4", "#3f205a", "#49315e", "#6e537f", 12, "深紫色任务区，完成和待办以明确的标签区分。", "深紫平铺 · 分组标签 · 紧凑概览"],
  ["薄荷路线", "light", "timeline", "#eef9f5", "#ffffff", "#24463a", "#466958", "#207458", "#ffffff", "#d6eee4", "#b5d7c8", 10, "从上到下按任务推进，完成节点自然形成今日路径。", "竖向节点 · 薄荷绿 · 完成路径"],
  ["柠檬黑标", "light", "brutal", "#f7f8ef", "#ffffff", "#252719", "#5b6045", "#333a1c", "#ffffff", "#e5ec93", "#444b31", 0, "醒目的实线边界与黄绿标签，明确而有个性。", "实线边界 · 黄色进度 · 硬朗按钮"],
  ["湖蓝胶囊", "light", "pill", "#edf8fa", "#ffffff", "#23434b", "#48666f", "#276a7a", "#ffffff", "#d8edf1", "#b6d2d9", 14, "胶囊导航配合宽任务条，点击范围充分。", "胶囊导航 · 宽任务条 · 湖蓝反馈"],
  ["酒红沉稳", "dark", "split", "#29191f", "#38242b", "#fbecf1", "#d4b7c1", "#eda7bd", "#4c1f30", "#593340", "#7c5262", 8, "把日期和今日进度放入独立区块，适合安静的夜间使用。", "分区面板 · 酒红深调 · 稳重留白"],
  ["蓝图计划", "light", "blueprint", "#edf3fb", "#f9fcff", "#203d63", "#4e678b", "#275ca4", "#ffffff", "#dce9fa", "#9eb9dc", 0, "带刻度的计划页，任务次序与状态清楚对齐。", "蓝色格线 · 对齐刻度 · 规划感"],
  ["石墨极简", "dark", "ledger", "#1b1b1b", "#242424", "#f4f4f4", "#bdbdbd", "#eeeeee", "#202020", "#393939", "#5c5c5c", 2, "收起装饰，只保留任务标题、图片要求与完成动作。", "深色清单 · 细分隔线 · 低视觉噪声"],
  ["森林档案", "light", "archive", "#edf2ee", "#ffffff", "#2b4232", "#4c6554", "#3c6748", "#ffffff", "#dce9df", "#bacfc0", 5, "以档案标签组织任务，适合重视记录和回看的人。", "文件页签 · 侧边索引 · 森林绿"],
  ["砖橙面板", "light", "board", "#fbf2ed", "#ffffff", "#4e3327", "#7b5d4e", "#a04d2e", "#ffffff", "#f4e0d5", "#dcbcae", 10, "按待完成和已完成分列，让今天的工作状态直接可见。", "双列状态板 · 砖橙 · 分类视图"]
].map((v, i) => ({ id: i + 1, name: v[0], mode: v[1], layout: v[2], bg: v[3], surface: v[4], ink: v[5], muted: v[6], accent: v[7], on: v[8], soft: v[9], line: v[10], radius: v[11], description: v[12], traits: v[13], recommended: !!v[14] }));

const tasks = [
  { name: "阅读 20 分钟", description: "读几页书，把今天的一点收获留下来。", image: "图片选填", done: true, label: "日常" },
  { name: "运动 30 分钟", description: "散步、跑步或拉伸，选择适合自己的节奏。", image: "需要图片", done: false, label: "运动" },
  { name: "记录今日收获", description: "用一张照片，记录今天值得记住的事情。", image: "图片选填", done: false, label: "记录" }
];
const $ = (s) => document.querySelector(s);
let selected = Math.max(1, Math.min(30, Number(new URLSearchParams(location.search).get("style")) || 1));
let page = "today", device = "desktop", filter = "all";
let favorites = [];
try { favorites = JSON.parse(localStorage.getItem("xijian-ui-favorites") || "[]").filter(n => Number.isInteger(n) && n >= 1 && n <= 30); } catch { favorites = []; }
const demos = new Map();
const icons = { today: "◉", records: "▦", admin: "☷" };
function variables(d) { return `--c-bg:${d.bg};--c-surface:${d.surface};--c-ink:${d.ink};--c-muted:${d.muted};--c-accent:${d.accent};--c-on:${d.on};--c-soft:${d.soft};--c-line:${d.line};--c-radius:${d.radius}px;`; }
function navigation() { return `<nav class="c-nav" aria-label="示例导航">${[["today", "今日打卡"], ["records", "我的记录"], ["admin", "任务管理"]].map(([key, text]) => `<button data-preview-page="${key}" ${key === page ? 'aria-current="page"' : ""}><span>${icons[key]}</span><b>${text}</b></button>`).join("")}</nav>`; }
function taskMarkup(t, i, done) { return `<article class="c-task ${done ? "is-done" : ""}"><div class="c-task-index">${done ? "✓" : String(i + 1).padStart(2, "0")}</div><div class="c-task-content"><span class="c-tag">${t.label}</span><h3>${t.name}</h3><p>${t.description}</p><div class="c-task-meta"><span>${t.image}</span><span>每天</span></div>${i === 1 && !done ? '<label class="c-upload">＋ 添加图片<input type="file" accept="image/jpeg,image/png,image/webp" data-upload></label><span class="c-upload-result" role="status"></span>' : ""}</div><button class="c-action ${done ? "completed" : ""}" data-check="${i}" ${i === 1 && !done ? 'disabled title="请先添加图片"' : ""}>${done ? "✓ 已完成" : "打卡"}</button></article>`; }
function todayMarkup(d) {
  const state = demos.get(d.id) || { done: [true, false, false], image: false };
  const count = state.done.filter(Boolean).length;
  const intro = `<div class="c-heading"><div class="c-date">10 月 09 日 · 星期五</div><h1>${d.layout === "poster" ? "今天，也向前一步。" : d.layout === "terminal" ? "今天的任务_" : "把今天的小事做好。"}</h1><p>林小满，${count === 3 ? "今天的任务都已完成。" : "按自己的节奏，完成今天的任务。"}</p></div>`;
  const progress = `<aside class="c-progress"><div class="c-progress-label">今日进度 <strong>${count} <small>/ 3</small></strong></div><div class="c-progress-track"><span style="width:${count / 3 * 100}%"></span></div><p>${count === 3 ? "今天已完成，明天继续。" : `还有 ${3 - count} 项任务待完成`}</p><div class="c-week">${["一", "二", "三", "四", "五", "六", "日"].map((s, i) => `<span class="${i < 4 ? "checked" : i === 4 ? "current" : ""}">${i < 4 ? "✓" : s}</span>`).join("")}</div><small>本周打卡记录</small></aside>`;
  const items = tasks.map((t, i) => taskMarkup(t, i, state.done[i]));
  const list = d.layout === "board" ? `<div class="c-board"><section><h2>待完成 · ${3 - count}</h2>${items.filter((_, i) => !state.done[i]).join("") || '<p class="c-clear">今日待办已清空 ✓</p>'}</section><section><h2>已完成 · ${count}</h2>${items.filter((_, i) => state.done[i]).join("")}</section></div>` : `<div class="c-task-list">${items.join("")}</div>`;
  return `${intro}<div class="c-workspace">${progress}<section class="c-tasks"><div class="c-section-title"><h2>今日任务</h2><span>共 3 项</span></div>${list}</section></div><div class="c-reminder"><span>◷</span> 微信提醒已开启 · 每天 20:07 提醒未完成任务</div>`;
}
function recordsMarkup() { return `<div class="c-heading"><div class="c-date">我的记录</div><h1>每一步，都有迹可循。</h1><p>查看自己的每日完成情况。</p></div><div class="c-workspace"><aside class="c-progress"><div class="c-progress-label">本月完成 <strong>18 <small>次</small></strong></div><p>累计打卡 24 天</p><div class="c-progress-track"><span style="width:65%"></span></div><small>坚持自己的节奏</small></aside><section class="c-calendar"><div class="c-section-title"><h2>2026 年 10 月</h2><span>示例月份</span></div><div class="c-calendar-grid">${["一", "二", "三", "四", "五", "六", "日"].map(s => `<b>${s}</b>`).join("")}${'<span class="c-calendar-blank"></span>'.repeat(3)}${Array.from({ length: 31 }, (_, i) => `<button data-day="${i + 1}" class="${i < 8 ? "full" : i === 8 ? "active" : ""}"><span>${i + 1}</span><small>${i < 8 ? "3/3" : i === 8 ? "1/3" : "—"}</small></button>`).join("")}</div><p id="demo-day-result" class="c-day-result">10 月 9 日 · 完成 1 / 3 项任务</p></section></div>`; }
function adminMarkup() { return `<div class="c-heading"><div class="c-date">管理员工作台</div><h1>让每天的目标更清晰。</h1><p>设置团队任务与图片要求。</p></div><div class="c-admin-toolbar"><span>任务设置 <small>· 成员进度 · 微信提醒</small></span><button class="c-action" id="demo-create">＋ 新建任务</button></div><form class="c-demo-form" id="demo-form" hidden><label>任务名称<input name="taskName" required maxlength="30" placeholder="例如：每天散步 20 分钟"></label><label>图片要求<select><option>图片选填</option><option>需要图片</option><option>无需图片</option></select></label><button class="c-action">保存示例任务</button></form><section class="c-admin-list">${tasks.map((t, i) => `<article class="c-admin-row"><span class="c-task-index">${i + 1}</span><div><h3>${t.name}</h3><p>每天 · ${t.image}</p></div><span class="c-tag">已启用</span><button class="c-edit" data-edit="${i}">编辑</button></article>`).join("")}</section><div class="c-reminder">◷ 已有任务的调整从明天生效</div><p class="c-demo-feedback" role="status"></p>`; }
function renderPreview() {
  const d = designs[selected - 1];
  $("#design-number").textContent = String(d.id).padStart(2, "0");
  $("#design-name").textContent = d.name;
  $("#design-description").textContent = d.description;
  $("#design-traits").textContent = d.traits;
  $("#recommendation").textContent = d.recommended ? "推荐优先看" : "";
  $("#favorite").textContent = favorites.includes(d.id) ? "★ 已收藏" : "☆ 收藏方案";
  $("#favorite").setAttribute("aria-pressed", String(favorites.includes(d.id)));
  $("#preview-stage").dataset.device = device;
  const preview = $("#preview");
  preview.style.cssText = variables(d);
  preview.dataset.layout = d.layout;
  preview.dataset.mode = d.mode;
  preview.dataset.style = String(d.id);
  preview.dataset.device = device;
  preview.innerHTML = `<div class="c-shell"><header class="c-header"><div class="c-brand"><span class="c-brand-icon">息</span><div>息间<small>每日打卡</small></div></div>${navigation()}<div class="c-avatar">林</div></header><main class="c-main">${page === "today" ? todayMarkup(d) : page === "records" ? recordsMarkup() : adminMarkup()}</main></div>`;
  document.querySelectorAll("[data-page]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.page === page)));
  document.querySelectorAll("button[data-device]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.device === device)));
  if (page === "today" && demos.get(d.id)?.image) {
    const input = preview.querySelector("[data-check='1']");
    if (input) input.disabled = false;
    const label = preview.querySelector(".c-upload-result");
    if (label) label.textContent = "✓ 已选择示例图片";
  }
}
function miniMarkup(d) {
  return `<div class="mini-shell"><div class="mini-nav"><b>息间</b><span>今日</span><span>记录</span><span>管理</span></div><div class="mini-main"><div class="mini-heading"><small>10 月 09 日 · 星期五</small><strong>${d.layout === "poster" ? "今天，也向前一步。" : "把今天的小事做好。"}</strong></div><div class="mini-content"><aside><b>1 / 3</b><span></span><small>今日进度</small></aside><div class="mini-list">${tasks.map((t, i) => `<div><i>${i === 0 ? "✓" : i + 1}</i><b>${t.name}</b><em>${i === 0 ? "已完成" : "打卡"}</em></div>`).join("")}</div></div></div></div>`;
}
function renderGallery() {
  const list = designs.filter(d => filter === "all" || filter === "favorite" && favorites.includes(d.id) || d.mode === filter);
  $("#gallery").innerHTML = list.map(d => `<button class="design-card ${d.id === selected ? "selected" : ""}" data-design="${d.id}" aria-pressed="${d.id === selected}" aria-label="查看第 ${d.id} 套：${d.name}"><div class="mini concept" data-layout="${d.layout}" data-style="${d.id}" style="${variables(d)}">${miniMarkup(d)}</div><div class="design-card-caption"><span>${String(d.id).padStart(2, "0")} <strong>${d.name}</strong></span><span>${favorites.includes(d.id) ? "★" : d.mode === "dark" ? "深色" : "浅色"}</span></div><p>${d.traits}</p></button>`).join("");
  $("#empty").hidden = list.length > 0;
  $("#favorite-count").textContent = String(favorites.length);
}
function select(id, scroll = false) {
  selected = id;
  history.replaceState(null, "", `${location.pathname}?style=${id}`);
  $("#selection-result").hidden = true;
  renderPreview(); renderGallery();
  if (scroll) $(".viewer").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
}
document.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.design) select(Number(b.dataset.design), true);
  if (b.dataset.page || b.dataset.previewPage) { page = b.dataset.page || b.dataset.previewPage; renderPreview(); }
  if (b.dataset.device) { device = b.dataset.device; renderPreview(); }
  if (b.dataset.filter) { filter = b.dataset.filter; document.querySelectorAll("[data-filter]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); renderGallery(); }
  if (b.id === "previous" || b.id === "next") select((selected - 1 + (b.id === "next" ? 1 : 29)) % 30 + 1);
  if (b.id === "favorite") {
    favorites = favorites.includes(selected) ? favorites.filter(n => n !== selected) : [...favorites, selected];
    try { localStorage.setItem("xijian-ui-favorites", JSON.stringify(favorites)); } catch { /* 收藏在当前页面继续可用 */ }
    renderPreview(); renderGallery();
  }
  if (b.id === "choose") {
    const d = designs[selected - 1];
    const result = $("#selection-result");
    result.textContent = `已选：第 ${String(d.id).padStart(2, "0")} 套「${d.name}」。回到聊天告诉我这个编号，就可以将该风格应用到项目。`;
    result.hidden = false;
  }
  if (b.dataset.check !== undefined) {
    const state = demos.get(selected) || { done: [true, false, false], image: false };
    state.done[Number(b.dataset.check)] = !state.done[Number(b.dataset.check)];
    demos.set(selected, state); renderPreview();
    $("#preview").querySelector(`[data-check='${b.dataset.check}']`)?.focus();
  }
  if (b.dataset.day) {
    document.querySelectorAll("[data-day]").forEach(x => x.classList.toggle("active", x === b));
    const n = Number(b.dataset.day);
    $("#demo-day-result").textContent = `10 月 ${n} 日 · ${n < 9 ? "完成 3 / 3 项任务" : n === 9 ? "完成 1 / 3 项任务" : "还没有打卡记录"}`;
  }
  if (b.id === "demo-create") { $("#demo-form").hidden = !$("#demo-form").hidden; if (!$("#demo-form").hidden) $("#demo-form input").focus(); }
  if (b.dataset.edit) { $("#demo-form").hidden = false; $("#demo-form input").value = tasks[Number(b.dataset.edit)].name; $("#demo-form input").focus(); }
});
document.addEventListener("change", e => {
  if (!e.target.matches("[data-upload]") || !e.target.files.length) return;
  const state = demos.get(selected) || { done: [true, false, false], image: false };
  state.image = true; demos.set(selected, state);
  $("#preview [data-check='1']").disabled = false;
  $("#preview .c-upload-result").textContent = "✓ 已选择示例图片（仅本页演示）";
});
document.addEventListener("submit", e => {
  if (e.target.id !== "demo-form") return;
  e.preventDefault();
  const value = new FormData(e.target).get("taskName");
  $(".c-demo-feedback").textContent = `「${value}」已保存为示例。正式任务数据未修改。`;
  e.target.hidden = true;
});
renderPreview(); renderGallery();
