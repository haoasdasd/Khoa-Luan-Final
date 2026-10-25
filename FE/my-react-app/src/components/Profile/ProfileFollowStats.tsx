import React from "react";

interface StatsProps {
  followers: number;
  following: number;
  postsCount: number;
}

export const ProfileFollowStats = ({ followers, following, postsCount }: StatsProps) => {
  const stats = [
    { label: "Người theo dõi", value: followers },
    { label: "Đang theo dõi", value: following },
  ];

  return (
    <div className="flex items-center justify-around bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
      {stats.map((stat, index) => (
        <div key={index} className="flex flex-col items-center group cursor-pointer">
          <span className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
            {stat.value.toLocaleString()}
          </span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
};