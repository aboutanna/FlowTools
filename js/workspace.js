/* ==========================================================================
   FlowTools - Workspace Core Logic (Phase 2 - Active Greeting)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    // 1. 身份状态守卫（由于你之前已经登录成功，这里会顺利放行通行证）
    const user = await Auth.requireLogin();
    if (!user) return;

    // 2. 激活动态问候语
    updateGreeting();

    // 3. 绑定优雅退出事件
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await Auth.logout();
        });
    }

});

/**
 * 根据当前系统小时数，自动优雅切换问候语
 * Muji 极简风格：只用最纯净的印刷体文字落地
 */
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = "Good evening."; // 默认傍晚/深夜

    if (hour >= 5 && hour < 12) {
        greeting = "Good morning.";   // 早晨 5点 - 11点59分
    } else if (hour >= 12 && hour < 18) {
        greeting = "Good afternoon."; // 下午 12点 - 17点59分
    }

    const greetingElement = document.getElementById("greeting");
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}