import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import './index.css'

// 1. Khởi tạo QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Tắt tự động load lại khi chuyển Tab
      staleTime: 1000 * 60 * 5,    // Dữ liệu coi là "mới" trong 5 phút, không cần fetch lại liên tục
      retry: 1,                    // Thử lại 1 lần nếu lỗi
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)