document.addEventListener("DOMContentLoaded", async () => {

    // 已登录直接进入 Dashboard
    const user = await Auth.currentUser();

    if (user) {
        location.href = "workspace.html";
        return;
    }

    // 获取元素
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");

    // 绑定事件
    loginBtn.addEventListener("click", handleLogin);
    registerBtn.addEventListener("click", handleRegister);

});


// =======================
// 登录
// =======================
async function handleLogin() {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    message.textContent = "";

    if (!email || !password) {

        message.textContent = "请输入邮箱和密码";
        return;

    }

    const { error } = await Auth.login(email, password);

    if (error) {

        message.textContent = error.message;
        return;

    }

    location.href = "workspace.html";

}


// =======================
// 注册
// =======================
async function handleRegister() {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    message.textContent = "";

    if (!email || !password) {

        message.textContent = "请输入邮箱和密码";
        return;

    }

    const { data, error } = await Auth.register(email, password);

    if (error) {

        message.textContent = error.message;
        return;

    }

    if (data.user) {

        await db
            .from("profiles")
            .upsert({
                id: data.user.id
            });

    }

    message.textContent = "注册成功，请登录。";

}