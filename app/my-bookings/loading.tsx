import React from "react";

export default function MyBookingsLoading() {
  return (
    <div className="container py-8 space-y-6 animate-pulse max-w-4xl">
      <div className="h-8 w-60 bg-[#121c14] rounded-xs mb-2"></div>
      <div className="h-4 w-80 bg-[#0f1711] rounded-xs mb-6"></div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-24 bg-[#121c14] rounded-xs"></div>
        ))}
      </div>

      {/* Booking Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[#0b140d] border border-[#1a2b1e] rounded-sm p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 w-48 bg-[#17271b] rounded-xs"></div>
              <div className="h-6 w-24 bg-[#142618] rounded-xs"></div>
            </div>
            <div className="h-4 w-72 bg-[#111c14] rounded-xs"></div>
            <div className="pt-3 border-t border-[#1a2b1e] flex justify-between items-center">
              <div className="h-4 w-32 bg-[#111c14] rounded-xs"></div>
              <div className="h-8 w-28 bg-[#182a1d] rounded-xs"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
