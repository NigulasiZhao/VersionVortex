# VersionVortex

版本发布管理平台，支持版本查看、包下载、管理后台登录、版本维护、Jenkins 一键发版。

## 技术栈

### 前端
- React
- TypeScript
- Vite
- TailwindCSS
- Framer Motion
- Radix UI

### 后端
- Express
- TypeScript
- sql.js
- JWT
- Multer

## 项目结构

```
VersionVortex/
├── frontend/                 # 前端应用
│   └── src/
│       ├── pages/           # 页面组件
│       ├── components/      # 通用组件
│       │   └── ui/         # UI 组件（Dialog, FormDialog, FluidDropdown, TreeView 等）
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

## 使用说明

### Jenkins 配置要求

在配置一键发版前，需确保 Jenkins Job 满足以下条件：

#### 1. 参数化构建
Job 必须配置一个名为 `version` 的字符串参数，用于接收版本号：

- 进入 Jenkins → Job → 配置 → 勾选"参数化构建过程"
- 添加字符串参数，名称为 `version`

#### 2. API Token
需要为 Jenkins 用户生成 API Token：

- Jenkins → 用户 → 设置 → API Token → 添加新 Token
- 记录用户名和 Token，后续配置需要用到

#### 3. 产物设置
确保 Job 的产物路径匹配规则正确：

- 构建产物（如 `*.zip`）需要发布到 Jenkins 工作空间
- artifact_pattern 支持通配符，如 `*.zip`、`app-*.zip`、`dist/**/*`

### 软件包管理

#### 添加软件包

1. 进入管理后台 → 软件包管理
2. 点击"添加软件包"
3. 填写信息：
   - **名称**：如 `PNM-ConfigHub`
   - **别名**：可选，用于在前台显示（如 PNM）
   - **描述**：软件包说明
   - **主页/Git 仓库**：代码仓库地址

#### 配置 Jenkins

1. 在软件包列表中，点击某包的"Jenkins 配置"按钮
2. 填写配置：
   - **Jenkins 地址**：如 `http://jenkins.example.com:8080`
   - **Job 名称**：如 `PNM-ConfigHub-Build`
   - **用户名**：Jenkins 用户名
   - **API Token**：Jenkins 用户 API Token
   - **产物匹配规则**：如 `*.zip`，用于匹配构建产物

#### 发版流程

系统支持两种发版方式：

**统一发版（一键发版）**
1. 进入版本管理页面，点击顶部"🚀 一键发版"按钮
2. 在弹窗中选择要发版的软件包（或默认全选所有已配置 Jenkins 的包）
3. 系统自动计算下一个版本号（从最新版本累加）
4. 所有选中包并行触发 Jenkins 构建
5. 进度弹窗实时显示每个包的构建状态
6. 构建完成后，所有包使用同一版本号，创建统一的版本记录

**单包发版**
1. 进入软件包管理页面
2. 点击某包的"🚀 发版"按钮
3. 该包独立触发 Jenkins 构建，使用该包的下一版本号

#### 版本号迭代规则

版本号采用语义化版本 (SemVer)，格式为 `主版本.次版本.补丁版本`：

| 发版方式 | 迭代规则 | 示例 |
|---------|---------|------|
| 统一发版 | 次版本 +1，补丁归零 | `1.0.0` → `1.1.0` → `1.2.0` |
| 单包发版 | 补丁 +1 | `1.0.0` → `1.0.1` → `1.0.2` |

**版本号计算方式**：
- 统一发版：取所有选中包中的**最高版本**然后次版本 +1（补丁归零）
- 单包发版：取该包的**最新版本**然后补丁 +1

**进位规则**：当某位数字到顶后自动进位，例如 `1.9.0` → `2.0.0`（统一发版）或 `1.0.9` → `1.0.10`（单包发版）

#### 统一发版编辑

统一发版的版本在版本列表中显示"🎯 统一发版"标签。编辑时点击"编辑分组"可批量修改：
- 标题、变更日志
- 草稿/正式状态
- 预发布状态

#### 版本维护

- **编辑版本**：修改版本标题、变更日志
- **编辑分组**：统一发版可批量编辑所有包的版本信息
- **上传附件**：手动上传构建产物
- **删除版本**：同时删除关联的附件文件
- **草稿模式**：可先保存为草稿，确认后再发布

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
- **多选批量下载**：支持复选框选择多个文件，点击"下载已选"一键下载
- **树形分组显示**：下载列表按软件包分组展示，可展开/折叠
- 数据统计（版本数、软件包数、总下载次数）
- 页面切换动画、滚动位置恢复

### 后台管理
- 用户权限系统（admin / user 两种角色）
- JWT 认证登录
- 版本发布管理（创建 / 编辑 / 删除 / 批量编辑）
- 软件包管理（支持别名，每个包可独立配置 Jenkins）
- 文件上传（最大 500MB）
- 数据统计
- **统一发版**: 触发多个包并行构建，共用同一版本号，实时显示每个包的构建进度
- **单包发版**: 在软件包列表中单独触发某包的构建
- 统一 UI 弹框组件（Dialog、FormDialog、SimpleDialog）
- 管理后台列表交错动画、Tab 切换 3D 翻转动画

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
| PUT | /api/admin/releases/:id | 更新单包版本 |
| PUT | /api/admin/releases/unified/:sessionId | 批量更新统一发版的所有版本 |
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
| POST | /api/admin/jenkins-build/unified-release | 触发统一发版（可选指定包 IDs） |
| POST | /api/admin/jenkins-build/single-release | 触发单包发版 |
| GET | /api/admin/jenkins-build/session/:sessionId | 获取构建会话状态 |
| GET | /api/admin/jenkins-build/active | 获取当前进行中的构建任务 |
| GET | /api/admin/jenkins-build/history | 获取构建历史 |

> 注意：发版任务会话持久化到数据库，刷新页面后自动恢复。

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
| alias | TEXT | 别名（如 PNM 别名显示） |
| description | TEXT | 描述 |
| homepage | TEXT | 主页/Git仓库地址 |
| created_at | DATETIME | 创建时间 |

#### releases (版本表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 主键 |
| tag_name | TEXT NOT NULL | 版本号（如 1.0.0） |
| title | TEXT | 版本标题 |
| body | TEXT | 变更日志（Markdown格式） |
| is_draft | INTEGER DEFAULT 0 | 是否草稿 |
| is_prerelease | INTEGER DEFAULT 0 | 是否预发布 |
| release_type | TEXT DEFAULT 'single' | 发版类型（single/unified） |
| unified_session_id | TEXT | 统一发版会话 ID（统一发版时所有包共享同一 ID） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**说明**: releases 为主表，版本通过 tag_name 与 assets 关联（非外键）

#### assets (下载文件表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 主键 |
| package_id | INTEGER NOT NULL | 外键关联 packages |
| name | TEXT NOT NULL | 文件名 |
| size | INTEGER NOT NULL | 文件大小(字节) |
| download_count | INTEGER DEFAULT 0 | 下载次数 |
| file_path | TEXT NOT NULL | 文件路径 |
| created_at | DATETIME | 创建时间 |

**说明**: assets 通过文件名中的版本号（tag_name）匹配关联到 releases

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
packages (1) ←→ (N) assets
packages (1) ←→ (N) jenkins_configs
packages (1) ←→ (N) build_packages
releases ←→ (N) assets (通过 tag_name 匹配，非外键)
releases (1) ←→ (N) unified_session_id (同一统一发版)
build_sessions (1) ←→ (N) build_packages
```

**说明**: releases 与 assets 通过文件名中的版本号 tag_name 关联（软关联），非数据库外键约束。
