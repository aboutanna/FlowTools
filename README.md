# FlowTools V2.0.1

> 安静、会成长的个人工作台。

---

## 本版本更新（V2.0.0 → V2.0.1）

| 问题 / 需求 | 解决方案 |
|---|---|
| Recovery 圆环无可视化 | 改用真实 SVG 弧形圆环，进度 0→1 顺时针填充 |
| Timeline 无法写入 | 兼容 `created_at` 与 `timestamp` 两种列名，三层回退写入 |
| Muscle 工具移除 | 从 Workspace 和工具列表中删除 |
| Recovery 快捷项可编辑 | 6 个快捷芯片 + `…` 按钮进入编辑器（增/删/改名/改时长，上限 6 个） |
| Recovery 项目排序 | 按恢复百分比降序（Ready 在最上），支持置顶 |
| Recovery 删除确认 | 删除按钮触发确认弹框 |

---

## 工具列表（V2.0.1）

| 工具 | 功能 | 数据源 |
|---|---|---|
| Timeline | 记录发生过的事情 | Supabase `timeline_memos` |
| Recovery | 管理恢复周期，SVG 圆环可视化 | Supabase `recovery_items` / `recovery_logs` |
| Rhythm | 极简节拍器 | 纯前端，无数据库 |

---

## 文件结构

```
FlowTools/
├── index.html              # 登录 / 注册页
├── workspace.html          # 主工作台
│
├── css/
│   ├── theme.css           # 设计 Token（颜色、字体、动画等）
│   ├── base.css            # 基础 Reset + 共享组件（Toast、确认弹框等）
│   └── workspace.css       # Workspace 专属样式
│
├── js/
│   ├── supabase.js         # Supabase 客户端初始化
│   ├── auth.js             # 登录 / 注册 / 登出 / 守卫
│   ├── common.js           # 共享工具函数（Toast、问候语、SVG 圆环、时间格式化）
│   ├── tools.js            # 工具注册中心
│   └── workspace.js        # Workspace 核心逻辑
│
├── timeline/
│   └── index.html          # Timeline 工具
│
├── recovery/
│   └── index.html          # Recovery 工具
│
└── rhythm30/
    └── index.html          # Rhythm 节拍器
```

---

## Supabase 后台配置

### ⚠️ V2.0.1 新增：`recovery_items` 需要 `is_pinned` 列

如果你已经在 V2.0.0 中建了 `recovery_items` 表，只需执行这一条：

```sql
-- 为已有的 recovery_items 表增加 is_pinned 列
alter table recovery_items
  add column if not exists is_pinned boolean default false;
```

---

### 完整表结构（首次部署时执行全部）

#### 1. `tool_prefs`（Workspace 工具偏好）

```sql
create table if not exists tool_prefs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  tool_id        text not null,
  is_pinned      boolean default false,
  last_opened_at timestamptz,
  updated_at     timestamptz default now(),
  unique(user_id, tool_id)
);

alter table tool_prefs enable row level security;

create policy "Users manage own tool_prefs"
  on tool_prefs for all
  using (auth.uid() = user_id);
```

#### 2. `timeline_memos`（时间轴记录）

> **注意**：V1 的表可能用 `timestamp` 作为时间列。V2.0.1 代码会同时兼容 `created_at` 和 `timestamp`，无需修改现有表结构。新建时推荐以下结构：

```sql
create table if not exists timeline_memos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  text       text not null,
  created_at timestamptz default now(),
  timestamp  timestamptz default now()   -- 兼容 V1 的旧列名
);

alter table timeline_memos enable row level security;

create policy "Users manage own timeline_memos"
  on timeline_memos for all
  using (auth.uid() = user_id);
```

#### 3. `recovery_items`（Recovery 核心状态）

```sql
create table if not exists recovery_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  name             text not null,
  category         text default 'other',
  duration_minutes integer not null,
  last_started_at  timestamptz,
  is_pinned        boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table recovery_items enable row level security;

create policy "Users manage own recovery_items"
  on recovery_items for all
  using (auth.uid() = user_id);
```

#### 4. `recovery_logs`（恢复历史流水，供未来热力图使用）

