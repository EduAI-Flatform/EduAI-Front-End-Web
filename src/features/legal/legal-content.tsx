import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export const HOTLINE_DISPLAY = "0834.038.128";
export const HOTLINE_HREF = "tel:+84834038128";

export type LegalPageKind = "terms" | "privacy" | "data-deletion";

export interface LegalSectionSummary {
  id: string;
  title: string;
}

interface LegalSectionDefinition extends LegalSectionSummary {
  render: () => ReactNode;
}

const TERMS_SECTIONS: readonly LegalSectionDefinition[] = [
  {
    id: "terms-scope",
    title: "Giới thiệu và phạm vi áp dụng",
    render: () => (
      <>
        <p>
          Điều khoản sử dụng này áp dụng cho website, ứng dụng web và các tính năng
          của EduAI mà bạn truy cập hoặc sử dụng. EduAI là nền tảng hỗ trợ học tập,
          phát triển kỹ năng và kết nối người học với các tài nguyên giáo dục.
        </p>
        <p>
          Tùy từng thời điểm và vai trò tài khoản, EduAI có thể cung cấp khóa học,
          bài học, bài kiểm tra, bài tập, lớp học trực tuyến, thư viện, cộng đồng,
          hồ sơ nghề nghiệp, cơ hội việc làm, cố vấn, chứng chỉ xác minh, công cụ
          AI, cùng các tính năng khóa học hoặc hội viên có thu phí khi được hiển thị
          trong sản phẩm. Tính năng cụ thể có thể thay đổi theo cấu hình và điều
          kiện thực tế.
        </p>
      </>
    ),
  },
  {
    id: "terms-acceptance",
    title: "Chấp nhận điều khoản",
    render: () => (
      <>
        <p>
          Bằng việc tạo tài khoản, đăng nhập, truy cập hoặc sử dụng EduAI, bạn
          xác nhận đã đọc, hiểu và đồng ý với Điều khoản này cùng Chính sách bảo
          mật của EduAI.
        </p>
        <p>
          Nếu bạn không đồng ý, vui lòng không tạo tài khoản hoặc ngừng sử dụng
          phần dịch vụ tương ứng. Một số tính năng có thể có điều kiện bổ sung
          được thông báo tại thời điểm sử dụng.
        </p>
      </>
    ),
  },
  {
    id: "terms-account-conditions",
    title: "Điều kiện sử dụng tài khoản",
    render: () => (
      <>
        <p>
          Bạn phải cung cấp thông tin đăng ký đúng, đầy đủ trong phạm vi được yêu
          cầu và cập nhật khi thông tin thay đổi. Bạn chỉ được sử dụng tài khoản
          của mình và không được cho người khác mượn, bán hoặc chuyển giao tài
          khoản nếu chưa được EduAI chấp thuận.
        </p>
        <p>
          Người chưa có đầy đủ năng lực hành vi theo pháp luật áp dụng cần sử
          dụng EduAI với sự đồng ý và giám sát phù hợp của cha mẹ hoặc người đại
          diện hợp pháp. EduAI có thể yêu cầu xác minh hoặc từ chối tài khoản có
          thông tin giả mạo, trùng lặp bất thường hoặc có dấu hiệu lạm dụng.
        </p>
      </>
    ),
  },
  {
    id: "terms-registration",
    title: "Đăng ký và đăng nhập",
    render: () => (
      <>
        <p>
          EduAI hiện có thể hỗ trợ đăng ký và đăng nhập bằng email và mật khẩu,
          đăng nhập Google, và các phương thức xã hội khác khi phương thức đó
          được hiển thị, cấu hình và sẵn sàng trên hệ thống. Một số bước như xác
          minh email hoặc lựa chọn vai trò có thể cần hoàn tất trước khi sử dụng
          tính năng.
        </p>
        <p>
          Việc đăng ký thành công không mặc nhiên bảo đảm quyền truy cập vào mọi
          khóa học, hội viên hoặc tính năng. Quyền truy cập phụ thuộc vào vai trò,
          trạng thái tài khoản, điều kiện của khóa học và thông tin được hiển thị
          tại thời điểm sử dụng.
        </p>
      </>
    ),
  },
  {
    id: "terms-social-login",
    title: "Đăng nhập bằng Google, Facebook và Zalo",
    render: () => (
      <>
        <p>
          Khi bạn chọn một nhà cung cấp đăng nhập được hỗ trợ, EduAI có thể nhận
          thông tin tài khoản tối thiểu mà bạn cho phép nhà cung cấp đó chia sẻ,
          chẳng hạn mã định danh của tài khoản, tên, ảnh đại diện và email nếu
          nhà cung cấp trả về email. Phạm vi thông tin phụ thuộc vào phương thức,
          quyền được yêu cầu và kết quả thực tế từ nhà cung cấp.
        </p>
        <p>
          EduAI không nhận hoặc lưu mật khẩu Google, Facebook hay Zalo của bạn.
          Bạn chịu sự điều chỉnh của điều khoản và chính sách của nhà cung cấp
          khi sử dụng màn hình đăng nhập của họ.
        </p>
      </>
    ),
  },
  {
    id: "terms-account-security",
    title: "Trách nhiệm bảo mật tài khoản",
    render: () => (
      <>
        <p>
          Bạn chịu trách nhiệm bảo vệ thông tin đăng nhập, thiết bị và các phiên
          truy cập của mình; không chia sẻ mật khẩu, mã xác thực hoặc thông tin
          phiên cho người khác. Hãy đăng xuất trên thiết bị dùng chung và thông
          báo ngay qua kênh liên hệ công khai nếu nghi ngờ tài khoản bị truy cập
          trái phép.
        </p>
        <p>
          EduAI có thể tạm khóa hoặc yêu cầu xác minh lại khi phát hiện dấu hiệu
          bất thường nhằm bảo vệ tài khoản, dữ liệu và cộng đồng.
        </p>
      </>
    ),
  },
  {
    id: "terms-learning-content",
    title: "Nội dung và tài nguyên học tập",
    render: () => (
      <>
        <p>
          Khóa học, bài học, bài kiểm tra, bài tập, tài liệu thư viện và tài
          nguyên khác được cung cấp cho mục đích học tập theo phạm vi quyền truy
          cập tương ứng. Nội dung có thể do EduAI, người hướng dẫn, đối tác hoặc
          người dùng cung cấp.
        </p>
        <p>
          Bạn không được sao chép, bán lại, phát tán, tải xuống hàng loạt, trích
          xuất hoặc sử dụng tài nguyên ngoài phạm vi được cho phép bởi EduAI,
          chủ sở hữu nội dung hoặc pháp luật áp dụng.
        </p>
      </>
    ),
  },
  {
    id: "terms-user-duties",
    title: "Quyền và nghĩa vụ của người dùng",
    render: () => (
      <>
        <p>
          Bạn có quyền truy cập các tính năng phù hợp với tài khoản và quyền sử
          dụng của mình, xem thông tin công khai, quản lý nội dung do mình cung
          cấp và gửi yêu cầu hỗ trợ hoặc xóa dữ liệu theo hướng dẫn.
        </p>
        <p>
          Bạn có nghĩa vụ sử dụng EduAI trung thực, tôn trọng người học và người
          hướng dẫn khác, tuân thủ điều kiện của từng tính năng, kiểm tra thông
          tin trước khi dựa vào thông tin đó và chịu trách nhiệm về hoạt động
          phát sinh từ tài khoản của mình.
        </p>
      </>
    ),
  },
  {
    id: "terms-user-content",
    title: "Nội dung do người dùng cung cấp",
    render: () => (
      <>
        <p>
          Nội dung bạn đăng, tải lên hoặc gửi qua EduAI, bao gồm bài viết, bình
          luận, hồ sơ, tài liệu, bài nộp và thông tin trao đổi với tính năng AI,
          phải thuộc quyền sử dụng của bạn hoặc được bạn cho phép sử dụng hợp
          pháp.
        </p>
        <p>
          Bạn cấp cho EduAI quyền không độc quyền, trong phạm vi cần thiết để lưu
          trữ, hiển thị, truyền tải, bảo mật, kiểm duyệt và cung cấp tính năng
          mà bạn yêu cầu. Bạn vẫn giữ quyền đối với nội dung của mình. EduAI có
          thể gỡ hoặc hạn chế nội dung vi phạm Điều khoản, quyền của người khác
          hoặc pháp luật áp dụng.
        </p>
      </>
    ),
  },
  {
    id: "terms-prohibited-conduct",
    title: "Hành vi bị cấm",
    render: () => (
      <ul>
        <li>
          Mạo danh, cung cấp thông tin gian dối, truy cập trái phép hoặc cố gắng
          vượt qua cơ chế phân quyền của EduAI.
        </li>
        <li>
          Phát tán mã độc, gửi yêu cầu gây quá tải, dò quét, can thiệp hoặc làm
          gián đoạn website, API, tài khoản hay hạ tầng của EduAI.
        </li>
        <li>
          Xâm phạm quyền riêng tư, quyền sở hữu trí tuệ, danh dự hoặc an toàn của
          người khác; đăng nội dung bất hợp pháp, lừa đảo, quấy rối hoặc thù ghét.
        </li>
        <li>
          Dùng nội dung, kết quả AI, voucher, quyền truy cập khóa học hoặc tài
          khoản cho mục đích trái với phạm vi được cấp.
        </li>
      </ul>
    ),
  },
  {
    id: "terms-intellectual-property",
    title: "Quyền sở hữu trí tuệ",
    render: () => (
      <>
        <p>
          Giao diện, thương hiệu EduAI, phần mềm, cấu trúc dữ liệu, tài liệu do
          EduAI tạo và các thành phần liên quan thuộc EduAI hoặc chủ sở hữu hợp
          pháp tương ứng. Điều khoản này không chuyển giao quyền sở hữu cho bạn.
        </p>
        <p>
          Tên, logo và nội dung của bên thứ ba thuộc về chủ sở hữu của chúng.
          Mọi quyền không được cấp rõ ràng trong Điều khoản này đều được bảo lưu.
        </p>
      </>
    ),
  },
  {
    id: "terms-ai-features",
    title: "Tính năng AI",
    render: () => (
      <>
        <p>
          EduAI có thể cung cấp trò chuyện AI, lộ trình học tập, công cụ hỗ trợ,
          câu hỏi được tạo tự động, thẻ ghi nhớ hoặc tính năng tương tự tùy theo
          tài khoản và cấu hình tại thời điểm sử dụng. Tính năng AI có thể dùng
          nội dung câu hỏi, ngữ cảnh khóa học và dữ liệu bạn chủ động gửi.
        </p>
        <p>
          Bạn không được gửi thông tin mà mình không có quyền chia sẻ, dữ liệu
          nhạy cảm không cần thiết hoặc yêu cầu AI thực hiện hành vi trái pháp
          luật. Không sử dụng AI của EduAI như một sự thay thế cho tư vấn y tế,
          pháp lý, tài chính hoặc quyết định chuyên môn.
        </p>
      </>
    ),
  },
  {
    id: "terms-ai-output-limits",
    title: "Nội dung do AI tạo ra và giới hạn của AI",
    render: () => (
      <>
        <p>
          Nội dung do AI tạo ra chỉ mang tính hỗ trợ tham khảo và có thể không
          đầy đủ, không phù hợp với ngữ cảnh hoặc có sai sót. EduAI không cam
          kết rằng kết quả AI luôn chính xác, nguyên bản, cập nhật hoặc phù hợp
          với mục tiêu riêng của bạn.
        </p>
        <p>
          Bạn chịu trách nhiệm về cách sử dụng kết quả AI, bao gồm việc đánh giá
          quyền sử dụng, độ an toàn, độ chính xác và sự phù hợp trước khi chia sẻ
          hoặc đưa ra quyết định dựa trên kết quả đó.
        </p>
      </>
    ),
  },
  {
    id: "terms-ai-verification",
    title: "Khuyến cáo người dùng kiểm chứng kết quả AI",
    render: () => (
        <p>
          Người dùng cần tự kiểm chứng kết quả AI bằng tài liệu học tập, nguồn
          đáng tin cậy hoặc người có chuyên môn phù hợp. Với bài nộp, hồ sơ nghề
          nghiệp, quyết định học tập hoặc công việc, bạn cần đọc, chỉnh sửa và
          chịu trách nhiệm về nội dung cuối cùng trước khi sử dụng.
        </p>
    ),
  },
  {
    id: "terms-courses-certificates-progress",
    title: "Khóa học, chứng chỉ và tiến độ học tập",
    render: () => (
      <>
        <p>
          Nội dung khóa học, bài học, bài kiểm tra, bài tập, điểm danh và tiến
          độ được hiển thị theo khóa học hoặc lớp học mà bạn được cấp quyền.
          Quyền truy cập có thể phụ thuộc vào đăng ký, thời hạn, tư cách thành
          viên hoặc điều kiện của khóa học.
        </p>
        <p>
          Chứng chỉ hoặc trạng thái hoàn thành chỉ phản ánh dữ liệu và điều kiện
          của EduAI tại thời điểm cấp. Chứng chỉ của EduAI không mặc nhiên là
          văn bằng, chứng nhận nghề nghiệp hoặc sự công nhận của cơ quan bên
          ngoài.
        </p>
      </>
    ),
  },
  {
    id: "terms-commerce-payment",
    title: "Tính năng thương mại và thanh toán",
    render: () => (
      <>
        <p>
          EduAI có thể cung cấp giỏ hàng, đơn hàng, khóa học hoặc gói thành
          viên trả phí, mã ưu đãi, học bổng và các trạng thái giao dịch tùy
          theo sản phẩm được hiển thị. Giá, tiền tệ, điều kiện áp dụng và nội
          dung cung cấp là thông tin được hiển thị trong quy trình đặt hàng.
        </p>
        <p>
          Thanh toán có thể được xử lý bởi cổng hoặc nhà cung cấp thanh toán
          bên thứ ba. Bạn cần cung cấp thông tin chính xác và tuân thủ điều
          khoản của nhà cung cấp đó. Khi có vấn đề về đơn hàng hoặc giao dịch,
          hãy liên hệ EduAI qua kênh hỗ trợ được nêu ở cuối trang để được kiểm
          tra theo hồ sơ giao dịch.
        </p>
      </>
    ),
  },
  {
    id: "terms-suspension",
    title: "Chính sách tạm ngừng/chấm dứt tài khoản",
    render: () => (
      <p>
        EduAI có thể tạm ngừng, giới hạn hoặc chấm dứt quyền truy cập khi cần
        bảo vệ an toàn hệ thống, điều tra hành vi vi phạm, thực hiện yêu cầu
        pháp luật hoặc xử lý việc sử dụng có thể gây hại cho người khác. Khi
        phù hợp, EduAI có thể thông báo lý do và hướng dẫn khắc phục. Việc
        chấm dứt không tự động hủy các nghĩa vụ đã phát sinh trước đó.
      </p>
    ),
  },
  {
    id: "terms-deletion",
    title: "Xóa tài khoản và dữ liệu",
    render: () => (
      <p>
        Bạn có thể gửi yêu cầu xóa tài khoản và dữ liệu theo hướng dẫn tại{" "}
        <Link to="/data-deletion">trang yêu cầu xóa dữ liệu</Link>. EduAI sẽ
        xác minh phạm vi và người yêu cầu trước khi xử lý. Một số thông tin có
        thể được giữ lại trong thời hạn cần thiết cho nghĩa vụ pháp lý, an
        toàn, giải quyết tranh chấp hoặc đối soát giao dịch.
      </p>
    ),
  },
  {
    id: "terms-third-party",
    title: "Dịch vụ của bên thứ ba",
    render: () => (
      <p>
        Một số tính năng có thể dùng dịch vụ, liên kết hoặc nền tảng của bên
        thứ ba, bao gồm đăng nhập xã hội, thanh toán, lớp học trực tuyến hoặc
        tài nguyên ngoài EduAI. Việc bạn sử dụng các dịch vụ đó chịu sự điều
        chỉnh của điều khoản và chính sách riêng của nhà cung cấp. EduAI không
        kiểm soát mọi thay đổi, thời gian hoạt động hoặc nội dung của dịch vụ
        bên ngoài.
      </p>
    ),
  },
  {
    id: "terms-oauth",
    title: "Google/Facebook/Zalo OAuth",
    render: () => (
      <>
        <p>
          Khi được bật và cấu hình hợp lệ, EduAI có thể hỗ trợ đăng nhập bằng
          Google, Facebook hoặc Zalo. Bạn chỉ nên tiếp tục sau khi xem màn hình
          cấp quyền của nhà cung cấp. EduAI nhận và sử dụng các trường thông tin
          mà nhà cung cấp cho phép, chẳng hạn mã định danh, tên, ảnh đại diện
          và email nếu có; phạm vi thực tế có thể thay đổi theo nhà cung cấp.
        </p>
        <p>
          Mật khẩu do Google, Facebook hoặc Zalo quản lý không được chuyển cho
          EduAI. Việc thu hồi quyền tại nhà cung cấp có thể ngăn lần đăng nhập
          sau, nhưng không tự động xóa tài khoản hoặc dữ liệu EduAI; để yêu cầu
          xóa, hãy dùng hướng dẫn riêng trên{" "}
          <Link to="/data-deletion">trang xóa dữ liệu</Link>.
        </p>
      </>
    ),
  },
  {
    id: "terms-liability",
    title: "Giới hạn trách nhiệm hợp lý",
    render: () => (
      <p>
        Trong phạm vi pháp luật cho phép, EduAI cung cấp dịch vụ theo trạng
        thái sẵn có và không bảo đảm dịch vụ luôn liên tục, không lỗi, đầy đủ
        hoặc phù hợp với mọi mục đích. EduAI không bảo đảm kết quả học tập,
        việc làm, tính chính xác của nội dung bên thứ ba hoặc kết quả AI.
        Điều khoản này không loại trừ trách nhiệm mà pháp luật bắt buộc phải
        giữ lại.
      </p>
    ),
  },
  {
    id: "terms-service-changes",
    title: "Thay đổi dịch vụ",
    render: () => (
      <p>
        EduAI có thể cập nhật, bổ sung, tạm dừng hoặc ngừng một phần tính năng
        để bảo trì, bảo mật, cải thiện sản phẩm hoặc đáp ứng yêu cầu pháp lý.
        Với thay đổi quan trọng, EduAI sẽ cố gắng thông báo bằng kênh phù hợp
        với khả năng của hệ thống.
      </p>
    ),
  },
  {
    id: "terms-changes",
    title: "Thay đổi điều khoản",
    render: () => (
      <p>
        EduAI có thể sửa đổi Điều khoản sử dụng khi dịch vụ, pháp luật hoặc
        cách xử lý rủi ro thay đổi. Phiên bản mới sẽ được đăng công khai trên
        trang này cùng ngày cập nhật. Việc tiếp tục sử dụng sau khi điều khoản
        mới có hiệu lực được hiểu là bạn đã có cơ hội xem và chấp nhận nội dung
        cập nhật.
      </p>
    ),
  },
  {
    id: "terms-law",
    title: "Luật áp dụng",
    render: () => (
      <p>
        Các bên sẽ cố gắng giải quyết thiện chí mọi vấn đề phát sinh từ dịch
        vụ. Các vấn đề chưa được quy định tại Điều khoản này sẽ được xem xét
        theo pháp luật áp dụng và các quyền bắt buộc của người tiêu dùng, nếu
        có.
      </p>
    ),
  },
  {
    id: "terms-contact",
    title: "Thông tin liên hệ",
    render: () => (
      <p>
        Để hỏi về Điều khoản sử dụng, quyền truy cập hoặc giao dịch, bạn có thể
        gọi{" "}
        <a href={HOTLINE_HREF}>{HOTLINE_DISPLAY}</a> hoặc truy cập{" "}
        <a href="https://giaoducso.org.vn/" rel="noreferrer" target="_blank">
          cổng thông tin hỗ trợ
        </a>
        . Vui lòng không gửi mật khẩu, mã xác thực hoặc thông tin thanh toán
        đầy đủ qua kênh liên hệ.
      </p>
    ),
  },
];

