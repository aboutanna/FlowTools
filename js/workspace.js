/* ==========================================================================
   FlowTools - Workspace Core Logic (Phase 6 - Ultimate Cloud Federation)
   ========================================================================== */

import Tools from './tools.js';

document.addEventListener("DOMContentLoaded", async () => {

    // 1. 身份状态守卫
    const user = await Auth.requireLogin();
    if (!user) return;

    // 2. 激活动态问候语
    updateGreeting();

    // 3. 【终极第六阶段】多表联网，动态编织全大厅的卡片与实时状态
    await renderWorkspaceUltimate(user);

    // 4. 绑定安全退出事件
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await Auth.logout();
        });
    }

    // 点击页面空白处，收起置顶小菜单
    document.addEventListener("click", () => {
        const activeMenu = document.querySelector(".pin-menu");
        if (activeMenu) activeMenu.remove();
    });

});

/**
 * 根据当前系统小时数，自动优雅切换问候语
 */
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = "Good evening.";

    if (hour >= 5 && hour < 12) {
        greeting = "Good morning.";
    } else if (hour >= 12 && hour < 18) {
        greeting = "Good afternoon.";
    }

    const greetingElement = document.getElementById("greeting");
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

/**
 * 【第六阶段终极核心】大厅合流控制中心
 * 兼顾安全降级，防止因业务表未上线导致页面崩塌
 */
async function renderWorkspaceUltimate(user) {
    const toolListContainer = document.getElementById("toolList");
    if (!toolListContainer) return;

    toolListContainer.innerHTML = "<div>Loading Muji notebook...</div>";

    let prefsMap = {};
    let liveStatusMap = {
        timeline: "暂无记录",
        muscle: "保持专注",
        memo: "时刻记录"
    };

    // ── 🔒 核心数据流 A：读取大厅偏好 ──
    try {
        const { data } = await db.from("tool_prefs").select("tool_id, is_pinned, last_opened_at").eq("user_id", user.id);
        if (data) {
            data.forEach(pref => {
                prefsMap[pref.tool_id] = {
                    isPinned: pref.is_pinned,
                    lastOpened: pref.last_opened_at ? new Date(pref.last_opened_at).getTime() : 0
                };
            });
        }
    } catch (err) {
        console.error("偏好读取降级:", err);
    }

    // ── 🌿 核心数据流 B：尝试联网偷看业务表状态（带最高安全防御） ──
    try {
        // 1. 尝试探测 Timeline 真实业务表
        // 计算今天的开始时间戳，用于统计“今天新增”
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: timelineCount, error: tlError } = await db
            .from("timeline_memos")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", user.id)
            .gte("created_at", todayStart.toISOString());

        // 如果表存在且正常返回了数字，立刻擦掉假数据，换上真状态！
        if (!tlError && timelineCount !== null) {
            liveStatusMap.timeline = timelineCount > 0 ? `今天新增 ${timelineCount} 条` : "今天暂无新增";
        }
    } catch (e) {
        // 如果表没上线，静悄悄地忽略，绝不让页面报错崩溃
    }

    try {
        // 2. 预留 Muscle 与 Memo 表的未来动态探测触角
        // 当你以后建立了 muscle_records 或 memos 表时，在这里写逻辑即可
        // 目前它们会稳稳地停留在 liveStatusMap 的默认安全提示上
    } catch (e) {}

    toolListContainer.innerHTML = "";

    // ── 📐 双轨黄金排序 ──
    const sortedTools = [...Tools].sort((a, b) => {
        const prefA = prefsMap[a.id] || { isPinned: false, lastOpened: 0 };
        const prefB = prefsMap[b.id] || { isPinned: false, lastOpened: 0 };
        if (prefA.isPinned !== prefB.isPinned) return prefB.isPinned - prefA.isPinned;
        return prefB.lastOpened - prefA.lastOpened;
    });

    // ── 编织最终的 Muji 横线卡片 ──
    sortedTools.forEach(tool => {
        const cardContainer = document.createElement("div");
        cardContainer.className = "card-container";

        const cardAnchor = document.createElement("a");
        cardAnchor.className = "tool-card";
        cardAnchor.href = tool.url; 

        // 点击卡片挂起并踩点时间
        cardAnchor.addEventListener("click", async (e) => {
            if (e.target.classList.contains("menu-btn")) return;
            e.preventDefault(); 
            try {
                const currentPinned = prefsMap[tool.id]?.isPinned || false;
                await db.from("tool_prefs").upsert({ 
                    user_id: user.id, 
                    tool_id: tool.id,
                    is_pinned: currentPinned,
                    last_opened_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,tool_id' });
            } catch (error) {
                console.error("时间同步失败:", error);
            } finally {
                window.location.href = tool.url;
            }
        });

        // 文本包装
        const textWrapper = document.createElement("div");
        const toolTitle = document.createElement("h2");
        
        // 换上了精雕细琢、充满棉麻纸张线条感的 Muji 极简图钉符号 ⚲
        const isPinned = prefsMap[tool.id]?.isPinned;
        toolTitle.textContent = `${isPinned ? '⚲ ' : ''}${tool.icon} ${tool.name}`; 

        const toolSubtitle = document.createElement("p");
        // 💡 核心变化：不再死用 tools.js 里的写死文本，优先采用我们实时联网计算出的活状态！
        toolSubtitle.textContent = liveStatusMap[tool.id] || tool.subtitle; 

        textWrapper.appendChild(toolTitle);
        textWrapper.appendChild(toolSubtitle);

        const menuButton = document.createElement("button");
        menuButton.className = "menu-btn";
        menuButton.textContent = "⋯";

        // 三个点菜单交互
        menuButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const existingMenu = document.querySelector(".pin-menu");
            if (existingMenu) existingMenu.remove();

            const pinMenu = document.createElement("div");
            pinMenu.className = "pin-menu";

            const pinActionItem = document.createElement("button");
            pinActionItem.className = "menu-item";
            pinActionItem.textContent = isPinned ? "Unpin (取消置顶)" : "Pin (置顶)";

            pinActionItem.addEventListener("click", async (actionEvent) => {
                actionEvent.stopPropagation();
                pinMenu.remove();

                const currentOpened = prefsMap[tool.id]?.lastOpened ? new Date(preferencesMap[tool.id].lastOpened).toISOString() : null;

                const { error } = await db.from("tool_prefs").upsert({
                    user_id: user.id,
                    tool_id: tool.id,
                    is_pinned: !isPinned,
                    last_opened_at: currentOpened,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,tool_id' });

                if (!error) {
                    await renderWorkspaceUltimate(user);
                }
            });

            pinMenu.appendChild(pinActionItem);
            cardContainer.appendChild(pinMenu);
        });

        cardAnchor.appendChild(textWrapper);
        cardAnchor.appendChild(menuButton);
        cardContainer.appendChild(cardAnchor);
        toolListContainer.appendChild(cardContainer);
    });
}