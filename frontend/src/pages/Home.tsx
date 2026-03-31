import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getReleases, getPackages, getStats, type ReleaseFilters } from "../services/api";
import type { Release, Package } from "../types";
import { Timeline } from "../components/ui/Timeline";
import type { DateRange } from "../components/ui/DateRangePicker";
import { Sparkles, Package as PackageIcon, Tag, Download } from "lucide-react";

const PAGE_SIZE = 10;

export default function Home() {
  const { name: packageName } = useParams();
  const location = useLocation();
  const [releases, setReleases] = useState<Release[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>(packageName || "all");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // Confirmed search query (on Enter)
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [scrollRestored, setScrollRestored] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Check if returning from detail page (use cache) or fresh load (fetch API)
  const isReturningFromDetail = location.state?.fromDetail === true;

  // Fetch releases with current filters
  const fetchReleases = useCallback((pageNum: number = 1, append: boolean = false) => {
    const filters: ReleaseFilters = {
      page: pageNum,
      pageSize: PAGE_SIZE,
    };
    if (selectedPackage !== "all") {
      filters.package = selectedPackage;
    }
    if (searchQuery) {
      filters.search = searchQuery;
    }
    if (dateRange?.start) {
      filters.startDate = dateRange.start;
    }
    if (dateRange?.end) {
      filters.endDate = dateRange.end;
    }
    return getReleases(filters).then((result) => {
      if (append) {
        setReleases(prev => [...prev, ...result.releases]);
      } else {
        setReleases(result.releases);
      }
      setHasMore(result.pagination.page < result.pagination.totalPages);
      return result;
    });
  }, [selectedPackage, searchQuery, dateRange]);

  // Initial data loading - only use cache when returning from detail page
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
    Promise.all([getReleases({ page: 1, pageSize: PAGE_SIZE }), getPackages(), getStats()])
      .then(([rResult, p, s]) => {
        setReleases(rResult.releases);
        setPackages(p);
        setStats(s);
        setHasMore(rResult.pagination.page < rResult.pagination.totalPages);
        setPage(1);
        // Cache the data for detail page returns
        sessionStorage.setItem('home-cache', JSON.stringify({ releases: rResult.releases, packages: p, stats: s }));
      })
      .finally(() => setLoading(false));
  }, [isReturningFromDetail]);

  // Refetch releases when filters change
  useEffect(() => {
    if (!loading) {
      setLoadingMore(true);
      fetchReleases(1, false).finally(() => {
        setLoadingMore(false);
        setPage(1);
      });
    }
  }, [fetchReleases, loading]);

  // Load more when reaching bottom
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    fetchReleases(nextPage, true).then(() => {
      setPage(nextPage);
    }).finally(() => {
      setLoadingMore(false);
    });
  }, [loadingMore, hasMore, page, fetchReleases]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (loading) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, loadingMore, loadMore]);

  // Handle search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearchQuery(searchText);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchText("");
    setSearchQuery("");
  };

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
          className="mb-4 py-6 px-6 rounded-2xl border"
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
        <Timeline releases={releases} packages={packages} selectedPackage={selectedPackage} setSelectedPackage={setSelectedPackage} dateRange={dateRange} setDateRange={setDateRange} searchText={searchText} setSearchText={setSearchText} onSearchKeyDown={handleSearchKeyDown} onClearSearch={handleClearSearch} loadingMore={loadingMore} hasMore={hasMore} loadMoreRef={loadMoreRef} />
      </div>
    </div>
  );
}