```sql
create table if not exists recovery_logs (
  id         bigint generated always as identity primary key,
  item_id    uuid references recovery_items(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade not null,
  started_at timestamptz default now()
);

alter table recovery_logs enable row level security;

create policy "Users manage own recovery_logs"
  on recovery_logs for all
  using (auth.uid() = user_id);
```

#### 5. `profiles`（用户基础档案）

```sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

alter table profiles enable row level security;

create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = id);
```

---

## Recovery — 功能说明

### SVG 圆环进度可视化

每个恢复项目左侧显示一个实时 SVG 圆环：

| 进度 | 圆环状态 | 颜色 |
|---|---|---|
| 0% | 空心轨道 | 浅灰 |
| 1–49% | 弧形逐渐填充 | 暖棕（`#C5B99A`） |
| 50–99% | 过半填充 | 绿色（`var(--success)`） |
| 100% | 实心圆环 + 中心点 | 深绿（`var(--ring-ready)`） |

圆环每 60 秒重新渲染一次，反映实时进度。

### 快捷项目（Preset Chips）

- 默认 6 个：🏋️ 深蹲 / 🏋️ 卧推 / 🏃 跑步 / 👀 远眺 / 🧘 情绪 / 💻 深度工作
- 点击任意芯片，自动填入添加表单（可修改后加入）
- 点击 `…` 进入编辑模式：可改名、改时长、删除、新增
- **上限 6 个**，超出时新增按钮隐藏
- 数据存储在 `localStorage`（本地设备，不同步云端）

### 项目排序

1. 置顶项目（`⚲`）优先显示
2. 同等级内按恢复百分比降序排列（Ready 100% 在最上方）

### 删除确认

点击 `×` 删除按钮后，会弹出确认框，防止误操作。

---

## Timeline — 写入兼容说明

`addEntry()` 采用三层回退策略，兼容不同版本的 Supabase 表结构：

1. 优先写入 `{ created_at, timestamp }` 两列（兼容所有版本）
2. 若失败，仅写入 `{ created_at }`（新表结构）
3. 若再次失败，仅写入 `{ timestamp }`（V1 旧表结构）

读取时同样兼容，优先按 `created_at` 排序，失败则改用 `timestamp`。

---

## 设计原则

### ① 一屏原则
Workspace 默认不滚动，一眼看到全部工具入口。

### ② 下一步原则
菜单只显示当前可执行操作（置顶 / 取消置顶），不展示状态。

### ③ 安静原则
无红色提醒、无签到、无 KPI、无效率百分比。

### ④ 一致原则
所有工具共用 `css/theme.css`、`css/base.css`，新增工具只需在 `js/tools.js` 添加一条记录。

### ⑤ 职责分离
Workspace 只管工具入口，不写业务表 SQL。

---

## 新增工具指引

1. 在 `js/tools.js` 添加：

```js
{
  id: "habit",
  name: "Habit",
  icon: "◻",
  url: "habit/index.html",
  subtitle: "暂无记录",
  about: "追踪每日习惯。",
  version: "1.0",
  updated: "2026.xx"
}
```

2. 创建 `habit/index.html`，引入：

```html
<link rel="stylesheet" href="../css/theme.css">
<link rel="stylesheet" href="../css/base.css">
```

3. 顶部加返回：

```html
<a href="../workspace.html" class="back-nav">Workspace</a>
```

Workspace 自动出现新工具卡片，无需修改其他文件。

---

## 版本历史

| 版本 | 日期 | 内容 |
|---|---|---|
| V1.0.0 | 2026.07 | 登录、Workspace、Timeline、Memo 骨架 |
| V2.0.0 | 2026.07 | Recovery 模块、Muscle 迁入、Rhythm 迁入、视觉统一 |
| V2.0.1 | 2026.07 | Recovery SVG 圆环、Timeline 写入修复、Muscle 移除、快捷项编辑、删除确认弹框、按进度排序 |

---

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript（ES Module）
- **后端**：Supabase（Auth + PostgreSQL + RLS）
- **部署**：GitHub Pages
- **设计**：Muji 极简风格 — 暖纸底色、无 KPI、最小操作路径