const PRIVACY_SECTIONS: readonly LegalSectionDefinition[] = [
  {
    id: "privacy-scope",
    title: "Phạm vi và nguyên tắc",
    render: () => (
      <>
        <p>
          Chính sách này mô tả cách EduAI có thể thu thập, sử dụng, chia sẻ và
          lưu giữ dữ liệu khi bạn truy cập website, tạo tài khoản, học tập,
          dùng AI, tham gia cộng đồng hoặc sử dụng tính năng giao dịch.
        </p>
        <p>
          EduAI chỉ nên xử lý dữ liệu cần thiết cho mục đích đã nêu. Bạn có thể
          xem{" "}
          <Link to="/terms">Điều khoản sử dụng</Link> để hiểu các quy tắc
          dùng dịch vụ và xem{" "}
          <Link to="/data-deletion">Yêu cầu xóa dữ liệu</Link> để gửi yêu cầu.
        </p>
      </>
    ),
  },
  {
    id: "privacy-account",
    title: "Dữ liệu tài khoản và đăng nhập",
    render: () => (
      <p>
        Tùy cách bạn đăng ký, EduAI có thể xử lý email, họ tên, ảnh đại diện,
        trạng thái xác minh email, vai trò, trạng thái tài khoản và thông tin
        định danh của tài khoản. Nếu bạn dùng đăng nhập bằng mật khẩu, hệ
        thống lưu bộ kiểm chứng được bảo vệ thay vì mật khẩu dạng văn bản
        thuần. Với Google, Facebook hoặc Zalo, EduAI có thể nhận mã định danh,
        tên, ảnh đại diện và email nếu nhà cung cấp cung cấp trường đó; EduAI
        không nhận hoặc lưu mật khẩu của các nhà cung cấp này.
      </p>
    ),
  },
  {
    id: "privacy-profile-learning",
    title: "Dữ liệu hồ sơ, học tập và nội dung",
    render: () => (
      <p>
        Nếu bạn chọn cung cấp, dữ liệu có thể gồm số điện thoại, ngày sinh,
        tiểu sử, chức danh, địa điểm, website, đường dẫn hồ sơ công khai, mục
        tiêu nghề nghiệp, vị trí mong muốn, hình thức làm việc và trạng thái
        sẵn sàng. EduAI cũng có thể lưu khóa học hoặc lớp học đã tham gia,
        bài học, tiến độ, điểm kiểm tra, bài tập, điểm danh, chứng chỉ, nội
        dung bài đăng, bình luận, lượt tương tác, hồ sơ nghề nghiệp, đơn ứng
        tuyển, lịch mentor và các hoạt động bạn thực hiện trong dịch vụ.
      </p>
    ),
  },
  {
    id: "privacy-ai",
    title: "Dữ liệu khi sử dụng tính năng AI",
    render: () => (
      <p>
        Khi bạn dùng trò chuyện AI, lộ trình học tập, bài kiểm tra hoặc thẻ
        ghi nhớ được tạo tự động, EduAI có thể lưu câu hỏi, tin nhắn, ngữ cảnh
        học tập, đầu vào lộ trình và kết quả được tạo ra để cung cấp, hiển thị
        lại và cải thiện tính năng. Không gửi thông tin nhạy cảm không cần
        thiết hoặc dữ liệu của người khác khi bạn không có quyền chia sẻ.
        Kết quả AI có thể được xử lý bởi nhà cung cấp AI được cấu hình cho
        dịch vụ.
      </p>
    ),
  },
  {
    id: "privacy-purpose",
    title: "Mục đích sử dụng dữ liệu",
    render: () => (
      <p>
        EduAI sử dụng dữ liệu để tạo và bảo vệ tài khoản, cung cấp khóa học và
        lớp học, ghi nhận tiến độ, vận hành cộng đồng và các tính năng nghề
        nghiệp, hỗ trợ AI theo yêu cầu, xử lý giao dịch, gửi thông báo cần
        thiết, hỗ trợ người dùng, phát hiện lạm dụng và duy trì an toàn,
        ổn định của dịch vụ. Dữ liệu cũng có thể được dùng để đáp ứng nghĩa vụ
        pháp lý hoặc giải quyết tranh chấp khi cần.
      </p>
    ),
  },
  {
    id: "privacy-commerce",
    title: "Dữ liệu thương mại và thanh toán",
    render: () => (
      <p>
        Khi bạn dùng tính năng thương mại, EduAI có thể xử lý dữ liệu giỏ hàng,
        đơn hàng, khóa học hoặc gói thành viên, mã ưu đãi, học bổng, số tiền,
        tiền tệ, trạng thái giao dịch và mã tham chiếu do nhà cung cấp thanh
        toán trả về. Thông tin thanh toán nhạy cảm có thể được nhập và xử lý
        trực tiếp bởi cổng thanh toán theo chính sách của họ; bạn không nên gửi
        đầy đủ thông tin thẻ hoặc mã bí mật cho EduAI qua kênh hỗ trợ.
      </p>
    ),
  },
  {
    id: "privacy-technical",
    title: "Phiên đăng nhập và dữ liệu kỹ thuật",
    render: () => (
      <p>
        Trình duyệt có thể lưu thông tin phiên đăng nhập và lựa chọn giao diện
        cần thiết để website hoạt động. Hệ thống có thể xử lý địa chỉ IP hoặc
        dữ liệu tương tự để giới hạn tốc độ, bảo vệ chống lạm dụng, ghi nhận
        yêu cầu và điều tra sự cố. Nhật ký vận hành hoặc công cụ theo dõi lỗi,
        khi được cấu hình, có thể ghi phương thức, đường dẫn, trạng thái,
        thời lượng, mã tương quan và thời điểm xảy ra lỗi; EduAI cố gắng
        tránh đưa thông tin xác thực vào các bản ghi này.
      </p>
    ),
  },
  {
    id: "privacy-sharing",
    title: "Chia sẻ dữ liệu và nhà cung cấp",
    render: () => (
      <p>
        EduAI có thể chia sẻ dữ liệu cần thiết với nhà cung cấp giúp vận hành
        tính năng, chẳng hạn Firebase hoặc nhà cung cấp đăng nhập, Google,
        Facebook, Zalo, nhà cung cấp AI, cổng thanh toán, dịch vụ lớp học,
        email, lưu trữ, hosting hoặc theo dõi lỗi khi các dịch vụ đó được bật.
        Chỉ phạm vi cần thiết cho yêu cầu của bạn nên được gửi. Nhà cung cấp
        xử lý dữ liệu theo điều khoản và chính sách riêng của họ.
      </p>
    ),
  },
  {
    id: "privacy-retention",
    title: "Thời hạn lưu giữ và xóa dữ liệu",
    render: () => (
      <p>
        EduAI lưu dữ liệu trong thời gian cần thiết để cung cấp tính năng,
        duy trì an toàn tài khoản, hỗ trợ người dùng, đối soát giao dịch hoặc
        đáp ứng nghĩa vụ pháp lý. Khi không còn cần thiết, dữ liệu có thể được
        xóa, ẩn danh hoặc giới hạn truy cập theo quy trình phù hợp. Yêu cầu
        xóa tài khoản và dữ liệu hiện được tiếp nhận theo quy trình thủ công
        tại{" "}
        <Link to="/data-deletion">trang yêu cầu xóa dữ liệu</Link>; một số
        bản ghi có thể cần được giữ lại trong thời hạn hợp lý cho các mục đích
        nêu trên.
      </p>
    ),
  },
  {
    id: "privacy-rights",
    title: "Lựa chọn và yêu cầu của bạn",
    render: () => (
      <p>
        Bạn có thể yêu cầu xem, sửa hoặc xóa dữ liệu tài khoản, đồng thời có
        thể thu hồi quyền đăng nhập xã hội tại nhà cung cấp tương ứng. EduAI
        có thể cần xác minh người yêu cầu trước khi tiết lộ hoặc xử lý dữ
        liệu. Để bắt đầu, hãy gọi {HOTLINE_DISPLAY} và nêu rõ email hoặc
        phương thức đăng nhập đang dùng; không gửi mật khẩu, mã xác thực hoặc
        khóa truy cập.
      </p>
    ),
  },
  {
    id: "privacy-changes",
    title: "Thay đổi chính sách và liên hệ",
    render: () => (
      <p>
        Chính sách này có thể được cập nhật khi sản phẩm, nhà cung cấp hoặc
        yêu cầu pháp lý thay đổi. Phiên bản mới sẽ được đăng tại trang này
        cùng ngày cập nhật. Nếu có câu hỏi về quyền riêng tư, bạn có thể gọi{" "}
        {HOTLINE_DISPLAY} hoặc truy cập{" "}
        <a href="https://giaoducso.org.vn/" rel="noreferrer" target="_blank">
          cổng thông tin hỗ trợ
        </a>
        . Vui lòng không gửi thông tin bí mật qua liên kết công khai.
      </p>
    ),
  },
];

