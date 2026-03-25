# VersionVortex

版本发布管理平台，类似 GitHub Releases，支持版本查看、包下载、管理后台登录、版本维护、Jenkins 一键发版。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 4.x
- React Router v6
- TailwindCSS
- Framer Motion 动画
- Radix UI (Dialog, AlertDialog)

### 后端
- Express + TypeScript
- sql.js (SQLite in WASM)
- JWT 认证
- Multer 文件上传

## 项目结构

```
VersionVortex/
├── frontend/                 # 前端应用
│   └── src/
│       ├── pages/           # 页面组件
│       ├── components/      # 通用组件
│       │   └── ui/         # UI 组件（Dialog, FormDialog, FluidDropdown 等）
│       ├── services/        # API 服务
│       ├── types/           # TypeScript 类型
│       └── lib/             # 工具函数
├── backend/                  # 后端应用
│   └── src/
│       ├── routes/          # 路由（admin.ts, public.ts, jenkins.ts）
│       ├── middleware/      # 中间件（auth.ts 含 requireAdmin）
│       └── db/              # 数据库
├── uploads/                  # 上传文件存储
├── data.db                   # SQLite 数据库
├── start.js                  # 启动脚本
└── package.json              # 根配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

启动后访问：
- 前台：http://localhost:12005
- 后台：http://localhost:12005/admin
- API：http://localhost:12006

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

## 功能特性

### 前台页面
- 版本列表展示（支持按包名筛选，带动画下拉选择）
- 版本详情页（变更日志、文件下载、下载次数统计）
- 数据统计（版本数、软件包数、总下载次数）
- 页面切换动画、滚动位置恢复

### 后台管理
- 用户权限系统（admin / user 两种角色）
- JWT 认证登录
- 版本发布管理（创建 / 编辑 / 删除）
- 软件包管理（每个包可独立配置 Jenkins）
- 文件上传（最大 500MB）
- 数据统计
- **一键发版**: 触发所有已配置 Jenkins 的包，并行构建，实时显示每个包的构建进度，会话持久化到数据库
- 统一 UI 弹框组件（Dialog、FormDialog、SimpleDialog）

### 一键发版流程
1. 在"软件包"标签中，为每个包配置 Jenkins（地址、Job名、用户名、API Token、产物匹配规则）
2. 进入"版本管理"标签，点击顶部 **🚀 一键发版** 按钮
3. 系统自动计算下一个版本号（从最新版本累加）
4. 所有已配置 Jenkins 的包并行触发构建
5. 进度弹窗实时显示每个包的构建状态（触发中 → 构建中 → 下载产物 → 完成）
6. 构建完成后的 zip 产物自动下载并关联为版本附件

## API 接口

### 公开接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/releases | 获取所有正式版本 |
| GET | /api/releases/:tag | 获取版本详情 |
| GET | /api/packages | 获取软件包列表 |
| GET | /api/assets/:id/download | 下载文件 |
| GET | /api/stats | 获取统计数据 |

### 管理接口（需 admin 权限）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/login | 登录 |
| GET | /api/admin/releases | 获取所有版本（含草稿） |
| POST | /api/admin/releases | 创建版本 |
| PUT | /api/admin/releases/:id | 更新版本 |
| DELETE | /api/admin/releases/:id | 删除版本 |
| POST | /api/admin/releases/:id/assets | 上传附件 |
| DELETE | /api/admin/assets/:id | 删除附件 |
| GET | /api/admin/packages | 获取软件包 |
| POST | /api/admin/packages | 创建软件包 |
| DELETE | /api/admin/packages/:id | 删除软件包 |
| GET | /api/admin/stats | 获取统计数据 |
| GET | /api/admin/users | 获取用户列表 |
| POST | /api/admin/users | 创建用户 |
| DELETE | /api/admin/users/:id | 删除用户 |

### Jenkins CI 接口（需 admin 权限）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/jenkins-config/:packageId | 获取某包的 Jenkins 配置 |
| GET | /api/admin/jenkins-configs | 获取所有 Jenkins 配置 |
| POST | /api/admin/jenkins-config | 创建/更新 Jenkins 配置 |
| DELETE | /api/admin/jenkins-config/:packageId | 删除 Jenkins 配置 |
| POST | /api/admin/jenkins-build/trigger-all | 触发所有包并行构建 |
| GET | /api/admin/jenkins-build/session/:sessionId | 获取构建会话状态 |
| GET | /api/admin/jenkins-build/active | 获取当前进行中的构建任务 |
| GET | /api/admin/jenkins-build/history | 获取构建历史 |

> 注意：一键发版任务会话持久化到数据库，刷新页面后自动恢复。

## 构建生产版本

```bash
# 构建前端
npm run build -w frontend

# 构建后端
npm run build -w backend
```

## 测试

项目包含完整的测试基础设施，覆盖前端、后端和 E2E 测试。

### 测试框架

| 层级 | 框架 | 工具 |
|------|------|------|
| 前端单元测试 | Vitest | happy-dom, @testing-library/react |
| 后端单元测试 | Jest | ts-jest, supertest |
| E2E 自动化 | Playwright | @playwright/test |

### 运行测试

```bash
# 运行所有测试（前端 + 后端）
npm test

# 仅运行前端测试
npm run test:frontend

# 仅运行后端测试
npm run test:backend

# 运行 E2E 测试（需 Node 18+）
npm run test:e2e
```

### 测试用例

**前端测试 (35 tests)**
```
frontend/src/__tests__/utils/
├── formatBytes.test.ts       # 文件大小格式化 (6 tests)
├── groupByMonth.test.ts      # 版本按月分组 (8 tests)
└── parseMarkdown.test.ts     # Markdown 解析 (9 tests)

