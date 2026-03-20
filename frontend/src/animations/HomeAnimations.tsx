import { useCallback } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, Sequence, useCurrentFrame, spring, interpolate } from 'remotion';
import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────

interface ReleaseCardData {
  tag_name: string;
  title: string;
  package_name: string;
  created_at: string;
  total_downloads?: number;
}

interface HomeAnimationsProps {
  releaseCount: number;
  packageCount: number;
  downloadCount: number;
}

// ─── Number Ticker ──────────────────────────────────────────────────────────

function NumberTicker({ value, duration }: { value: number; duration: number }) {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, duration], [0, 1], { extrapolateRight: 'clamp' });
  const display = Math.round(progress * value);
  return (
    <span className="font-mono tabular-nums">
      {display.toLocaleString()}
    </span>
  );
}

// ─── Hero Animation ─────────────────────────────────────────────────────────

function HeroAnimation({ releaseCount, packageCount, downloadCount }: HomeAnimationsProps) {
  const frame = useCurrentFrame();

  const titleY = interpolate(frame, [0, 30], [40, 0], { extrapolateRight: 'clamp' });
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const badgeScale = spring({ frame, config: { damping: 200, stiffness: 100 }, fps: 30 });

  const statsY = interpolate(frame, [20, 50], [30, 0], { extrapolateRight: 'clamp' });
  const statsOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #161b22 0%, #010409 100%)',
        borderRadius: 12,
        padding: '40px 40px',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: -60,
        right: -60,
        width: 240,
        height: 240,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Icon */}
      <Sequence from={0} durationInFrames={25}>
        <div style={{
          transform: `scale(${badgeScale})`,
          marginBottom: 20,
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
        </div>
      </Sequence>

      {/* Title */}
      <div style={{
        transform: `translateY(${titleY}px)`,
        opacity: titleOpacity,
        marginBottom: 12,
      }}>
        <h1 style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 36,
          fontWeight: 700,
          color: '#e6edf3',
          margin: 0,
          letterSpacing: '-0.5px',
        }}>
          版本发布
        </h1>
      </div>

      <div style={{
        opacity: titleOpacity,
        fontSize: 15,
        color: '#8b949e',
        marginBottom: 32,
      }}>
        快速获取最新版本的应用程序、安装包和开发资源
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: 32,
        transform: `translateY(${statsY}px)`,
        opacity: statsOpacity,
      }}>
        {[
          { label: '版本', value: releaseCount },
          { label: '软件包', value: packageCount },
          { label: '下载', value: downloadCount },
        ].map((stat, i) => (
          <React.Fragment key={stat.label}>
            {i > 0 && (
              <div style={{ width: 1, background: '#30363d', alignSelf: 'stretch' }} />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#e6edf3', lineHeight: 1.1 }}>
                <NumberTicker value={stat.value} duration={60} />
              </div>
              <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{stat.label}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Floating dots decoration */}
      {[...Array(6)].map((_, i) => {
        const delay = i * 12;
        const dotY = interpolate(frame, [delay, delay + 60], [0, -20 + (i % 3) * 10], {
          extrapolateRight: 'clamp',
          extrapolateLeft: 'clamp',
        });
        const dotOpacity = interpolate(frame, [delay, delay + 20, delay + 50], [0, 0.6, 0], {
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 30 + i * 15,
              right: 40 + (i % 3) * 20,
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#3b82f6',
              transform: `translateY(${dotY})`,
              opacity: dotOpacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

// ─── Release Card Animation ─────────────────────────────────────────────────

function ReleaseCardItem({ release, index }: { release: ReleaseCardData; index: number }) {
  const frame = useCurrentFrame();

  const startFrame = 20 + index * 15;
  const delay = Math.max(0, startFrame - frame);

  const cardY = interpolate(delay, [0, 20], [20, 0], { extrapolateLeft: 'clamp' });
  const cardOpacity = interpolate(delay, [0, 15], [0, 1], { extrapolateLeft: 'clamp' });

  const scale = spring({ frame: Math.max(0, frame - startFrame), config: { damping: 200, stiffness: 200 }, fps: 30 });

  return (
    <div
      style={{
        border: '1px solid #30363d',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        background: '#161b22',
        transform: `translateY(${cardY}px) scale(${scale})`,
        opacity: cardOpacity,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '20px 20px',
      }}>
        <div style={{ flex: 1 }}>
          {/* Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 15,
              fontWeight: 600,
              color: '#58a6ff',
            }}>
              {release.tag_name}
            </span>
          </div>
          {/* Title */}
          {release.title && (
            <div style={{
              fontSize: 16,
              fontWeight: 500,
              color: '#e6edf3',
              marginBottom: 6,
            }}>
              {release.title}
            </div>
          )}
          {/* Meta */}
          <div style={{
            display: 'flex',
            gap: 8,
            fontSize: 12,
            color: '#8b949e',
          }}>
            <span>{release.package_name}</span>
            <span>·</span>
            <span>{new Date(release.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            {release.total_downloads !== undefined && release.total_downloads > 0 && (
              <>
                <span>·</span>
                <span>{Number(release.total_downloads).toLocaleString()} 次下载</span>
              </>
            )}
          </div>
        </div>
        <div style={{
          marginLeft: 16,
          fontSize: 13,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid #30363d',
          color: '#8b949e',
        }}>
          查看详情
        </div>
      </div>
    </div>
  );
}

// ─── Remotion Export Config ──────────────────────────────────────────────────

export const homeHeroConfig = {
  durationInFrames: 150,
  fps: 30,
  width: 800,
  height: 360,
};

export const releaseListConfig = {
  durationInFrames: 120,
  fps: 30,
  width: 800,
  height: 500,
};

// ─── React Component Wrappers ───────────────────────────────────────────────

export function HomeHeroAnimation({ releaseCount, packageCount, downloadCount }: HomeAnimationsProps) {
  const component = useCallback(() => (
    <HeroAnimation
      releaseCount={releaseCount}
      packageCount={packageCount}
      downloadCount={downloadCount}
    />
  ), [releaseCount, packageCount, downloadCount]);

  return (
    <Player
      component={component}
      durationInFrames={homeHeroConfig.durationInFrames}
      fps={homeHeroConfig.fps}
      compositionWidth={homeHeroConfig.width}
      compositionHeight={homeHeroConfig.height}
      controls={false}
      loop={false}
      clickToPlay={false}
      style={{
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--color-border-default)',
      }}
    />
  );
}

export function ReleaseListAnimation({ releases }: { releases: ReleaseCardData[] }) {
  const component = useCallback(() => (
    <AbsoluteFill style={{ background: 'transparent', padding: 0 }}>
      {releases.slice(0, 4).map((release, i) => (
        <ReleaseCardItem key={release.tag_name} release={release} index={i} />
      ))}
    </AbsoluteFill>
  ), [releases]);

  return (
    <Player
      component={component}
      durationInFrames={releaseListConfig.durationInFrames}
      fps={releaseListConfig.fps}
      compositionWidth={releaseListConfig.width}
      compositionHeight={releaseListConfig.height}
      controls={false}
      loop={false}
      clickToPlay={false}
      style={{
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    />
  );
}
