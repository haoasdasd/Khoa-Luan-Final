import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function MainLayout() {
  return (
    <div className="layout-wrapper">
      <Header /> {/* Gắn Header ở đây */}
      <div className="content-container">
        <Outlet /> {/* Đây là nơi nội dung trang hiển thị */}
      </div>
    </div>
  );
}