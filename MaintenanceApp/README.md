# 设备月度保养记录系统 - C# 版本

## 本地运行步骤

### 1. 环境要求

- **Visual Studio 2022**（或 VS Code + C# 扩展）
- **.NET 8.0 SDK**（下载地址：https://dotnet.microsoft.com/download）

### 2. 打开项目

1. 打开 Visual Studio
2. 点击 **文件** → **打开** → **项目/解决方案**
3. 选择 `MaintenanceApp.sln` 文件

### 3. 配置 Supabase 连接

编辑 `appsettings.json`，填入你的 Supabase 信息：

```json
{
  "Supabase": {
    "Url": "https://cpkqoubbwjvchbmdsish.supabase.co",
    "AnonKey": "你的anon_key"
  }
}
```

### 4. 运行项目

- **Visual Studio**：按 `F5` 或点击 **运行** 按钮
- **命令行**：
  ```bash
  cd MaintenanceApp
  dotnet restore
  dotnet run
  ```

### 5. 访问应用

浏览器打开：`https://localhost:5001` 或 `http://localhost:5000`

---

## 项目结构

```
MaintenanceApp/
├── Models/              # 数据模型
│   ── Models.cs
├── Services/            # 业务逻辑
│   └── SupabaseService.cs
├── Controllers/         # API 控制器
│   ├── EquipmentController.cs
│   └── RecordsController.cs
├── Pages/               # Razor Pages 前端
│   ├── Index.cshtml     # 首页 - 设备列表
│   └── Equipment/
│       ── Detail.cshtml # 保养详情页
── wwwroot/             # 静态文件
│   ├── css/site.css
│   └── js/site.js
├── Program.cs           # 程序入口
├── appsettings.json     # 配置文件
└── MaintenanceApp.sln   # 解决方案文件
```

---

## 功能说明

- **首页**：显示所有设备列表，支持搜索
- **保养详情页**：上传 before/after 照片，记录保养信息
- **角色切换**：首页可切换管理端/操作端
- **数据持久化**：使用 Supabase 云端存储

---

## 发布部署

### 发布到文件夹

```bash
dotnet publish -c Release -o ./publish
```

### 部署到 IIS

1. 将 publish 文件夹复制到 IIS 网站目录
2. 在 IIS 中创建应用程序池（.NET CLR 版本：无托管代码）
3. 配置站点绑定

### 部署为 Windows 服务

```bash
dotnet publish -c Release
sc create MaintenanceApp binPath= "C:\path\to\MaintenanceApp.exe"
sc start MaintenanceApp
```
