import { Link } from "react-router-dom";
import { Download, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FluidDropdown } from "./FluidDropdown";
import { DateRangePicker, type DateRange } from "./DateRangePicker";

// 简单的 Markdown 解析为友好文本
function parseMarkdownToText(body) {
  if (!body) return "暂无变更说明";

  const lines = body.split("\n").filter((l) => {
    const trimmed = l.trim();
    // 过滤所有标题行 (#, ##, ###) 和空行
    return trimmed && !trimmed.startsWith("#");
  });

  // 取前3个有效行
  const preview = lines.slice(0, 3);

  return preview.map((line) => {
    let text = line.trim();

    // 处理列表项 (- 或 * 开头)
    const listMatch = text.match(/^[-*]\s+(.+)/);
    if (listMatch) {
      text = "• " + listMatch[1];
    }

    // 处理粗体 **text**
    text = text.replace(/\*\*(.+?)\*\*/g, "$1");

    return text;
  }).join(" · ");
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// 聚合统一发版的多个 release 为一个显示条目
function aggregateReleases(releases) {
  const unifiedMap = new Map();
  const result: any[] = [];

  releases.forEach((release) => {
    if (release.release_type === 'unified' && release.unified_session_id) {
      // 统一发版：按 unified_session_id 聚合
      if (!unifiedMap.has(release.unified_session_id)) {
        unifiedMap.set(release.unified_session_id, {
          ...release,
          // 聚合所有包名（去重）
          all_package_names: release.all_package_names || release.package_name,
          // 聚合下载次数
          total_downloads: release.total_downloads || 0,
          aggregated: true,
        });
      } else {
        // 合并包名和下载次数
        const existing = unifiedMap.get(release.unified_session_id);
        const existingNames = new Set((existing.all_package_names || '').split(',').filter(Boolean));
        (release.all_package_names || release.package_name).split(',').forEach((name: string) => existingNames.add(name.trim()));
        existing.all_package_names = Array.from(existingNames).join(',');
        existing.total_downloads = (existing.total_downloads || 0) + (release.total_downloads || 0);
      }
    } else {
      // 单包发版：直接保留
      result.push(release);
    }
  });

  // 加入所有聚合后的统一发版
  unifiedMap.forEach((agg) => result.push(agg));

  return result;
}

function groupByMonth(releases) {
  // 先聚合统一发版的多个 release
  const aggregated = aggregateReleases(releases);

  const groups: Record<string, any[]> = {};

  aggregated.forEach((release) => {
    const date = new Date(release.created_at);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month.toString().padStart(2, "0")}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(release);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const [year, month] = key.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const label = date.toLocaleDateString("zh-CN", { year: "numeric", month: "long" });

    return {
      key,
      label,
      releases: groups[key].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    };
  });
}

