/* ==========================================================================
   FlowTools - Workspace Core Logic (Phase 5 - Cloud Pinning System)
   ========================================================================= */

import Tools from './tools.js';

document.addEventListener("DOMContentLoaded", async () => {

    // 1. 身份状态守卫
    const user = await Auth.requireLogin();
    if (!user) return;

    // 2. 激活动态问候语
    updateGreeting();

    // 3. 【第五阶段核心】全加载并激活带 Pin 交互的云端数据排版
    await renderWorkspaceToolsFromPrefs(user);

    // 4. 绑定安全退出事件
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await Auth.logout();
        });
    }

    // 点击页面任意空白处，悄悄收起可能打开的置顶小菜单
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
 * 【第五阶段核心】对接 tool_prefs 表的“Pin + 时间”双轨排序渲染中心
 */
async function renderWorkspaceToolsFromPrefs(user) {
    const toolListContainer = document.getElementById("toolList");
    if (!toolListContainer) return;

    toolListContainer.innerHTML = "<div>Loading Muji notebook...</div>";

    let prefsMap = {};

    try {
        // A. 联网向 Supabase 索要当前用户的全部置顶与时间记录
        const { data, error } = await db
            .from("tool_prefs")
            .select("tool_id, is_pinned, last_opened_at")
            .eq("user_id", user.id);

        if (data) {
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

    // B. 【黄金双轨排序】：置顶永远无条件压制时间，时间只在同状态内比大小
    const sortedTools = [...Tools].sort((a, b) => {
        const prefA = prefsMap[a.id] || { isPinned: false, lastOpened: 0 };
        const prefB = prefsMap[b.id] || { isPinned: false, lastOpened: 0 };

        if (prefA.isPinned !== prefB.isPinned) {
            return prefB.isPinned - prefA.isPinned; // true (1) 比 false (0) 靠前
        }
        return prefB.lastOpened - prefA.lastOpened; // 最近打开的靠前
    });

    // C. 编织新卡片
    sortedTools.forEach(tool => {
        // 为了防止菜单溢出，加一层包裹容器
        const cardContainer = document.createElement("div");
        cardContainer.className = "card-container";

        const cardAnchor = document.createElement("a");
        cardAnchor.className = "tool-card";
        cardAnchor.href = tool.url; 

        // 点击工具卡片主体（排除菜单按钮）触发时间戳踩点
        cardAnchor.addEventListener("click", async (e) => {
            // 如果点到的是三个点，不要触发页面跳转
            if (e.target.classList.contains("menu-btn")) return;
            
            e.preventDefault(); 
            try {
                const currentPinned = prefsMap[tool.id]?.isPinned || false;
                await db.from("tool_prefs")
                  .upsert({ 
                      user_id: user.id, 
                      tool_id: tool.id,
                      is_pinned: currentPinned, // 保持原有的置顶状态不被冲掉
                      last_opened_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                  }, { onConflict: 'user_id,tool_id' });
            } catch (error) {
                console.error("同步工具打开时间失败:", error);
            } finally {
                window.location.href = tool.url;
            }
        });

        // 编织卡片内文字区域
        const textWrapper = document.createElement("div");
        const toolTitle = document.createElement("h2");
        
        const isPinned = prefsMap[tool.id]?.isPinned;
        toolTitle.textContent = `${isPinned ? '⚲ ' : ''}${tool.icon} ${tool.name}`; 

        const toolSubtitle = document.createElement("p");
        toolSubtitle.textContent = tool.subtitle; 

        textWrapper.appendChild(toolTitle);
        textWrapper.appendChild(toolSubtitle);

        // 创建右侧那颗安静内敛的三个点 ⋯ 菜单按钮
        const menuButton = document.createElement("button");
        menuButton.className = "menu-btn";
        menuButton.textContent = "⋯";

        // ── 【第五阶段核心交互】弹出菜单与云端 Pin 状态切换 ──
        menuButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation(); // 阻断点击传递，防止被最外层直接关闭

            // 如果已经有菜单打开了，先删掉它
            const existingMenu = document.querySelector(".pin-menu");
            if (existingMenu) existingMenu.remove();

            // 生成轻量纸面小菜单
            const pinMenu = document.createElement("div");
            pinMenu.className = "pin-menu";

            const pinActionItem = document.createElement("button");
            pinActionItem.className = "menu-item";
            // 聪明识别当前状态，动态提供切换文本
            pinActionItem.textContent = isPinned ? "Unpin (取消置顶)" : "Pin (置顶)";

            // 绑定真正的云端改值动作
            pinActionItem.addEventListener("click", async (actionEvent) => {
                actionEvent.stopPropagation();
                pinMenu.remove(); // 迅速收起菜单

                const currentOpened = prefsMap[tool.id]?.lastOpened ? new Date(prefsMap[tool.id].lastOpened).toISOString() : null;

                // 直接命令 Supabase 翻转当前的置顶状态
                const { error } = await db.from("tool_prefs")
                    .upsert({
                        user_id: user.id,
                        tool_id: tool.id,
                        is_pinned: !isPinned, // 状态直接取反！
                        last_opened_at: currentOpened, // 锁定原有的时间戳
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id,tool_id' });

                if (!error) {
                    // 云端改完后，无刷实时重新排版整个大厅！
                    await renderWorkspaceToolsFromPrefs(user);
                } else {
                    console.error("置顶操作失败:", error);
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