const DATA_DELETION_SECTIONS: readonly LegalSectionDefinition[] = [
  {
    id: "data-deletion-scope",
    title: "Phạm vi yêu cầu xóa",
    render: () => (
      <p>
        Bạn có thể yêu cầu xóa tài khoản EduAI và dữ liệu gắn với tài khoản,
        trong phạm vi có thể xác minh và xử lý. Yêu cầu có thể bao gồm hồ sơ,
        dữ liệu đăng nhập, tiến độ học tập, nội dung AI và nội dung hoạt động
        do bạn tạo. Dữ liệu đã được pháp luật yêu cầu lưu, cần cho an toàn,
        đối soát hoặc giải quyết tranh chấp có thể được giữ lại trong thời
        hạn cần thiết và được giới hạn mục đích.
      </p>
    ),
  },
  {
    id: "data-deletion-provider",
    title: "Thu hồi quyền từ nhà cung cấp đăng nhập",
    render: () => (
      <>
        <p>
          Nếu bạn đăng nhập bằng Facebook, hãy mở phần cài đặt Facebook, vào
          <strong> Ứng dụng và trang web (Apps and Websites)</strong>, chọn
          EduAI và thu hồi quyền truy cập nếu muốn ngắt kết nối Facebook.
          Trong trường hợp Google hoặc Zalo, hãy dùng phần quản lý ứng dụng
          hoặc quyền liên kết của nhà cung cấp tương ứng.
        </p>
        <p>
          Thu hồi quyền hoặc gỡ EduAI khỏi danh sách ứng dụng chỉ ngăn việc
          cấp quyền hoặc đăng nhập tiếp theo; thao tác đó{" "}
          việc gỡ ứng dụng không thay thế yêu cầu xóa dữ liệu EduAI. Hãy gửi
          yêu cầu theo hướng dẫn bên dưới nếu bạn muốn xóa dữ liệu EduAI.
        </p>
      </>
    ),
  },
  {
    id: "data-deletion-request",
    title: "Cách gửi yêu cầu",
    render: () => (
      <p>
        Gọi{" "}
        <a href={HOTLINE_HREF}>{HOTLINE_DISPLAY}</a> hoặc truy cập{" "}
        <a href="https://giaoducso.org.vn/" rel="noreferrer" target="_blank">
          cổng thông tin hỗ trợ
        </a>{" "}
        và ghi rõ: “Yêu cầu xóa tài khoản và dữ liệu EduAI”. Hãy cung cấp họ
        tên, email hoặc phương thức đăng nhập đã dùng và nêu rõ bạn muốn xóa
        toàn bộ tài khoản hay chỉ một nhóm dữ liệu.{" "}
        <strong>Không gửi mật khẩu, mã xác thực, token hoặc thông tin thanh
        toán đầy đủ.</strong>
      </p>
    ),
  },
  {
    id: "data-deletion-verification",
    title: "Xác minh quyền yêu cầu",
    render: () => (
      <p>
        Để tránh xóa nhầm tài khoản, EduAI có thể yêu cầu thông tin giới hạn
        giúp xác minh bạn là chủ tài khoản hoặc người được ủy quyền. EduAI
        không yêu cầu bạn cung cấp mật khẩu hay mã xác thực qua hotline hoặc
        biểu mẫu hỗ trợ. Nếu không thể xác minh, yêu cầu có thể cần bổ sung
        thông tin hoặc chưa thể xử lý.
      </p>
    ),
  },
  {
    id: "data-deletion-processing",
    title: "Quy trình xử lý",
    render: () => (
      <p>
        Yêu cầu hiện được tiếp nhận và xử lý thủ công: EduAI tiếp nhận, xác
        minh, rà soát phạm vi dữ liệu, thực hiện xóa hoặc giới hạn dữ liệu có
        thể xóa, rồi phản hồi qua kênh liên hệ phù hợp. EduAI{" "}
        <strong>không tự động xóa tài khoản EduAI</strong> chỉ vì bạn gỡ ứng
        dụng khỏi Facebook, Google hoặc Zalo. Thời gian xử lý phụ thuộc vào
        việc xác minh, phạm vi yêu cầu và các nghĩa vụ lưu giữ áp dụng.
      </p>
    ),
  },
  {
    id: "data-deletion-support",
    title: "Thông tin bổ sung",
    render: () => (
      <p>
        Bạn có thể đọc thêm{" "}
        <Link to="/privacy">Chính sách bảo mật</Link> và{" "}
        <Link to="/terms">Điều khoản sử dụng</Link>. Nếu cần hỗ trợ về yêu cầu
        xóa, hãy gọi{" "}
        <a href={HOTLINE_HREF}>{HOTLINE_DISPLAY}</a>. Vui lòng giữ lại thông
        tin liên hệ của yêu cầu để EduAI có thể tra cứu và phản hồi.
      </p>
    ),
  },
];

export function LegalContent({ kind }: { kind: LegalPageKind }): ReactNode {
  const sections = getLegalSections(kind);

  return (
    <div className="legal-page__body">
      {sections.map((section) => (
        <section aria-labelledby={section.id} id={section.id + "-section"} key={section.id}>
          <h2 id={section.id}>{section.title}</h2>
          {section.render()}
        </section>
      ))}
    </div>
  );
}

export function getLegalSectionSummaries(kind: LegalPageKind): LegalSectionSummary[] {
  return getLegalSections(kind).map(({ id, title }) => ({ id, title }));
}

function getLegalSections(kind: LegalPageKind): readonly LegalSectionDefinition[] {
  if (kind === "terms") return TERMS_SECTIONS;
  if (kind === "privacy") return PRIVACY_SECTIONS;
  return DATA_DELETION_SECTIONS;
}
