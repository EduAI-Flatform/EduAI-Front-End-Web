import { MoreVertical, PlusSquare, Share2 } from "lucide-react";
import type { PwaPlatform } from "./pwa-utils";

interface PwaInstallGuideProps {
  platform: PwaPlatform;
}

export function PwaInstallGuide({ platform }: PwaInstallGuideProps) {
  if (platform === "ios") {
    return (
      <div className="pwa-install-guide" data-platform="ios">
        <p className="pwa-install-guide__lead">
          Nhấn nút Chia sẻ trong Safari, sau đó chọn “Thêm vào Màn hình chính”.
        </p>
        <ol className="pwa-install-guide__steps">
          <li>
            <Share2 aria-hidden="true" />
            <span>Mở nút Chia sẻ trong thanh công cụ Safari.</span>
          </li>
          <li>
            <PlusSquare aria-hidden="true" />
            <span>Chọn “Thêm vào Màn hình chính”.</span>
          </li>
          <li>
            <span className="pwa-install-guide__step-number">3</span>
            <span>Nhấn “Thêm” để hoàn tất.</span>
          </li>
        </ol>
      </div>
    );
  }

  if (platform === "android") {
    return (
      <div className="pwa-install-guide" data-platform="android">
        <p className="pwa-install-guide__lead">
          Nhấn menu ⋮ của trình duyệt và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.
        </p>
        <div className="pwa-install-guide__manual-step">
          <MoreVertical aria-hidden="true" />
          <span>Mở menu trình duyệt, sau đó chọn tùy chọn cài đặt EduAI.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-install-guide" data-platform="chromium-desktop">
      <p className="pwa-install-guide__lead">
        Mở menu trình duyệt và chọn “Cài đặt EduAI” hoặc biểu tượng cài đặt trong thanh địa chỉ.
      </p>
      <div className="pwa-install-guide__manual-step">
        <MoreVertical aria-hidden="true" />
        <span>Chrome và Edge sẽ mở EduAI trong một cửa sổ riêng sau khi cài đặt.</span>
      </div>
    </div>
  );
}
