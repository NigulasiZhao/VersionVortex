import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, ChevronDown } from "lucide-react";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function groupByMonth(releases) {
  const groups = {};

  releases.forEach((release) => {
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

function ReleaseCard({ release, isLatest }) {
  const isPrerelease = release.is_prerelease === 1;
  const isDraft = release.is_draft === 1;
  const totalDownloads = release.total_downloads;

  return (
    <Link
      to={`/releases/${release.tag_name}`}
      className="block border rounded-xl p-5 transition-all duration-300 hover:border-[#6C3FF5] group"
      style={{
        borderColor: "var(--color-border-default)",
        background: "var(--color-canvas-default)",
        borderLeft: isLatest ? "3px solid #6C3FF5" : undefined,
        textDecoration: "none",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono font-semibold text-base"
            style={{ color: "#6C3FF5" }}
          >
            {release.tag_name}
          </span>
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

      <div className="flex items-center gap-3 text-xs mb-3" style={{ color: "var(--color-fg-muted)" }}>
        <span>{release.package_name}</span>
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

      {release.body && (
        <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
          {release.body
            .split("\n")
            .filter((l) => l.trim() && !l.startsWith("#"))
            .slice(0, 3)
            .join(" · ")}
        </p>
      )}

      <div className="h-0.5 w-full mt-4 rounded-full overflow-hidden" style={{ background: "var(--color-canvas-subtle)" }}>
        <div
          className="h-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-full"
          style={{
            background: "linear-gradient(90deg, #6C3FF5, #A78BFA)",
            transformOrigin: "left",
          }}
        />
      </div>
    </Link>
  );
}

export function Timeline({ releases, packages }) {
  const [selectedPackage, setSelectedPackage] = useState("all");

  const filteredReleases =
    selectedPackage === "all"
      ? releases
      : releases.filter((r) => r.package_name === selectedPackage);

  const monthGroups = groupByMonth(filteredReleases);

  return (
    <div>
      <div className="sticky top-16 z-30 py-4" style={{ background: "var(--color-canvas-default)" }}>
        <div className="relative inline-block">
          <select
            value={selectedPackage}
            onChange={(e) => setSelectedPackage(e.target.value)}
            className="appearance-none px-4 py-2 pr-10 rounded-xl border cursor-pointer text-sm"
            style={{
              background: "var(--color-canvas-subtle)",
              borderColor: "var(--color-border-default)",
              color: "var(--color-fg-default)",
            }}
          >
            <option value="all">全部软件包</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.name}>
                {pkg.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--color-fg-muted)" }}
          />
        </div>
      </div>

      {filteredReleases.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--color-fg-muted)" }}>
          暂无版本
        </div>
      ) : (
        <div className="relative">
          {monthGroups.map((group, groupIndex) => (
            <div key={group.key} className="flex gap-8 mb-12 last:mb-0">
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
                    <ReleaseCard key={release.id} release={release} isLatest={groupIndex === 0} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
