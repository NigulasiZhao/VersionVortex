# VersionManage

版本发布管理平台，类似 GitHub Releases，支持版本查看、包下载、管理后台登录、版本维护、Jenkins 一键发版。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 4.x
- React Router v6
- TailwindCSS

### 后端
- Express + TypeScript
- sql.js (SQLite in WASM)
- JWT 认证
- Multer 文件上传

## 项目结构

```
VersionManage/
├── frontend/                 # 前端应用
│   └── src/
│       ├── pages/           # 页面组件
│       ├── components/      # 通用组件（含登录页动画组件）
│       ├── services/        # API 服务
│       ├── animations/      # 动画组件
│       └── types/           # TypeScript 类型
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
- 版本列表展示（支持按包名筛选）
- 版本详情页（变更日志、文件下载、下载次数统计）
- 数据统计（版本数、软件包数、总下载次数）

### 后台管理
- 用户权限系统（admin / user 两种角色）
- JWT 认证登录
- 版本发布管理（创建 / 编辑 / 删除）
- 软件包管理（每个包可独立配置 Jenkins）
- 文件上传（最大 500MB）
- 数据统计
- **一键发版**: 触发所有已配置 Jenkins 的包，并行构建，实时显示每个包的构建进度

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
| GET | /api/admin/jenkins-build/history | 获取构建历史 |

## 构建生产版本

```bash
# 构建前端
npm run build -w frontend

# 构建后端
npm run build -w backend
```
