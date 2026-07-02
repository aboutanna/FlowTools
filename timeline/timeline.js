/* ==========================================================================
   FlowTools - Timeline Module Core Logic (Phase 3-4 Supabase Cloud Edition)
   ========================================================================== */

let memoData = [];
let selectedFilterDate = null; 

document.addEventListener("DOMContentLoaded", async () => {
    // 🔒 1. 房间通行证双重守卫
    const user = await Auth.requireLogin();
    if (!user) return; // 未登录用户会被安全库拦截

    // 2. 抓取页面元素组件
    const memoInput = document.getElementById('memo-input');
    const backdateInput = document.getElementById('backdate-input');
    const filterDateInput = document.getElementById('filter-date-input');
    const addBtn = document.getElementById('add-btn');
    const filterBtn = document.getElementById('filter-btn');
    const resetBtn = document.getElementById('reset-btn');
    const nodesLayer = document.getElementById('nodes-layer');
    const auditReport = document.getElementById('audit-report');
    const emptyState = document.getElementById('empty-state');

    // 3. 【云端核心 A】联网从 Supabase 加载当前用户的时间轴数据
    async function loadCloudData() {
        try {
            auditReport.innerText = "正在同步云端时间账本...";
            
            // 💡 享受极其强大的 RLS 安全红利：数据库会自动隔离用户数据
            const { data, error } = await db
                .from("timeline_memos")
                .select("id, text, timestamp")
                .order("timestamp", { ascending: false }); // 倒序，时间最新的“后来居上”排在前面 [cite: 487]

            if (error) throw error;
            memoData = data || [];
        } catch (err) {
            console.error("加载云端数据失败:", err);
            auditReport.innerText = "⚠️ 联网同步失败，正在尝试读取本地缓存...";
            // 降级守卫：万一断网，拉取本地暂存作为防御缓冲 
            memoData = JSON.parse(localStorage.getItem('timeline_memos_v3')) || [];
            memoData.sort((a, b) => b.timestamp - a.timestamp);
        }
    }

    function updateAuditText() {
        auditReport.innerText = `Timeline / 相对等距行线沙盒。当前已云端同步 ${memoData.length} 条记录。`;
    }

    // 4. 渲染层：编织无色系 Muji 横线时序
    function renderTimeline() {
        nodesLayer.innerHTML = '';
        emptyState.style.display = 'none';

        let renderedList = memoData;
        if (selectedFilterDate) {
            renderedList = memoData.filter(memo => {
                const [memoDateStr] = parseTimestamp(memo.timestamp);
                return memoDateStr === selectedFilterDate;
            });
        }

        if (renderedList.length === 0) {
            if (selectedFilterDate) emptyState.style.display = 'block';
            updateAuditText();
            return;
        }

        renderedList.forEach((memo) => {
            const [dateStr, timeStr] = parseTimestamp(memo.timestamp);

            const wrapper = document.createElement('div');
            wrapper.className = 'memo-node-wrapper';
            wrapper.id = `node-wrapper-${memo.id}`;

            wrapper.innerHTML = `
                <div class="node-timestamp-block">
                    <span class="ts-date">${dateStr}</span>
                    <span class="ts-time">${timeStr}</span>
                </div>
                <div class="memo-node-skin" id="node-skin-${memo.id}">
                    <div class="node-dot"></div>
                    <div class="node-content-box" id="content-box-${memo.id}">
                        <div class="node-text">${memo.text}</div>
                        <button class="delete-btn" data-id="${memo.id}">抹除</button>
                        <div class="confirm-group" id="confirm-group-${memo.id}">
                            <button class="btn-yes" data-id="${memo.id}">确认</button>
                            <button class="btn-no" data-id="${memo.id}">取消</button>
                        </div>
                    </div>
                </div>
            `;

            nodesLayer.appendChild(wrapper);
        });
        
        updateAuditText();
    }

    // 5. 【云端核心 B】织入新数据并实时同步到 Supabase 
    async function injectMemo() {
        const text = memoInput.value.trim();
        if (!text) return;

        let targetTimestamp = Date.now();
        if (backdateInput.value) {
            targetTimestamp = new Date(backdateInput.value).getTime();
        }

        const newId = 'memo_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

        // 强力挂起输入框按钮，防止短时间内二次点击产生错乱 [cite: 421]
        addBtn.disabled = true;
        addBtn.innerText = "织入中...";

        try {
            // 向 Supabase 云端数据表发起插入指令
            const { error } = await db.from("timeline_memos").insert({
                id: newId,
                user_id: user.id, // 强绑定当前用户
                text: text,
                timestamp: targetTimestamp
            });

            if (error) throw error;

            // 成功后清空输入框，重新拉取并渲染数据
            memoInput.value = '';
            backdateInput.value = '';
            
            await loadCloudData();
            localStorage.setItem('timeline_memos_v3', JSON.stringify(memoData)); // 本地留一份备份作双保险
            renderTimeline();

        } catch (err) {
            console.error("同步至云端失败:", err);
            alert("织入轴线失败，请确认您在 Supabase 中是否为 timeline_memos 表配置好了对应的 RLS Policy 安全策略。");
        } finally {
            addBtn.disabled = false;
            addBtn.innerText = "织入轴线";
        }
    }

    // 6. 【云端核心 C】冒泡拦截，从云端彻底抹除记录 
    nodesLayer.addEventListener('click', async (e) => {
        const targetId = e.target.getAttribute('data-id');
        if (!targetId) return;

        const delBtn = document.querySelector(`#content-box-${targetId} .delete-btn`);
        const confirmGroup = document.getElementById(`confirm-group-${targetId}`);
        const contentBox = document.getElementById(`content-box-${targetId}`);

        if (e.target.classList.contains('delete-btn')) {
            delBtn.style.display = 'none';
            confirmGroup.style.display = 'flex';
            contentBox.style.background = 'rgba(201, 107, 107, 0.08)'; 
            contentBox.style.borderBottomColor = 'var(--danger-red)';
        }

        if (e.target.classList.contains('btn-no')) {
            delBtn.style.display = 'block';
            confirmGroup.style.display = 'none';
            contentBox.style.background = 'transparent';
            renderTimeline(); 
        }

        if (e.target.classList.contains('btn-yes')) {
            const wrapper = document.getElementById(`node-wrapper-${targetId}`);
            if (wrapper) {
                // 先执行纸张优雅消散的动效
                wrapper.classList.add('dissolving');
                
                wrapper.addEventListener('animationend', async () => {
                    try {
                        // 特效结束后，从 Supabase 云端删掉它
                        const { error } = await db
                            .from("timeline_memos")
                            .delete()
                            .eq("id", targetId);

                        if (error) throw error;

                        // 云端删除成功后重刷内存
                        memoData = memoData.filter(memo => memo.id !== targetId);
                        localStorage.setItem('timeline_memos_v3', JSON.stringify(memoData));
                        renderTimeline();
                    } catch (err) {
                        console.error("云端抹除失败:", err);
                        alert("云端删除失败，请刷新重试。");
                        await loadCloudData();
                        renderTimeline();
                    }
                });
            }
        }
    });

    // 7. 日期过滤器绑定
    filterBtn.addEventListener('click', () => {
        if (filterDateInput.value) {
            selectedFilterDate = filterDateInput.value;
            renderTimeline();
        }
    });

    resetBtn.addEventListener('click', () => {
        selectedFilterDate = null;
        filterDateInput.value = '';
        renderTimeline();
    });

    addBtn.addEventListener('click', injectMemo);
    memoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') injectMemo(); });

    // 8. 自动初始化
    await loadCloudData();
    renderTimeline();
});

/**
 * 时间戳格式化辅助函数
 */
function parseTimestamp(ts) {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return [`${yyyy}-${mm}-${dd}`, `${hh}:${min}:${ss}`];
}