/* ==========================================================================
   FlowTools - Timeline Module Core Logic (Phase 1-2 Security Box)
   ========================================================================== */

let memoData = [];
let selectedFilterDate = null; 

document.addEventListener("DOMContentLoaded", async () => {
    // 🔒 1. 房间通行证双重守卫
    const user = await Auth.requireLogin();
    if (!user) return; // 未登录用户会被安全库当场拦截抛回主页

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

    // 3. 数据层：倒序重排（后来居上）
    function loadAndSortData() {
        memoData = JSON.parse(localStorage.getItem('timeline_memos_v3')) || [];
        memoData.sort((a, b) => b.timestamp - a.timestamp);
    }
    loadAndSortData();

    function runTimeAudit() {
        auditReport.innerText = "Timeline / 相对等距行线沙盒。";
    }

    // 4. 渲染层：编织横线时序
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
    }

    // 5. 交互层：织入新数据
    function injectMemo() {
        const text = memoInput.value.trim();
        if (!text) return;

        let targetTimestamp = Date.now();
        if (backdateInput.value) {
            targetTimestamp = new Date(backdateInput.value).getTime();
        }

        const newMemo = {
            id: 'memo_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
            text: text,
            timestamp: targetTimestamp
        };

        memoData.push(newMemo);
        localStorage.setItem('timeline_memos_v3', JSON.stringify(memoData));
        
        memoInput.value = '';
        backdateInput.value = '';
        loadAndSortData();
        renderTimeline();
    }

    // 6. 核心交互：冒泡拦截抹除与二次确认
    nodesLayer.addEventListener('click', (e) => {
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
                wrapper.classList.add('dissolving');
                wrapper.addEventListener('animationend', () => {
                    memoData = memoData.filter(memo => memo.id !== targetId);
                    localStorage.setItem('timeline_memos_v3', JSON.stringify(memoData));
                    loadAndSortData();
                    renderTimeline();
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

    // 8. 初始化装配启动
    runTimeAudit();
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