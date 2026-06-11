import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  MessageSquareText,
  Search,
  ShoppingCart,
  UserCircle2,
} from "lucide-react";

export default function Header() {
  const location = useLocation();

  const menus = [
    {
      label: "Trang chủ",
      path: "/",
    },
    {
      label: "Cộng đồng",
      path: "/community",
    },
    {
      label: "Hồ sơ",
      path: "/profile",
    },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        <Link to="/">
          <img src="/brand/logo-antifake.png" alt="logo" className="logo-img" />
        </Link>
      </div>

      {/* menu */}

      <div className="menu">
        {menus.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`menu-item ${
              location.pathname === item.path ? "active" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* search  */}
      <div className="search-box">
        <input type="text" placeholder="Tìm sản phẩm..." />

        <button className="search-btn">
          <Search size={22} />
        </button>
      </div>

      {/* action */}
      <div className="header-actions">
        <button className="icon-btn">
          <MessageSquareText size={22} />
        </button>

        <button className="icon-btn cart-btn">
          <ShoppingCart size={22} />
          <span className="badge">2</span>
        </button>

        <button className="icon-btn">
          <Bell size={22} />
        </button>

        <div className="divider" />

        <button className="icon-btn profile-btn">
          <UserCircle2 size={24} />
        </button>
      </div>
    </div>
  );
}
