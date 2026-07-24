// 修复 Next.js 16 静态导出在 GitHub Pages 上的路由问题
// Next.js 16 生成 .html 文件而不是目录/index.html
// 此脚本为每个 .html 文件创建对应的目录/index.html 重定向文件

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

function fixRoutes(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      fixRoutes(fullPath);
    } else if (file.endsWith('.html') && file !== 'index.html' && file !== '404.html') {
      // 为每个 .html 文件创建对应的目录/index.html 重定向
      const htmlName = file.replace('.html', '');
      const redirectDir = path.join(dir, htmlName);

      if (!fs.existsSync(redirectDir)) {
        fs.mkdirSync(redirectDir, { recursive: true });
      }

      const redirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>window.location.href = "../${file}";</script>
  <meta http-equiv="refresh" content="0; url=../${file}">
</head>
<body>
  <p>Redirecting to <a href="../${file}">${htmlName}</a>...</p>
</body>
</html>`;

      fs.writeFileSync(path.join(redirectDir, 'index.html'), redirectHtml);
      console.log(`Created redirect: ${path.relative(outDir, redirectDir)}/index.html -> ../${file}`);
    }
  }
}

fixRoutes(outDir);
console.log('Route fix completed!');
