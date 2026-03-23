import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getReleases, getPackages, getStats } from "../services/api";
import type { Release, Package } from "../types";
import { Timeline } from "../components/ui/Timeline";
import { Sparkles, Package as PackageIcon, Tag, Download } from "lucide-react";

export default function Home() {
  const { name: packageName } = useParams();
  const [releases, setReleases] = useState<Release[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>(packageName || "all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReleases(), getPackages(), getStats()])
      .then(([r, p, s]) => {
        setReleases(r);
        setPackages(p);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    selectedPackage === "all"
      ? releases
      : releases.filter((r) => r.package_name === selectedPackage);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex items-center justify-center relative">
        {/* Animated background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-[500px] h-[500px] rounded-full animate-float-1"
            style={{
              background: "radial-gradient(circle at center, rgba(108,63,245,0.08) 0%, transparent 70%)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
        <div className="text-center relative z-10">
          <div className="w-10 h-10 border-2 border-[#6C3FF5] border-t-transparent rounded-full mx-auto mb-3 animate-spin" />
          <p className="text-[var(--color-fg-muted)] text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full animate-float-1"
          style={{
            background: "radial-gradient(circle at center, rgba(108,63,245,0.08) 0%, transparent 70%)",
            top: "-200px",
            left: "-200px",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full animate-float-2"
          style={{
            background: "radial-gradient(circle at center, rgba(139,92,246,0.06) 0%, transparent 70%)",
            top: "30%",
            right: "-150px",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full animate-float-3"
          style={{
            background: "radial-gradient(circle at center, rgba(167,139,250,0.05) 0%, transparent 70%)",
            bottom: "10%",
            left: "20%",
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(#6C3FF5 1px, transparent 1px), linear-gradient(90deg, #6C3FF5 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Floating dots */}
        <div className="absolute w-1.5 h-1.5 rounded-full animate-float-1" style={{ background: "rgba(108,63,245,0.3)", top: "15%", right: "15%" }} />
        <div className="absolute w-1 h-1 rounded-full animate-float-2" style={{ background: "rgba(139,92,246,0.4)", top: "25%", right: "25%" }} />
        <div className="absolute w-2 h-2 rounded-full animate-float-3" style={{ background: "rgba(108,63,245,0.2)", top: "60%", right: "10%" }} />
        <div className="absolute w-1 h-1 rounded-full animate-float-1" style={{ background: "rgba(167,139,250,0.5)", bottom: "30%", right: "20%", animationDelay: "1s" }} />
        <div className="absolute w-1.5 h-1.5 rounded-full animate-float-2" style={{ background: "rgba(108,63,245,0.25)", bottom: "20%", left: "10%" }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Top accent bar */}
        <div
          className="h-1.5 rounded-full mb-8 animate-gradient"
          style={{ background: "linear-gradient(90deg, #6C3FF5, #A78BFA, #C4B5FD, #6C3FF5)", backgroundSize: "200% auto" }}
        />

        {/* Hero */}
        <div
          className="mb-8 py-6 px-6 rounded-2xl border animate-fade-in"
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
