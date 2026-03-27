/**
 * 数据整理脚本 - 重新构建演示数据
 * 运行方式: node reorganize_data.js
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

async function main() {
  console.log('开始整理数据...\n');

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  // 1. 获取现有 packages
  const packages = db.exec('SELECT * FROM packages');
  const pkgList = [];
  if (packages.length > 0) {
    const columns = packages[0].columns;
    packages[0].values.forEach(row => {
      const pkg = {};
      columns.forEach((col, i) => pkg[col] = row[i]);
      pkgList.push(pkg);
    });
  }
  console.log('现有软件包:', pkgList.map(p => p.name));

  // 2. 清除旧数据
  console.log('\n清除旧数据...');
  db.run('DELETE FROM assets');
  db.run('DELETE FROM releases');

  function getLastInsertId() {
    const result = db.exec('SELECT last_insert_rowid() as id');
    return result[0].values[0][0];
  }

  function createRelease(pkgId, tagName, title, body, isDraft, isPrerelease, releaseType, unifiedSessionId, createdAt) {
    db.run(
      'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, release_type, unified_session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [pkgId, tagName, title, body, isDraft, isPrerelease, releaseType, unifiedSessionId, createdAt]
    );
    return getLastInsertId();
  }

  function createAsset(releaseId, pkgId, name, size, downloads) {
    db.run('INSERT INTO assets (release_id, package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?, ?)',
      [releaseId, pkgId, name, size, downloads, 'sample/sample.zip']);
  }

  // ============ 创建数据 ============

  // 1. v1.0.0 统一发版 (1月5日) - 初始版本
  const s1 = 'unified-20260105';
  console.log('\n创建 v1.0.0 统一发版...');
  for (const pkg of pkgList) {
    const body = `## 首发版本\n\n- 正式发布初始版本\n- 包含核心功能模块\n- 支持基础的版本管理`;
    const rid = createRelease(pkg.id, 'v1.0.0', `${pkg.name} v1.0.0 首发版`, body, 0, 0, 'unified', s1, '2026-01-05 10:00:00');
    createAsset(rid, pkg.id, `${pkg.name}-1.0.0.zip`, 35000000 + Math.random() * 10000000, 320);
  }

  // 2. v1.0.1 单包发版 (1月12日) - 仅 InsWeb 热修复
  const insWeb = pkgList.find(p => p.name === 'PNM-InsWeb');
  if (insWeb) {
    console.log('创建 v1.0.1 单包发版...');
    const rid = createRelease(insWeb.id, 'v1.0.1', `${insWeb.name} v1.0.1 热修复`, `## 修复\n\n- 修复了首页加载白屏的问题\n- 修复了登录页样式错位\n\n## 改进\n\n- 优化了首屏加载速度`, 0, 0, 'single', null, '2026-01-12 14:30:00');
    createAsset(rid, insWeb.id, `${insWeb.name}-1.0.1.zip`, 34200000, 89);
  }

  // 3. v1.1.0 统一发版 (1月20日)
  const s3 = 'unified-20260120';
  console.log('创建 v1.1.0 统一发版...');
  for (const pkg of pkgList) {
    let body = '';
    if (pkg.name === 'PNM-Server') {
      body = `## 新增功能\n\n- 新增用户管理模块\n- 新增权限控制\n\n## 改进\n\n- 数据库查询优化\n- API 响应速度提升`;
    } else if (pkg.name === 'PNM-ConfigHub') {
      body = `## 新增功能\n\n- 新增配置分组功能\n- 支持配置导入导出\n\n## 改进\n\n- 配置文件加载速度提升 30%`;
    } else if (pkg.name === 'PNM-InsWeb') {
      body = `## 新增功能\n\n- 新增用户头像上传\n- 新增个人设置页面\n\n## 改进\n\n- 优化了表单验证逻辑`;
    }
    const rid = createRelease(pkg.id, 'v1.1.0', `${pkg.name} v1.1.0 功能更新`, body, 0, 0, 'unified', s3, '2026-01-20 10:00:00');
    createAsset(rid, pkg.id, `${pkg.name}-1.1.0.zip`, 38000000 + Math.random() * 10000000, 245);
  }

  // 4. v1.1.1 单包发版 (2月3日) - 仅 ConfigHub 热修复
  const configHub = pkgList.find(p => p.name === 'PNM-ConfigHub');
  if (configHub) {
    console.log('创建 v1.1.1 单包发版...');
    const rid = createRelease(configHub.id, 'v1.1.1', `${configHub.name} v1.1.1 补丁`, `## 修复\n\n- 修复了配置保存后丢失的问题\n- 修复了分组排序异常\n\n## 改进\n\n- 增强了配置校验规则`, 0, 0, 'single', null, '2026-02-03 09:15:00');
    createAsset(rid, configHub.id, `${configHub.name}-1.1.1.zip`, 36500000, 67);
  }

  // 5. v1.2.0 统一发版 (2月10日)
  const s5 = 'unified-20260210';
  console.log('创建 v1.2.0 统一发版...');
  for (const pkg of pkgList) {
    let body = '';
    if (pkg.name === 'PNM-Server') {
      body = `## 新增功能\n\n- 新增操作日志记录\n- 支持审计追踪\n\n## 改进\n\n- 安全策略增强\n- 优化了 Session 管理`;
    } else if (pkg.name === 'PNM-ConfigHub') {
      body = `## 新增功能\n\n- 新增配置对比功能\n- 支持历史版本回滚\n\n## 改进\n\n- 界面交互优化`;
    } else if (pkg.name === 'PNM-InsWeb') {
      body = `## 新增功能\n\n- 新增数据导出功能\n- 支持 Excel 导出\n\n## 改进\n\n- 表格性能优化`;
    }
    const rid = createRelease(pkg.id, 'v1.2.0', `${pkg.name} v1.2.0 功能增强`, body, 0, 0, 'unified', s5, '2026-02-10 10:00:00');
    createAsset(rid, pkg.id, `${pkg.name}-1.2.0.zip`, 42000000 + Math.random() * 10000000, 189);
  }

  // 6. v2.0.0 统一发版 (2月20日) - 大版本更新
  const s6 = 'unified-20260220';
  console.log('创建 v2.0.0 统一发版...');
  for (const pkg of pkgList) {
    let body = '';
    if (pkg.name === 'PNM-Server') {
      body = `## 重大更新\n\n- 全新架构设计\n- 支持微服务部署\n- 新增消息队列集成\n- 支持 Docker 部署\n\n## 改进\n\n- 性能提升 50%\n- 稳定性大幅增强\n\n## 修复\n\n- 修复了高并发下的内存泄漏`;
    } else if (pkg.name === 'PNM-ConfigHub') {
      body = `## 重大更新\n\n- 配置中心重构\n- 支持集群配置同步\n- 新增配置变更审计\n\n## 改进\n\n- 配置推送速度提升 3 倍\n- 界面全新改版`;
    } else if (pkg.name === 'PNM-InsWeb') {
      body = `## 重大更新\n\n- 全新 UI 设计\n- 支持暗色模式\n- 新增多语言支持\n\n## 改进\n\n- 整体视觉升级\n- 交互体验优化`;
    }
    const rid = createRelease(pkg.id, 'v2.0.0', `${pkg.name} v2.0.0 重大更新`, body, 0, 0, 'unified', s6, '2026-02-20 10:00:00');
    createAsset(rid, pkg.id, `${pkg.name}-2.0.0.zip`, 52000000 + Math.random() * 15000000, 456);
  }

  // 7. v2.0.1 单包发版 (2月25日) - 仅 Server 热修复
  const server = pkgList.find(p => p.name === 'PNM-Server');
  if (server) {
    console.log('创建 v2.0.1 单包发版...');
    const rid = createRelease(server.id, 'v2.0.1', `${server.name} v2.0.1 热修复`, `## 紧急修复\n\n- 修复了 v2.0.0 中服务启动失败的问题\n- 修复了数据库连接池耗尽的问题\n- 修复了特定条件下 API 超时\n\n## 改进\n\n- 优化了连接池回收机制`, 0, 0, 'single', null, '2026-02-25 16:45:00');
    createAsset(rid, server.id, `${server.name}-2.0.1.zip`, 51800000, 178);
  }

  // 8. v2.1.0 统一发版 (3月10日) - 功能增强
  const s8 = 'unified-20260310';
  console.log('创建 v2.1.0 统一发版...');
  for (const pkg of pkgList) {
    let body = '';
    if (pkg.name === 'PNM-Server') {
      body = `## 新增功能\n\n- 新增服务监控面板\n- 新增日志聚合功能\n- 新增告警通知\n\n## 改进\n\n- 健康检查机制优化\n- 提升了定时任务稳定性`;
    } else if (pkg.name === 'PNM-ConfigHub') {
      body = `## 新增功能\n\n- 新增配置模板功能\n- 支持配置对比\n- 新增配置回滚\n\n## 改进\n\n- 搜索性能优化\n- 提升了大批量配置的加载速度`;
    } else if (pkg.name === 'PNM-InsWeb') {
      body = `## 新增功能\n\n- 新增数据可视化图表\n- 支持自定义仪表盘\n- 新增报告导出功能\n\n## 改进\n\n- 图表渲染性能提升 40%`;
    }
    const rid = createRelease(pkg.id, 'v2.1.0', `${pkg.name} v2.1.0 功能增强`, body, 0, 0, 'unified', s8, '2026-03-10 10:00:00');
    createAsset(rid, pkg.id, `${pkg.name}-2.1.0.zip`, 55000000 + Math.random() * 15000000, 234);
  }

  // 9. v2.2.0-beta 预发布统一发版 (3月26日)
  const s9 = 'unified-20260326-beta';
  console.log('创建 v2.2.0-beta 预发布...');
  for (const pkg of pkgList) {
    const body = `## Beta 测试版\n\n- 全新插件系统\n- 支持第三方集成\n- 新增 Webhook 功能\n\n## 注意事项\n\n- 测试版可能存在不稳定情况\n- 欢迎提交问题反馈`;
    const rid = createRelease(pkg.id, 'v2.2.0-beta', `${pkg.name} v2.2.0 Beta`, body, 0, 1, 'unified', s9, '2026-03-26 08:00:00');
    createAsset(rid, pkg.id, `${pkg.name}-2.2.0-beta.zip`, 58000000 + Math.random() * 15000000, 45);
  }

  // 保存
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  // 验证
  console.log('\n========== 数据整理完成 ==========\n');
  const result = db.exec(`
    SELECT r.id, r.tag_name, p.name as pkg, r.release_type, r.created_at,
           (SELECT COUNT(*) FROM assets WHERE release_id = r.id) as assets
    FROM releases r
    JOIN packages p ON r.package_id = p.id
    ORDER BY r.created_at ASC, r.tag_name ASC
  `);

  if (result.length > 0) {
    const cols = result[0].columns;
    const rows = result[0].values;
    console.log('时间线 (从早到晚):');
    rows.forEach(row => {
      const r = {};
      cols.forEach((c, i) => r[c] = row[i]);
      const type = r.release_type === 'unified' ? '🎯' : '📦';
      console.log(`  ${r.created_at} | ${type} ${r.tag_name.padEnd(12)} | ${r.pkg.padEnd(15)} | ${r.assets}个文件`);
    });
  }

  db.close();
  console.log('\n完成！重启后端服务生效。');
}

main().catch(console.error);
