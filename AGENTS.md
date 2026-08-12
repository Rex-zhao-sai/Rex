# AGENTS.md

## 项目概览

设备月度保养记录系统，帮助技术员在移动端/桌面端完成设备每月保养工作。支持设备清单浏览、保养照片上传（before/after 对比）、时间戳记录。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Icons**: lucide-react
- **数据库**: Turso (libSQL/SQLite 边缘数据库)
- **对象存储**: S3 兼容存储（Coze Coding 平台集成）
- **浏览器缓存**: IndexedDB（idb 库）

## 目录结构

```
src/
├── app/
│   ├── layout.tsx                    # 根布局
│   ├── page.tsx                      # 首页 - 设备清单列表
│   ├── globals.css                   # 全局样式
│   ├── admin/migrate/page.tsx        # 照片数据迁移管理页面
│   ├── equipment/[id]/page.tsx       # 设备保养详情页
│   └── api/
│       ├── s3/route.ts               # S3 上传/预签名 URL API
│       └── migrate-photos/route.ts   # 照片数据迁移 API
├── components/
│   ├── PhotoUploader.tsx             # 照片上传组件（before/after）
│   ├── ImagePreview.tsx              # 图片预览组件
│   └── ui/                           # shadcn/ui 组件库
└── lib/
    ├── equipment-data.ts             # 设备清单数据 + 类型定义
    ├── storage.ts                    # 存储工具（含 S3Storage 类）
    ├── turso.ts                      # Turso 数据库客户端
    ├── turso-api.ts                  # Turso 数据访问层
    ├── indexeddb.ts                  # IndexedDB 缓存工具
    ├── cache.ts                      # 缓存策略工具
    ├── s3.ts                         # S3 API 路由调用封装
    ├── s3-direct-upload.ts           # 客户端直传 S3 工具
    └── utils.ts                      # 通用工具函数
```

## 核心功能

### 首页 (`/`)
- 展示全部设备清单（从 Turso 数据库加载）
- 支持搜索过滤
- 显示每月保养完成进度
- 已保养设备显示照片组数和更新时间
- IndexedDB 缓存优先 + Turso 后台更新策略

### 保养详情页 (`/equipment/[id]`)
- 显示设备名称和当月保养记录
- 技术员姓名和备注输入
- before/after 照片对上传（支持相机直接拍摄）
- 可添加多组照片对（+ 按钮）
- 每组照片记录上传实时时间
- 照片上传到 S3 对象存储，数据库仅保存 s3Key 引用
- 保存至 Turso 数据库 + IndexedDB 缓存

### 照片数据迁移 (`/admin/migrate`)
- 清理历史记录中照片的 base64 数据（dataUrl）
- 支持预览模式（dry run）和实际执行
- 对没有 s3Key 的照片自动上传到 S3 后再清理

## 数据存储架构

```
L1 内存缓存 (queryCacheRef) → 页面会话内复用
L2 IndexedDB (60 分钟 TTL)  → 离线可用，避免重复拉取
L3 Turso 数据库              → 持久化结构化数据（photo_pairs 仅存 s3Key）
L4 S3 对象存储               → 图片文件本体
```

### 照片存储策略
- **上传时**：压缩 → 直传 S3 → 获得 s3Key → 同时保留 dataUrl 用于即时预览
- **保存时**：去除 dataUrl，只保存 s3Key 引用到数据库（避免 MB 级冗余）
- **读取时**：优先 IndexedDB 缓存 → Turso 查询 s3Key → 请求预签名 URL 显示

## 关键文件定位

| 需求 | 文件 |
|------|------|
| 添加/修改设备 | `src/lib/equipment-data.ts` |
| 修改数据库查询 | `src/lib/turso-api.ts` |
| 修改首页样式/布局 | `src/app/page.tsx` |
| 修改保养详情页 | `src/app/equipment/[id]/EquipmentDetailClient.tsx` |
| 修改照片上传组件 | `src/components/PhotoUploader.tsx` |
| S3 上传逻辑 | `src/app/api/s3/route.ts` + `src/lib/s3-direct-upload.ts` |
| 照片数据迁移 | `src/app/api/migrate-photos/route.ts` + `src/app/admin/migrate/page.tsx` |
| IndexedDB 缓存 | `src/lib/indexeddb.ts` |

## 构建与测试

```bash
pnpm install        # 安装依赖
pnpm dev            # 开发环境
pnpm build          # 生产构建
pnpm ts-check       # 类型检查
pnpm lint --quiet   # 代码检查
```

## 开发规范

- 仅使用 pnpm 管理依赖
- TypeScript strict 模式，禁止隐式 any
- 客户端组件使用 "use client" 指令
- 移动端优先设计，最大宽度 2xl 居中
- 照片上传到 S3 对象存储，数据库仅保存 s3Key 引用
- 保存记录时必须去除 dataUrl（base64），防止数据库膨胀