frontend/src/__tests__/components/
├── Timeline.test.tsx         # 时间线组件 (6 tests)
└── FormDialog.test.tsx      # 表单弹框组件 (6 tests)
```

**后端测试 (21 tests)**
```
backend/src/__tests__/utils/
├── incrementVersion.test.ts   # 版本号递增 (11 tests)
└── matchGlob.test.ts        # 文件名模式匹配 (10 tests)
```

**E2E 测试 (10 tests)**
```
e2e/tests/
├── home.spec.ts             # 首页测试 (5 tests)
└── admin.spec.ts           # 管理后台测试 (5 tests)
```

### 测试配置

| 文件 | 用途 |
|------|------|
| `frontend/vitest.config.ts` | Vitest 配置 |
| `frontend/setup-vitest.ts` | 前端测试环境设置 |
| `backend/jest.config.js` | Jest 配置 |
| `backend/setup-jest.ts` | 后端测试环境设置 |
| `e2e/playwright.config.ts` | Playwright E2E 配置 |

## 数据库

**数据库类型**: sql.js (SQLite in WASM)
**数据文件**: `backend/data.db`
**自动保存**: 每 30 秒自动持久化到文件

### 表结构

#### users (用户表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 主键 |
| username | TEXT UNIQUE NOT NULL | 用户名 |
| password_hash | TEXT NOT NULL | 密码（bcrypt加密） |
| role | TEXT DEFAULT 'admin' | 角色 |
| created_at | DATETIME | 创建时间 |

**默认账号**: admin / admin123

#### packages (软件包表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 主键 |
| name | TEXT UNIQUE NOT NULL | 包名 |
| description | TEXT | 描述 |
| homepage | TEXT | 主页/Git仓库地址 |
| created_at | DATETIME | 创建时间 |

#### releases (版本表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 主键 |
| package_id | INTEGER NOT NULL | 外键关联 packages |
| tag_name | TEXT NOT NULL | 版本号（如 1.0.0） |
| title | TEXT | 版本标题 |
| body | TEXT | 变更日志（Markdown格式） |
| is_draft | INTEGER DEFAULT 0 | 是否草稿 |
| is_prerelease | INTEGER DEFAULT 0 | 是否预发布 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**唯一约束**: (package_id, tag_name)

#### assets (下载文件表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 主键 |
| release_id | INTEGER NOT NULL | 外键关联 releases |
| package_id | INTEGER | 关联的包ID |
| name | TEXT NOT NULL | 文件名 |
| size | INTEGER NOT NULL | 文件大小(字节) |
| download_count | INTEGER DEFAULT 0 | 下载次数 |
| file_path | TEXT NOT NULL | 文件路径 |
| created_at | DATETIME | 创建时间 |

#### jenkins_configs (Jenkins配置表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 主键 |
| package_id | INTEGER UNIQUE NOT NULL | 外键关联 packages |
| jenkins_url | TEXT NOT NULL | Jenkins 地址 |
| job_name | TEXT NOT NULL | Job 名称 |
| username | TEXT NOT NULL | Jenkins 用户名 |
| api_token | TEXT NOT NULL | Jenkins API Token |
| artifact_pattern | TEXT DEFAULT '*.zip' | 产物匹配模式 |
| created_at | DATETIME | 创建时间 |

#### build_sessions (构建会话表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PRIMARY KEY | 会话ID（UUID） |
| tag_name | TEXT NOT NULL | 版本号 |
| status | TEXT DEFAULT 'running' | 状态 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

#### build_packages (构建包状态表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 主键 |
| session_id | TEXT NOT NULL | 外键关联 build_sessions |
| package_id | INTEGER NOT NULL | 外键关联 packages |
| package_name | TEXT NOT NULL | 包名 |
| status | TEXT DEFAULT 'pending' | 状态 |
| progress | INTEGER DEFAULT 0 | 进度百分比 |
| build_number | INTEGER | Jenkins 构建号 |
| error | TEXT | 错误信息 |
| artifact_names | TEXT | 产物名称列表 |
| artifact_sizes | TEXT | 产物大小列表 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### ER 关系

```
users (无外键)
packages (1) ←→ (N) releases
packages (1) ←→ (N) jenkins_configs
packages (1) ←→ (N) build_packages
releases (1) ←→ (N) assets
build_sessions (1) ←→ (N) build_packages
```

## 数据初始化脚本

### merge_versions.js

数据合并脚本，用于生成按每半月汇总的版本数据：

```bash
node merge_versions.js
```

**功能说明**:
- 保留现有的 2.1.21 版本
- 删除旧的 1.0.x 单独版本
- 按每半月周期生成 1.0.0 ~ 1.0.13 共 14 个版本
- 每个版本包含三个项目的合并变更日志（PNM-ConfigHub、PNM-InsWeb、PNM-Server）
- 每个版本关联 7 个下载包（来自 2.1.21）

**输出示例**:
```
时间段: 14
1.0.0: ConfigHub(18), InsWeb(7), Server(22)
1.0.1: ConfigHub(11), InsWeb(14), Server(32)
...
最终: 15 版本, 105 assets, 2546 下载
```

## 前端组件说明

### Timeline 版本卡片 Markdown 解析

文件: `frontend/src/components/ui/Timeline.tsx`

`parseMarkdownToText(body)` 函数将 Markdown 格式的变更日志转为友好文本：

- 过滤 `#`、`##`、`###` 标题行
- 列表项 `- xxx` 转为 `• xxx`
- 粗体 `**xxx**` 转为 `xxx`
- `line-clamp-2` 限制显示 2 行
- `min-h-[2.5rem]` 统一卡片高度
