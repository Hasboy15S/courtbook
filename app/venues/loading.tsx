import React from "react";

export default function VenuesLoading() {
  return (
    <div className="venues-page container py-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-10 w-72 bg-[#121c14] rounded-xs mb-4"></div>
      <div className="h-4 w-96 bg-[#0f1711] rounded-xs mb-8"></div>

      {/* Filter Skeleton */}
      <div className="h-14 w-full bg-[#101b13] border border-[#1f2e22] rounded-xs mb-8"></div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-[#0b140d] border border-[#1a2b1e] rounded-sm p-5 space-y-4"
          >
            <div className="h-40 bg-[#131f16] rounded-xs w-full"></div>
            <div className="h-5 bg-[#17271b] rounded-xs w-3/4"></div>
            <div className="h-3 bg-[#111c14] rounded-xs w-1/2"></div>
            <div className="pt-4 border-t border-[#1a2b1e] flex justify-between items-center">
              <div className="h-6 w-24 bg-[#142417] rounded-xs"></div>
              <div className="h-8 w-28 bg-[#182a1d] rounded-xs"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
