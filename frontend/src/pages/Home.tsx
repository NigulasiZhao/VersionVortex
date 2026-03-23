import { useState, useEffect, useLayoutEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getReleases, getPackages, getStats } from "../services/api";
import type { Release, Package } from "../types";
import { Timeline } from "../components/ui/Timeline";
import { Sparkles, Package as PackageIcon, Tag, Download } from "lucide-react";

export default function Home() {
  const { name: packageName } = useParams();
  const location = useLocation();
  const [releases, setReleases] = useState<Release[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>(packageName || "all");
  const [loading, setLoading] = useState(true);
  const [scrollRestored, setScrollRestored] = useState(false);

  // Check if returning from detail page (use cache) or fresh load (fetch API)
  const isReturningFromDetail = location.state?.fromDetail === true;

  // Data loading - only use cache when returning from detail page
  useEffect(() => {
    if (isReturningFromDetail) {
      // Use cache when returning from detail page
      const cachedData = sessionStorage.getItem('home-cache');
      if (cachedData) {
        try {
          const { releases: r, packages: p, stats: s } = JSON.parse(cachedData);
          setReleases(r);
          setPackages(p);
          setStats(s);
          setLoading(false);
          return; // Use cache, don't fetch
        } catch {
          // Cache invalid, fall through to fetch
        }
      }
    }

    // Always fetch from API on fresh load or when cache invalid
    Promise.all([getReleases(), getPackages(), getStats()])
      .then(([r, p, s]) => {
        setReleases(r);
        setPackages(p);
        setStats(s);
        // Cache the data for detail page returns
        sessionStorage.setItem('home-cache', JSON.stringify({ releases: r, packages: p, stats: s }));
      })
      .finally(() => setLoading(false));
  }, [isReturningFromDetail]);

  // Restore scroll position when returning from detail page
  useLayoutEffect(() => {
    if (loading) return;

    const savedPosition = sessionStorage.getItem('home-scroll-position');
    if (savedPosition) {
      window.scrollTo(0, parseFloat(savedPosition));
      sessionStorage.removeItem('home-scroll-position');
      setScrollRestored(true);
    }
  }, [loading]);

  const filtered =
    selectedPackage === "all"
      ? releases
      : releases.filter((r) => r.package_name === selectedPackage);

  // Smooth fade-in when data loads
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16" />
    );
  }

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 relative transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Content */}
      <div className="relative z-10">
        {/* Hero */}
        <div
          className="mb-8 py-6 px-6 rounded-2xl border"
          style={{
            background: "linear-gradient(135deg, var(--color-canvas-subtle) 0%, rgba(108,63,245,0.04) 100%)",
            borderColor: "var(--color-border-default)",
            borderLeft: "4px solid #6C3FF5",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: "linear-gradient(135deg, #6C3FF5 0%, #8B5CF6 100%)" }}
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold" style={{ color: "var(--color-fg-default)" }}>
                  {packageName
                    ? packages.find((p) => p.name === packageName)?.description || packageName
                    : "版本发布"}
                </h1>
              </div>
              <p className="text-sm" style={{ color: "var(--color-fg-muted)", maxWidth: "28rem" }}>
                快速获取最新版本的应用程序、安装包和开发资源
              </p>
            </div>
            {stats && (
              <div
                className="flex items-center gap-5 text-sm shrink-0 px-4 py-3 rounded-xl"
                style={{ background: "var(--color-canvas-default)", border: "1px solid var(--color-border-muted)" }}
              >
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ color: "#6C3FF5" }}>
                    {stats.totalReleases}
                  </div>
                  <div className="text-xs flex items-center gap-1" style={{ color: "var(--color-fg-muted)" }}>
                    <Tag className="w-3 h-3" />版本
                  </div>
                </div>
                <div className="w-px h-10" style={{ background: "var(--color-border-default)" }} />
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ color: "#6C3FF5" }}>
                    {stats.totalPackages}
                  </div>
                  <div className="text-xs flex items-center gap-1" style={{ color: "var(--color-fg-muted)" }}>
                    <PackageIcon className="w-3 h-3" />
                    软件包
                  </div>
                </div>
                <div className="w-px h-10" style={{ background: "var(--color-border-default)" }} />
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ color: "#6C3FF5" }}>
                    {Number(stats.totalDownloads).toLocaleString()}
                  </div>
                  <div className="text-xs flex items-center gap-1" style={{ color: "var(--color-fg-muted)" }}>
                    <Download className="w-3 h-3" />
                    下载
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--color-canvas-subtle) 0%, rgba(108,63,245,0.1) 100%)" }}
            >
              <PackageIcon className="w-6 h-6" style={{ color: "var(--color-fg-muted)" }} />
            </div>
            <p style={{ color: "var(--color-fg-muted)" }}>暂无版本</p>
          </div>
        ) : (
          <Timeline releases={filtered} packages={packages} />
        )}
      </div>
    </div>
  );
}
