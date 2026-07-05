/* ==========================================================================
   FlowTools V2.0.1 — Workspace Core
   ========================================================================== */

import Tools from './tools.js';

document.addEventListener("DOMContentLoaded", async () => {
    const user = await Auth.requireLogin();
    if (!user) return;

    document.getElementById("greeting").textContent = getGreeting();
    await renderWorkspace(user);

    document.getElementById("logoutBtn").addEventListener("click", () => Auth.logout());
    document.getElementById("settingsBtn").addEventListener("click", () => showToast("Settings — coming soon."));

    document.addEventListener("click", () => document.querySelector(".pin-menu")?.remove());
});

/* ── Render ── */
async function renderWorkspace(user) {
    const container = document.getElementById("toolList");
    container.innerHTML = "";

    let prefsMap = {};
    try {
        const { data } = await db.from("tool_prefs")
            .select("tool_id, is_pinned, last_opened_at")
            .eq("user_id", user.id);
        (data || []).forEach(p => {
            prefsMap[p.tool_id] = {
                isPinned: p.is_pinned,
                lastOpened: p.last_opened_at ? new Date(p.last_opened_at).getTime() : 0
            };
        });
    } catch (_) {}

    const statusMap = await fetchLiveStatus(user);

    const sorted = [...Tools].sort((a, b) => {
        const pa = prefsMap[a.id] || { isPinned: false, lastOpened: 0 };
        const pb = prefsMap[b.id] || { isPinned: false, lastOpened: 0 };
        if (pa.isPinned !== pb.isPinned) return pb.isPinned - pa.isPinned;
        return pb.lastOpened - pa.lastOpened;
    });

    sorted.forEach(tool => {
        const prefs    = prefsMap[tool.id] || { isPinned: false, lastOpened: 0 };
        const subtitle = statusMap[tool.id] || tool.subtitle;

        const wrap = document.createElement("div");
        wrap.className = "card-container";

        const card = document.createElement("a");
        card.className = "tool-card";
        card.href = tool.url;

        card.addEventListener("click", async e => {
            if (e.target.closest(".menu-btn") || e.target.closest(".pin-menu")) return;
            e.preventDefault();
            try {
                await db.from("tool_prefs").upsert({
                    user_id: user.id, tool_id: tool.id,
                    is_pinned: prefs.isPinned,
                    last_opened_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: "user_id,tool_id" });
            } catch (_) {}
            window.location.href = tool.url;
        });

        const text = document.createElement("div");
        text.className = "tool-card-text";

        const title = document.createElement("h2");
        title.innerHTML = prefs.isPinned
            ? `<span class="pin-mark">⚲</span>${tool.icon} ${tool.name}`
            : `${tool.icon} ${tool.name}`;

        const sub = document.createElement("p");
        sub.textContent = subtitle;

        text.appendChild(title);
        text.appendChild(sub);

        const menuBtn = document.createElement("button");
        menuBtn.className = "menu-btn";
        menuBtn.setAttribute("aria-label", "More options");
        menuBtn.textContent = "⋯";

        menuBtn.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelector(".pin-menu")?.remove();
            const menu = buildMenu(tool, prefs, user, () => renderWorkspace(user));
            wrap.appendChild(menu);
            setTimeout(() => {
                document.addEventListener("click", () => menu.remove(), { once: true });
            }, 0);
        });

        card.appendChild(text);
        card.appendChild(menuBtn);
        wrap.appendChild(card);
        container.appendChild(wrap);
    });
}

/* ── Context menu ── */
function buildMenu(tool, prefs, user, onRefresh) {
    const menu = document.createElement("div");
    menu.className = "pin-menu";

    const pinItem = document.createElement("button");
    pinItem.className = "menu-item";
    pinItem.textContent = prefs.isPinned ? "取消置顶" : "置顶";
    pinItem.addEventListener("click", async e => {
        e.stopPropagation();
        menu.remove();
        await db.from("tool_prefs").upsert({
            user_id: user.id, tool_id: tool.id,
            is_pinned: !prefs.isPinned,
            last_opened_at: prefs.lastOpened ? new Date(prefs.lastOpened).toISOString() : null,
            updated_at: new Date().toISOString()
        }, { onConflict: "user_id,tool_id" });
        await onRefresh();
    });

    const divider = document.createElement("hr");
    divider.className = "menu-divider";

    const aboutItem = document.createElement("button");
    aboutItem.className = "menu-item muted";
    aboutItem.textContent = `关于 ${tool.name}`;
    aboutItem.addEventListener("click", e => {
        e.stopPropagation();
        menu.remove();
        showAbout(tool);
    });

    menu.appendChild(pinItem);
    menu.appendChild(divider);
    menu.appendChild(aboutItem);
    return menu;
}

/* ── About overlay ── */
function showAbout(tool) {
    const o = document.createElement("div");
    o.style.cssText = "position:fixed;inset:0;background:rgba(247,245,242,.92);display:flex;align-items:center;justify-content:center;z-index:500;";
    o.innerHTML = `
        <div style="max-width:300px;padding:40px;text-align:center;">
            <p style="font-size:30px;margin-bottom:14px">${tool.icon}</p>
            <p style="font-size:17px;font-weight:500;color:var(--text);margin-bottom:8px">${tool.name}</p>
            <p style="font-size:13px;color:var(--text-light);line-height:1.7;margin-bottom:24px">${tool.about}</p>
            <p style="font-size:11px;color:var(--text-dim);letter-spacing:.04em">Version ${tool.version} · ${tool.updated}</p>
        </div>`;
    o.addEventListener("click", () => o.remove());
    document.body.appendChild(o);
}

/* ── Live status ── */
async function fetchLiveStatus(user) {
    const map = {};

    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const { count, error } = await db.from("timeline_memos")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("created_at", today.toISOString());
        if (!error && count !== null)
            map.timeline = count > 0 ? `今天新增 ${count} 条` : "今天暂无新增";
    } catch (_) {}

    try {
        const { data, error } = await db.from("recovery_items")
            .select("id, last_started_at, duration_minutes, is_pinned")
            .eq("user_id", user.id);
        if (!error && data) {
            const recovering = data.filter(r => {
                if (!r.last_started_at) return false;
                return recoveryProgress(r.last_started_at, r.duration_minutes) < 1;
            });
            map.recovery = recovering.length > 0 ? `${recovering.length} 项恢复中` : "全部已就绪";
        }
    } catch (_) {}

    return map;
}