function ReleaseCard({ release, isLatest, packageAliasMap }) {
  const isPrerelease = release.is_prerelease === 1;
  const isDraft = release.is_draft === 1;
  const isUnified = release.release_type === 'unified';
  const isSingle = release.release_type === 'single';
  const totalDownloads = release.total_downloads;

  // Get display name for a package (alias if available, otherwise name)
  const getDisplayName = (pkgName) => {
    return packageAliasMap?.[pkgName] || pkgName;
  };

  // Get display names for all packages in a release
  const getDisplayNames = () => {
    const names = (release.all_package_names || release.package_name).split(',').filter(Boolean);
    return names.map(n => getDisplayName(n.trim())).join(', ');
  };

  // Save scroll position before navigating
  const handleClick = () => {
    sessionStorage.setItem('home-scroll-position', window.scrollY.toString());
  };

  return (
    <Link
      to={`/releases/${release.tag_name}`}
      onClick={handleClick}
      className={`block border rounded-xl transition-all duration-300 hover:border-[#6C3FF5] group ${
        isUnified ? 'p-5' : 'p-4'
      }`}
      style={{
        borderColor: isUnified ? "#6C3FF5" : "var(--color-border-default)",
        background: isUnified
          ? "linear-gradient(135deg, rgba(108,63,245,0.08) 0%, rgba(167,139,250,0.04) 50%, var(--color-canvas-default) 100%)"
          : "var(--color-canvas-default)",
        borderLeft: isUnified ? "4px solid #6C3FF5" : (isLatest ? "3px solid #6C3FF5" : undefined),
        boxShadow: isUnified ? "0 2px 12px rgba(108,63,245,0.12)" : undefined,
        textDecoration: "none",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-mono font-bold ${isUnified ? 'text-xl' : 'text-base'}`}
            style={{ color: "#6C3FF5" }}
          >
            {release.tag_name}
          </span>
          {isUnified && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: "linear-gradient(135deg, #6C3FF5, #8B5CF6)", color: "white" }}
            >
              🎯 统一发版
            </span>
          )}
          {isSingle && (
            <span
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-muted)" }}
            >
              单包发版
            </span>
          )}
          {isPrerelease && (
            <span
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{ borderColor: "#9a6700", color: "#9a6700" }}
            >
              Pre-release
            </span>
          )}
          {isDraft && (
            <span
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{ borderColor: "var(--color-fg-muted)", color: "var(--color-fg-muted)" }}
            >
              Draft
            </span>
          )}
        </div>
        <span
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg text-white transition-all"
          style={{ background: "#6C3FF5" }}
        >
          查看详情
        </span>
      </div>

      {release.title && (
        <h3 className="text-sm font-medium mb-2" style={{ color: "var(--color-fg-default)" }}>
          {release.title}
        </h3>
      )}

      <div className="flex items-center gap-3 text-xs mb-3 flex-wrap" style={{ color: "var(--color-fg-muted)" }}>
        <span className={isUnified ? 'font-medium' : ''}>{getDisplayNames()}</span>
        <span>·</span>
        <span>{formatDate(release.created_at)}</span>
        {totalDownloads !== undefined && totalDownloads > 0 && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {Number(totalDownloads).toLocaleString()}
            </span>
          </>
        )}
      </div>

      <p className="text-sm line-clamp-2 leading-relaxed min-h-[2.5rem]" style={{ color: "var(--color-fg-muted)" }}>
        {parseMarkdownToText(release.body)}
      </p>

      <div className="h-0.5 w-full mt-4 rounded-full overflow-hidden" style={{ background: "var(--color-canvas-subtle)" }}>
        <div
          className="h-full rounded-full transition-transform duration-500 scale-x-0 group-hover:scale-x-100"
          style={{
            background: "linear-gradient(90deg, #6C3FF5, #A78BFA)",
            transformOrigin: "left",
          }}
        />
      </div>
    </Link>
  );
}

export function Timeline({ releases, packages, className = "", selectedPackage, setSelectedPackage, dateRange, setDateRange, searchText, setSearchText, onSearchKeyDown, onClearSearch }) {
  // Create a map from package name to alias for quick lookup
  const packageAliasMap = {};
  packages.forEach((pkg) => {
    packageAliasMap[pkg.name] = pkg.alias || pkg.name;
  });

  // Get display name for dropdown options (show alias if available)
  const getPackageLabel = (pkg) => pkg.alias || pkg.name;

  const monthGroups = groupByMonth(releases);

  // Prepare dropdown options (show alias in dropdown if available)
  const dropdownOptions = [
    { id: "all", label: "全部软件包" },
    ...packages.map((pkg) => ({ id: pkg.name, label: getPackageLabel(pkg) })),
  ];

  return (
    <div className={className}>
      <div className="flex items-center gap-3 flex-wrap">
        <FluidDropdown
          options={dropdownOptions}
          value={selectedPackage}
          onChange={setSelectedPackage}
        />
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-fg-muted)" }} />
          <input
            type="text"
            placeholder="搜索版本号、包名..."
            value={searchText || ""}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="h-9 pl-9 pr-8 rounded-lg border text-sm w-[180px] placeholder:text-[var(--color-fg-muted)]"
            style={{
              background: "var(--color-canvas-subtle)",
              borderColor: searchText ? "#6C3FF5" : "var(--color-border-default)",
              color: "var(--color-fg-default)",
            }}
          />
          {searchText && (
            <button
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-black/5"
            >
              <X className="w-3 h-3" style={{ color: "var(--color-fg-muted)" }} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <AnimatePresence mode="popLayout">
        {releases.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
            style={{ color: "var(--color-fg-muted)" }}
          >
            暂无版本
          </motion.div>
        ) : (
          <div className="relative">
            {monthGroups.map((group, groupIndex) => (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex gap-8 mb-12 last:mb-0"
              >
              <div className="hidden md:block w-40 shrink-0">
                <div
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    color: groupIndex === 0 ? "#6C3FF5" : "var(--color-fg-default)",
                  }}
                >
                  {group.label.replace("年", "-").replace("月", "")}
                </div>
                <div className="text-sm mt-1" style={{ color: "var(--color-fg-muted)" }}>
                  {group.releases.length} 个版本
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="md:hidden mb-4 flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: groupIndex === 0 ? "#6C3FF5" : "var(--color-border-default)" }}
                  />
                  <span
                    className="text-lg font-bold"
                    style={{
                      color: groupIndex === 0 ? "#6C3FF5" : "var(--color-fg-default)",
                    }}
                  >
                    {group.label}
                  </span>
                  <span className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
                    ({group.releases.length})
                  </span>
                </div>

                <div className="md:hidden absolute left-[15px] top-0 bottom-0 w-[2px]" style={{ background: "var(--color-border-muted)" }} />

                <div className="space-y-4 pl-0 md:pl-6">
                  {group.releases.map((release) => (
                    <ReleaseCard key={release.id} release={release} isLatest={groupIndex === 0} packageAliasMap={packageAliasMap} />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
