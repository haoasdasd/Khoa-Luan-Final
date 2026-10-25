import type { InfiniteData } from "@tanstack/react-query";
import type { ApiPost } from "./api";

export type PostCache = InfiniteData<ApiPost[], number> | ApiPost[];
