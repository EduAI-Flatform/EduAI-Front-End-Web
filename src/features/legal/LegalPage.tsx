import { ArrowLeft, FileText, Phone, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import "./LegalPage.css";

const HOTLINE_DISPLAY = "0834.038.128";
const HOTLINE_HREF = "tel:+84834038128";

export function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}

export function DataDeletionPage() {
  return <LegalPage kind="data-deletion" />;
}

function LegalPage({ kind }: { kind: "privacy" | "data-deletion" }) {
  const isDataDeletion = kind === "data-deletion";

  return (
    <section className="legal-page">
      <div className="legal-page__container container">
        <Link className="legal-page__back" to="/">
          <ArrowLeft aria-hidden="true" />
          Về EduAI
        </Link>

        <header className="legal-page__header">
          <span className="legal-page__icon" aria-hidden="true">
            {isDataDeletion ? <ShieldCheck /> : <FileText />}
          </span>
          <div>
            <p className="legal-page__eyebrow">EduAI · Thông tin công khai</p>
            <h1>{isDataDeletion ? "Yêu cầu xóa dữ liệu" : "Chính sách bảo mật"}</h1>
            <p className="legal-page__updated">Cập nhật: 03/09/2026</p>
          </div>
        </header>

        {isDataDeletion ? <DataDeletionContent /> : <PrivacyContent />}

        <aside className="legal-page__contact" aria-labelledby="legal-contact-title">
          <Phone aria-hidden="true" />
          <div>
            <h2 id="legal-contact-title">Liên hệ người vận hành EduAI</h2>
            <p>Gọi hotline công khai để gửi hoặc theo dõi yêu cầu về dữ liệu.</p>
            <a href={HOTLINE_HREF}>{HOTLINE_DISPLAY}</a>
            <a
              href="https://giaoducso.org.vn/"
              rel="noreferrer"
              target="_blank"
            >
              Cổng thông tin giáo dục số
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PrivacyContent() {
  return (
    <div className="legal-page__body">
      <section aria-labelledby="privacy-data-title">
        <h2 id="privacy-data-title">Dữ liệu EduAI xử lý</h2>
        <p>
          EduAI xử lý thông tin cần thiết để tạo tài khoản, đăng nhập và cung cấp
          dịch vụ học tập. Dữ liệu có thể gồm email, họ tên, vai trò, tiến độ học
          tập và thông tin hồ sơ do bạn cung cấp.
        </p>
        <p>
          Khi đăng nhập bằng nhà cung cấp xã hội, EduAI nhận provider user ID, tên,
          ảnh đại diện và email nếu nhà cung cấp trả về. Access token và refresh
          token chỉ được dùng ở máy chủ trong lúc xác thực và không được lưu như
          dữ liệu tài khoản.
        </p>
      </section>

      <section aria-labelledby="privacy-use-title">
        <h2 id="privacy-use-title">Cách sử dụng và bảo vệ</h2>
        <ul>
          <li>Cung cấp đăng nhập, khôi phục phiên và các tính năng học tập.</li>
          <li>Không tự động liên kết tài khoản chỉ vì hai email giống nhau.</li>
          <li>Phân quyền dựa trên vai trò EduAI, không dựa trên claim của provider.</li>
          <li>Giới hạn dữ liệu xã hội ở mức cần thiết cho đăng nhập.</li>
        </ul>
      </section>

      <section aria-labelledby="privacy-deletion-title">
        <h2 id="privacy-deletion-title">Xóa dữ liệu và tài khoản</h2>
        <p>
          Bạn có thể gửi yêu cầu thủ công theo hướng dẫn tại trang{" "}
          <Link to="/data-deletion">Yêu cầu xóa dữ liệu</Link>. EduAI hiện chưa
          cung cấp nút tự xóa tài khoản công khai; người vận hành sẽ xác minh phạm
          vi yêu cầu và xử lý theo chính sách lưu giữ hiện hành.
        </p>
      </section>
    </div>
  );
}

function DataDeletionContent() {
  return (
    <div className="legal-page__body">
      <section aria-labelledby="data-deletion-facebook-title">
        <h2 id="data-deletion-facebook-title">Gỡ EduAI khỏi Facebook</h2>
        <ol>
          <li>Mở Facebook và vào Settings &amp; Privacy → Settings.</li>
          <li>Mở Apps and Websites.</li>
          <li>Chọn EduAI, chọn Remove và xác nhận yêu cầu.</li>
        </ol>
        <p>
          Thao tác này thu hồi quyền truy cập của EduAI trên Facebook. Để yêu cầu
          xử lý dữ liệu EduAI tương ứng, hãy thực hiện thêm bước liên hệ bên dưới.
        </p>
      </section>

      <section aria-labelledby="data-deletion-request-title">
        <h2 id="data-deletion-request-title">Gửi yêu cầu xóa dữ liệu EduAI</h2>
        <p>
          Gọi hotline {HOTLINE_DISPLAY} và nói rõ bạn muốn xóa dữ liệu Facebook
          hoặc tài khoản EduAI. Cung cấp email hoặc họ tên đã dùng để đăng nhập
          nếu có, để người vận hành xác minh đúng tài khoản.
        </p>
        <p className="legal-page__warning">Không gửi mật khẩu, access token, refresh token hoặc secret.</p>
      </section>

      <section aria-labelledby="data-deletion-process-title">
        <h2 id="data-deletion-process-title">Cách xử lý</h2>
        <p>
          Yêu cầu được tiếp nhận thủ công. Người vận hành sẽ xác minh danh tính,
          phạm vi dữ liệu cần xóa và các nghĩa vụ lưu giữ áp dụng, sau đó phản hồi
          qua kênh liên hệ của yêu cầu. Trang này là hướng dẫn công khai; EduAI
          không giả định rằng việc gỡ ứng dụng tự động xóa toàn bộ tài khoản.
        </p>
        <p>
          Xem thêm <Link to="/privacy">Chính sách bảo mật</Link> để biết dữ liệu
          nào được xử lý.
        </p>
      </section>
    </div>
  );
}
