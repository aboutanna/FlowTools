/* ==========================================================================
   FlowTools - Workspace Core Logic (Phase 3 - Dynamic Tools Rendering)
   ========================================================================== */

// 优雅引入工具注册中心的数据底座
import Tools from './tools.js';

document.addEventListener("DOMContentLoaded", async () => {

    // 1. 身份状态守卫
    const user = await Auth.requireLogin();
    if (!user) return;

    // 2. 激活动态问候语
    updateGreeting();

    // 3. 动态驱动：根据 tools.js 自动生成并排版卡片
    renderWorkspaceTools();

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
 * 【第三阶段核心】数据驱动渲染中心
 * 遍历 tools.js 中的数组，自动为 Muji 笔记本生成带植物灰绿交互的横线卡片
 */
function renderWorkspaceTools() {
    const toolListContainer = document.getElementById("toolList");
    if (!toolListContainer) return;

    // 清空可能残留的旧 HTML
    toolListContainer.innerHTML = "";

    // 使用真实的现代数据流，一行一行编织卡片
    Tools.forEach(tool => {
        // 创建一根可以点击跳转的行线
        const cardAnchor = document.createElement("a");
        cardAnchor.className = "tool-card";
        cardAnchor.href = tool.url; // 完美绑定去往各功能目录的独立入口

        // 编织卡片内部的文本区域
        const textWrapper = document.createElement("div");

        const toolTitle = document.createElement("h2");
        toolTitle.textContent = `${tool.icon} ${tool.name}`; // 优雅融合 Emoji 与工具名称

        const toolSubtitle = document.createElement("p");
        toolSubtitle.textContent = tool.subtitle; // 渲染我们在 tools.js 里留下的精美副标题

        textWrapper.appendChild(toolTitle);
        textWrapper.appendChild(toolSubtitle);

        // 创建右侧那颗安静内敛的三个点 ⋯ 菜单按钮
        const menuButton = document.createElement("button");
        menuButton.className = "menu-btn";
        menuButton.textContent = "⋯";

        // 将部件整齐地拼装进横线卡片中
        cardAnchor.appendChild(textWrapper);
        cardAnchor.appendChild(menuButton);

        // 最终挂载到 Muji 笔记本大厅的主面板上
        toolListContainer.appendChild(cardAnchor);
    });
}