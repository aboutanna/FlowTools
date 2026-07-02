document.addEventListener("DOMContentLoaded", async () => {

    // 必须登录
    const user = await Auth.requireLogin();

    if (!user) {
        return;
    }

    // 显示欢迎信息
    document.getElementById("welcome").textContent =
        `欢迎：${user.email}`;

    // Timeline
    document
        .getElementById("timelineBtn")
        .addEventListener("click", () => {

            location.href = "timeline/index.html";

        });

    // 退出
    document
        .getElementById("logoutBtn")
        .addEventListener("click", async () => {

            await Auth.logout();

        });

});