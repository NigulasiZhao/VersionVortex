# VersionManage - 版本发布管理平台

## 项目概述
类似 GitHub Releases 的版本管理平台，支持版本查看、包下载、管理后台登录、版本维护和包上传。

## 技术选型

| 层级 | 技术 |
|------|------|
| 前端框架 | React + TypeScript + Vite 4.x |
| 路由 | React Router v6 |
| 样式 | TailwindCSS (dark theme, GitHub 风格) |
| 动画 | Remotion (v4.0.437) |
| 后端 | Express + TypeScript |
| 数据库 | SQLite (sql.js - 纯 JS WASM 实现) |
| 认证 | JWT (7天有效期) |
| 文件上传 | Multer (支持最大 500MB) |
| 包管理 | npm workspaces |

## 功能模块

### 前台页面 (Public)
- **Releases 列表页** (`/`) - 展示所有版本，支持按包名筛选
  - Remotion 动画 Hero 区域（数字滚动动画）
  - Remotion 动画版本卡片列表预览
  - 静态版本列表（带入场动画）
- **版本详情页** (`/releases/:tag`) - 查看版本的详细信息、变更日志、支持的文件下载
- **快速下载** - 一键下载对应平台的安装包

### 后台管理 (Admin)
- **登录页** (`/admin/login`) - JWT 认证登录
- **仪表盘** (`/admin`) - 统计数据、版本列表、软件包管理
- **版本编辑** (`/admin/releases/new`, `/admin/releases/:id/edit`)
  - 创建/编辑版本（版本号、标题、变更日志 Markdown、预发布/草稿状态）
  - 上传附件文件（自动记录文件大小）
  - 删除附件

## 启动方式

```bash
# 安装依赖
npm install

# 启动项目
npm run dev
```

访问地址：
- 前台：http://localhost:5173
- 后台：http://localhost:5173/admin
- API：http://localhost:3001

默认后台账号：`admin` / `admin123`

## API 路由

### 公开 API
- `GET /api/releases` - 获取所有正式版本
- `GET /api/releases/:tag` - 获取单个版本详情
- `GET /api/packages` - 获取所有包列表
- `GET /api/packages/:name/releases` - 获取某包的所有版本
- `GET /api/assets/:id/download` - 下载文件
- `GET /api/stats` - 获取统计数据
- `GET /api/health` - 健康检查

### 管理 API (需登录，Header: `Authorization: Bearer <token>`)
- `POST /api/admin/login` - 登录
- `GET /api/admin/releases` - 获取所有版本（含草稿）
- `POST /api/admin/releases` - 创建版本
- `PUT /api/admin/releases/:id` - 更新版本
- `DELETE /api/admin/releases/:id` - 删除版本（含文件清理）
- `POST /api/admin/releases/:id/assets` - 上传附件
- `DELETE /api/admin/assets/:id` - 删除附件
- `GET /api/admin/packages` - 获取所有包
- `POST /api/admin/packages` - 创建包
- `DELETE /api/admin/packages/:id` - 删除包
- `GET /api/admin/stats` - 后台统计数据
