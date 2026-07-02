document.addEventListener("DOMContentLoaded", async () => {

    // 必须登录
    const user = await Auth.requireLogin();

    if (!user) return;

    // 问候语
    updateGreeting();

    // Logout
    document
        .getElementById("logoutBtn")
        .addEventListener("click", async () => {

            await Auth.logout();

        });

});

function updateGreeting() {

    const hour = new Date().getHours();

    let greeting = "Good evening.";

    if (hour >= 5 && hour < 12) {

        greeting = "Good morning.";

    } else if (hour >= 12 && hour < 18) {

        greeting = "Good afternoon.";

    }

    document.getElementById("greeting").textContent = greeting;

}