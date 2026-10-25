import React from "react";

type TabType = "posts" | "media" | "friends";

export const ProfileTabs = ({ activeTab, onChange }: { activeTab: TabType; onChange: (t: TabType) => void }) => {
  const tabs = [
    { id: "posts", label: "Bài viết" },
    { id: "media", label: "Ảnh & Video" },
    { id: "friends", label: "Bạn bè" },
  ];

  return (
    <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id as TabType)}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
            activeTab === tab.id 
            ? "bg-blue-50 text-blue-600 shadow-sm" 
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};