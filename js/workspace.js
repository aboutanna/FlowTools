/* ==========================================================================
   FlowTools - Workspace Core Logic (Phase 4 - Supabase Last Opened)
   ========================================================================== */

import Tools from './tools.js';

document.addEventListener("DOMContentLoaded", async () => {

    // 1. 身份状态守卫（获取当前登录的真用户）
    const user = await Auth.requireLogin();
    if (!user) return;

    // 2. 激活动态问候语
    updateGreeting();

    // 3. 【第四阶段核心】从 Supabase 读取数据并自动排版卡片
    await renderWorkspaceToolsFromSupabase(user);

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
 * 【第四阶段真数据核心】对接 Supabase 排序渲染中心
 */
async function renderWorkspaceToolsFromSupabase(user) {
    const toolListContainer = document.getElementById("toolList");
    if (!toolListContainer) return;

    toolListContainer.innerHTML = "<div>Loading Muji notebook...</div>";

    let supabaseLastOpened = {};

    try {
        // A. 联网向 Supabase 的 profiles 表索要当前用户的 last_opened 记录
        const { data, error } = await db
            .from("profiles")
            .select("last_opened")
            .eq("id", user.id)
            .single();

        if (data && data.last_opened) {
            supabaseLastOpened = data.last_opened; // 成功拿到云端时间数据
        }
    } catch (err) {
        console.error("读取云端排序失败，降级使用默认排序:", err);
    }

    toolListContainer.innerHTML = "";

    // B. 根据云端时间戳大小进行聪明排序
    const sortedTools = [...Tools].sort((a, b) => {
        const timeA = supabaseLastOpened[a.id] || 0;
        const timeB = supabaseLastOpened[b.id] || 0;
        return timeB - timeA; // 最近打开的排在最上面
    });

    // C. 开始一行一行编织排序后的新卡片
    sortedTools.forEach(tool => {
        const cardAnchor = document.createElement("a");
        cardAnchor.className = "tool-card";
        cardAnchor.href = tool.url; 

        // ── 核心云端交互埋点 ──
        // 当用户点击这张卡片时，不仅要跳走，还要立刻把这一秒的时间戳异步同步回 Supabase 云端数据库
        cardAnchor.addEventListener("click", async (e) => {
            // 更新本地数据准备上传
            supabaseLastOpened[tool.id] = Date.now();
            
            // 悄悄发送给 Supabase，不阻碍用户点击跳转的流畅感
            db.from("profiles")
              .upsert({ 
                  id: user.id, 
                  last_opened: supabaseLastOpened 
              })
              .then(({ error }) => {
                  if (error) console.error("同步云端时间失败:", error);
              });
        });

        // 编织卡片内部的文本区域
        const textWrapper = document.createElement("div");

        const toolTitle = document.createElement("h2");
        toolTitle.textContent = `${tool.icon} ${tool.name}`; 

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