import React from "react"

export default function AuthLayout({ children, title, subtitle }: { 
  children: React.ReactNode, title: string, subtitle: string 
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen items-center justify-center p-4 lg:p-0">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* LEFT - Hero Section (Cố định UI đẹp) */}
          <div className="hidden lg:flex flex-col space-y-8 p-12">
             <h1 className="text-7xl font-black text-blue-600 italic tracking-tighter">Social Network</h1>
             <h2 className="text-4xl font-bold text-slate-900 leading-tight">
               {title} <span className="block text-blue-600">Social Network</span>
             </h2>
             <p className="text-xl text-slate-600 max-w-md">{subtitle}</p>
             <div className="h-1 w-20 bg-blue-600 rounded-full" />
          </div>
 
          {/* RIGHT - Form Card (Rộng rãi và thoáng) */}
          <div className="w-full max-w-[480px] mx-auto bg-white p-8 lg:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-50">
             <div className="lg:hidden text-center mb-10">
             </div>
             {children}
          </div>
        </div>
      </div>
    </div>
  )
}