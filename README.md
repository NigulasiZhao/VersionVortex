# VersionManage

版本发布管理平台，类似 GitHub Releases，支持版本查看、包下载、管理后台登录、版本维护和包上传。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 4.x
- React Router v6
- TailwindCSS
- Remotion (动画)

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
│       ├── components/      # 通用组件
│       ├── services/        # API 服务
│       ├── animations/      # Remotion 动画
│       └── types/           # TypeScript 类型
├── backend/                  # 后端应用
│   └── src/
│       ├── routes/          # 路由处理
│       ├── middleware/      # 中间件
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
- 前台：http://localhost:5173
- 后台：http://localhost:5173/admin
- API：http://localhost:8080

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

## 功能特性

### 前台页面
- 版本列表展示（支持按包名筛选）
- 版本详情页（变更日志、文件下载）
- Remotion 动画效果

### 后台管理
- JWT 认证登录
- 版本发布管理（创建/编辑/删除）
- 软件包管理
- 文件上传（最大 500MB）
- 数据统计

## API 接口

### 公开接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/releases | 获取所有正式版本 |
| GET | /api/releases/:tag | 获取版本详情 |
| GET | /api/packages | 获取软件包列表 |
| GET | /api/assets/:id/download | 下载文件 |
| GET | /api/stats | 获取统计数据 |

### 管理接口（需登录）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/login | 登录 |
| GET | /api/admin/releases | 获取所有版本 |
| POST | /api/admin/releases | 创建版本 |
| PUT | /api/admin/releases/:id | 更新版本 |
| DELETE | /api/admin/releases/:id | 删除版本 |
| POST | /api/admin/releases/:id/assets | 上传附件 |
| DELETE | /api/admin/assets/:id | 删除附件 |
| GET | /api/admin/packages | 获取软件包 |
| POST | /api/admin/packages | 创建软件包 |
| DELETE | /api/admin/packages/:id | 删除软件包 |

## 构建生产版本

```bash
# 构建前端
npm run build -w frontend

# 构建后端
npm run build -w backend
```
