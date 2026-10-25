import type { ApiComment } from "@/types/api";

export const CommentHeader = ({ 
  comment, 
  postAuthorId, 
  isEditing, 
  editValue, 
  setEditValue, 
  onUpdate, 
  setIsEditing 
}: any) => (
  <div className={`px-3 py-2 rounded-2xl border transition-all ${
    comment.parent_id ? "rounded-tl-2xl" : "rounded-tl-none"
  } ${
    comment.is_deleted ? "bg-slate-50/50 border-dashed border-slate-200" : "bg-slate-100 hover:bg-slate-200/70 border-transparent shadow-sm"
  } ${isEditing ? "w-full" : "max-w-fit"}`}>
    <div className="flex items-center gap-2 mb-0.5">
      <span className={`font-bold text-[12px] ${comment.is_deleted ? "text-slate-400" : "text-slate-900"}`}>
        {comment.author.full_name}
      </span>
      {comment.author.id === postAuthorId && (
        <span className="bg-blue-100 text-blue-600 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">Tác giả</span>
      )}
    </div>

    {isEditing ? (
      <div className="mt-1 flex flex-col gap-2 min-w-50">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full bg-white text-[13px] border border-slate-200 p-2 rounded-xl outline-none resize-none"
          autoFocus
        />
        <div className="flex justify-end gap-3 pb-1">
          <button onClick={() => setIsEditing(false)} className="text-[10px] font-bold text-slate-400">HỦY</button>
          <button onClick={() => { onUpdate(comment.id, editValue); setIsEditing(false); }} className="text-[10px] font-bold text-blue-600">CẬP NHẬT</button>
        </div>
      </div>
    ) : (
      <p className={`text-[13.5px] break-words leading-snug ${comment.is_deleted ? "text-slate-400 italic" : "text-slate-800"}`}>
        {comment.content}
      </p>
    )}
  </div>
);