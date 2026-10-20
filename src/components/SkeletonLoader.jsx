import React from "react";

export function SkeletonBox({ width = "100%", height = "20px", borderRadius = "8px", className = "" }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

export function SkeletonCard({ height = "140px", className = "" }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <div className="skeleton-card-top">
        <SkeletonBox width="35%" height="14px" />
        <SkeletonBox width="24px" height="24px" borderRadius="6px" />
      </div>
      <div className="skeleton-card-mid mt-3">
        <SkeletonBox width="60%" height="28px" />
      </div>
      <div className="skeleton-card-bottom mt-3">
        <SkeletonBox width="80%" height="12px" />
      </div>
    </div>
  );
}

export function SkeletonMetricGrid({ count = 4 }) {
  return (
    <div className="dash-grid-4">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
}

export function SkeletonRow({ cols = 4, className = "" }) {
  return (
    <div className={`skeleton-row flex items-center gap-3 py-3 border-b border-white/5 ${className}`}>
      <SkeletonBox width="36px" height="36px" borderRadius="8px" />
      <div className="flex-1 space-y-1.5">
        <SkeletonBox width="45%" height="14px" />
        <SkeletonBox width="25%" height="11px" />
      </div>
      <SkeletonBox width="70px" height="24px" borderRadius="6px" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="skeleton-table-wrapper p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex justify-between items-center mb-4">
        <SkeletonBox width="140px" height="18px" />
        <SkeletonBox width="80px" height="28px" borderRadius="6px" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: rows }).map((_, idx) => (
          <SkeletonRow key={idx} />
        ))}
      </div>
    </div>
  );
}
