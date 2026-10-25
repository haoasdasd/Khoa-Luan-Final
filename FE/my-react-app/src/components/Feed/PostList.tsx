import React from "react";
import { PostCard } from "@/components/Feed/PostCard";

export function PostList({ posts }: { posts: any[] }) {
  // Nếu không có bài viết, không render gì cả
  if (!posts || posts.length === 0) return null;

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onSave={function (): void {
          throw new Error("Function not implemented.");
        } } />
      ))}
    </div>
  );
}