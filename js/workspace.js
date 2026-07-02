/* ==========================================================================
   FlowTools - Workspace Core Logic (Phase 4 - Light Tool Preferences)
   ========================================================================== */

import Tools from './tools.js';

document.addEventListener("DOMContentLoaded", async () => {

    // 1. 身份状态守卫（获取当前登录的真用户）
    const user = await Auth.requireLogin();
    if (!user) return;

    // 2. 激活动态问候语
    updateGreeting();

    // 3. 【第四阶段核心】从全新极简表 tool_prefs 读取数据并自动排版卡片
    await renderWorkspaceToolsFromPrefs(user);

    // 4. 绑定安全退出事件
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await Auth.logout();
        });
    }

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
 * 【架构升级】全面对接 tool_prefs 表的聪明排序渲染中心
 */
async function renderWorkspaceToolsFromPrefs(user) {
    const toolListContainer = document.getElementById("toolList");
    if (!toolListContainer) return;

    toolListContainer.innerHTML = "<div>Loading Muji notebook...</div>";

    let prefsMap = {};

    try {
        // A. 联网拉取当前用户在 tool_prefs 表里的所有工具偏好记录
        const { data, error } = await db
            .from("tool_prefs")
            .select("tool_id, is_pinned, last_opened_at")
            .eq("user_id", user.id);

        if (data) {
            // 将数组扁平化存入地图，方便后续快速比对排序
            data.forEach(pref => {
                prefsMap[pref.tool_id] = {
                    isPinned: pref.is_pinned,
                    lastOpened: pref.last_opened_at ? new Date(pref.last_opened_at).getTime() : 0
                };
            });
        }
    } catch (err) {
        console.error("读取云端偏好失败，降级使用默认排序:", err);
    }

    toolListContainer.innerHTML = "";

    // B. 【黄金排序规则】：优先比对是否置顶(is_pinned)，若相同则比对最后打开时间(last_opened_at)
    const sortedTools = [...Tools].sort((a, b) => {
        const prefA = prefsMap[a.id] || { isPinned: false, lastOpened: 0 };
        const prefB = prefsMap[b.id] || { isPinned: false, lastOpened: 0 };

        // 1. 先比置顶状态 (true 强制排前面)
        if (prefA.isPinned !== prefB.isPinned) {
            return prefB.isPinned - prefA.isPinned;
        }
        // 2. 再比最后打开时间 (时间戳大的排前面)
        return prefB.lastOpened - prefA.lastOpened;
    });

    // C. 开始一行一行编织排序后的新横线卡片
    sortedTools.forEach(tool => {
        const cardAnchor = document.createElement("a");
        cardAnchor.className = "tool-card";
        cardAnchor.href = tool.url; 

        // ── 核心云端交互埋点 ──
        // 当用户点击卡片进入工具时，向全新的 tool_prefs 表实时记录/更新时间
        cardAnchor.addEventListener("click", () => {
            db.from("tool_prefs")
              .upsert({ 
                  user_id: user.id, 
                  tool_id: tool.id,
                  last_opened_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
              }, { onConflict: 'user_id,tool_id' }) // 基于联合唯一约束进行精准冲突覆盖
              .then(({ error }) => {
                  if (error) console.error("同步工具打开时间失败:", error);
              });
        });

        // 编织卡片内部的文本区域
        const textWrapper = document.createElement("div");

        const toolTitle = document.createElement("h2");
        
        // 💡 视觉预留：如果是置顶工具，前面会优雅地多出一枚 📌 标志
        const isPinned = prefsMap[tool.id]?.isPinned;
        toolTitle.textContent = `${isPinned ? '📌 ' : ''}${tool.icon} ${tool.name}`; 

        const toolSubtitle = document.createElement("p");
        toolSubtitle.textContent = tool.subtitle; 

        textWrapper.appendChild(toolTitle);
        textWrapper.appendChild(toolSubtitle);

        const menuButton = document.createElement("button");
        menuButton.className = "menu-btn";
        menuButton.textContent = "⋯";

        cardAnchor.appendChild(textWrapper);
        cardAnchor.appendChild(menuButton);

        toolListContainer.appendChild(cardAnchor);
    });
}