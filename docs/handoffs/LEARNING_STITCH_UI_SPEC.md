# Spec: Learning workspace theo Stitch

## Objective

Đưa màn hình học bài về bố cục và thứ bậc thị giác gần với màn “Học bài - AILearn” trong Stitch: curriculum bên trái, nội dung bài ở giữa, trợ lý AI bên phải. Không thay đổi API tiến độ, quiz, assignment hoặc lesson.

## Quyết định giao diện

- Curriculum dùng accordion và luôn hiển thị progress khóa học.
- Vì API hiện chỉ trả `LearningStep[]` phẳng, UI không tự bịa tên chương. Bản hiện tại dùng nhóm “Nội dung khóa học”; cấu trúc có thể mở rộng sang `chapterTitle` khi backend cung cấp metadata.
- Nội dung trung tâm ưu tiên video/document/article thật, sau đó hiển thị metadata, mô tả và takeaway lấy từ `lesson.content` nếu có.
- Trợ lý AI giữ các API hiện tại và có trạng thái online rõ ràng.

## Success criteria

- Màn hình desktop có 3 vùng với curriculum 15–17rem, nội dung co giãn, AI 15–17rem.
- Người dùng có thể mở/đóng curriculum, chọn step, chuyển bài trước/sau và giữ nguyên route hiện tại.
- Step đang chọn có trạng thái màu/biểu tượng rõ ràng, không chỉ phụ thuộc vào màu.
- Ở màn hình nhỏ, thứ tự là nội dung → curriculum → trợ lý AI.
- Test và build hiện tại đều pass.

## Commands

- `npm.cmd test -- --run`
- `npm.cmd run build`

## Boundaries

- Always: giữ API hiện tại, dùng dữ liệu lesson thật, kiểm thử behavior mới.
- Ask first: thay đổi Prisma/API contract hoặc thêm dependency.
- Never: hard-code chương giả hoặc xóa logic lưu tiến độ.
