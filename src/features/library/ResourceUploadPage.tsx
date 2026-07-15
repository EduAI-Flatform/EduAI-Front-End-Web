import { AlertCircle, ArrowLeft, CheckCircle2, FileUp, UploadCloud } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLibraryErrorMessage, libraryService, type LibraryCategory, type LibraryResourceType, type LibraryTag } from "../../services/library.service";
import "./ResourceUploadPage.css";

const maxFileSize = 50 * 1024 * 1024;
const resourceTypes: Array<{ value: LibraryResourceType; label: string }> = [
  { value: "pdf", label: "Tài liệu PDF" }, { value: "docx", label: "Tài liệu Word" },
  { value: "pptx", label: "Bài trình chiếu" }, { value: "video", label: "Video" }, { value: "image", label: "Hình ảnh" },
];

export function ResourceUploadPage() {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [tags, setTags] = useState<LibraryTag[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState<LibraryResourceType | "">("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([libraryService.listCategories(), libraryService.listTags()])
      .then(([nextCategories, nextTags]) => { if (mounted) { setCategories(nextCategories); setTags(nextTags); } })
      .catch((error) => { if (mounted) setFormError(getLibraryErrorMessage(error)); })
      .finally(() => { if (mounted) setIsLoadingOptions(false); });
    return () => { mounted = false; };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setFileError(nextFile ? validateFile(nextFile, type) : "Chọn một tệp để tải lên.");
  }

  function toggleTag(tagId: string) {
    setTagIds((current) => current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null); setSuccessMessage(null);
    if (!title.trim() || !categoryId || !type || !file) { setFormError("Vui lòng điền đầy đủ tiêu đề, danh mục, định dạng và tệp tải lên."); return; }
    const nextFileError = validateFile(file, type);
    if (nextFileError) { setFileError(nextFileError); return; }
    setIsSubmitting(true);
    try {
      await libraryService.uploadResource({ file, title, description, categoryId, type, visibility, tagIds });
      setTitle(""); setDescription(""); setCategoryId(""); setType(""); setVisibility("public"); setTagIds([]); setFile(null); setFileError(null);
      setSuccessMessage("Tài nguyên đã được tải lên thư viện thành công.");
      const input = document.getElementById("resource-file") as HTMLInputElement | null; if (input) input.value = "";
    } catch (error) { setFormError(getLibraryErrorMessage(error)); } finally { setIsSubmitting(false); }
  }

  return <div className="resource-upload-page">
    <div className="resource-upload-page__header">
      <Link className="resource-upload-page__back" to="/instructor/dashboard/library"><ArrowLeft aria-hidden="true" /> Quay lại thư viện</Link>
      <span className="library-eyebrow">Kho tài nguyên</span><h1>Tải tài nguyên mới</h1><p>Chia sẻ tài liệu học tập hữu ích với cộng đồng EduAI.</p>
    </div>
    <form className="resource-upload-form" onSubmit={submitForm}>
      {formError ? <div className="resource-upload-alert resource-upload-alert--error" role="alert"><AlertCircle aria-hidden="true" />{formError}</div> : null}
      {successMessage ? <div className="resource-upload-alert resource-upload-alert--success" role="status"><CheckCircle2 aria-hidden="true" />{successMessage}</div> : null}
      <section className="resource-upload-card">
        <div className="resource-upload-card__heading"><UploadCloud aria-hidden="true" /><div><h2>Thông tin tài nguyên</h2><p>Các trường có dấu * là bắt buộc.</p></div></div>
        <label className="resource-upload-field resource-upload-field--wide"><span>Tiêu đề tài nguyên *</span><input maxLength={160} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Nhập môn trí tuệ nhân tạo" required value={title} /></label>
        <label className="resource-upload-field resource-upload-field--wide"><span>Mô tả</span><textarea maxLength={1000} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả ngắn gọn nội dung tài nguyên..." rows={4} value={description} /></label>
        <div className="resource-upload-form__grid">
          <label className="resource-upload-field"><span>Danh mục *</span><select disabled={isLoadingOptions} onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="resource-upload-field"><span>Định dạng *</span><select onChange={(event) => { const next = event.target.value as LibraryResourceType | ""; setType(next); if (file && next) setFileError(validateFile(file, next)); }} required value={type}><option value="">Chọn định dạng</option>{resourceTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="resource-upload-field"><span>Phạm vi hiển thị</span><select onChange={(event) => setVisibility(event.target.value as "public" | "private")} value={visibility}><option value="public">Công khai</option><option value="private">Riêng tư</option></select></label>
        </div>
      </section>
      <section className="resource-upload-card">
        <div className="resource-upload-card__heading"><FileUp aria-hidden="true" /><div><h2>Tệp tải lên</h2><p>Định dạng và dung lượng phải phù hợp với lựa chọn bên trên.</p></div></div>
        <label className="resource-upload-dropzone" htmlFor="resource-file"><FileUp aria-hidden="true" /><strong>{file ? file.name : "Chọn tệp tài nguyên"}</strong><span>{file ? formatFileSize(file.size) : "Tối đa 50 MB"}</span><input accept={acceptFor(type)} id="resource-file" onChange={handleFileChange} type="file" /></label>
        {fileError ? <p className="resource-upload-field__error" role="alert">{fileError}</p> : null}
      </section>
      <section className="resource-upload-card">
        <div className="resource-upload-card__heading"><span className="resource-upload-card__tag-icon">#</span><div><h2>Thẻ tìm kiếm</h2><p>Chọn các thẻ giúp người học tìm thấy tài nguyên.</p></div></div>
        {tags.length ? <div className="resource-upload-tags">{tags.map((tag) => <label key={tag.id}><input checked={tagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} type="checkbox" /><span>{tag.name}</span></label>)}</div> : <p className="resource-upload-muted">Chưa có thẻ nào được tạo.</p>}
      </section>
      <div className="resource-upload-form__actions"><Link className="resource-upload-button resource-upload-button--secondary" to="/instructor/dashboard/library">Hủy</Link><button className="resource-upload-button resource-upload-button--primary" disabled={isSubmitting || isLoadingOptions} type="submit">{isSubmitting ? "Đang tải lên..." : "Tải tài nguyên"}</button></div>
    </form>
  </div>;
}

function acceptFor(type: LibraryResourceType | "") { return type === "video" ? "video/*" : type === "image" ? "image/*" : type ? `.${type}` : ".pdf,.docx,.pptx,video/*,image/*"; }
function validateFile(file: File, type: LibraryResourceType | ""): string | null {
  if (file.size > maxFileSize) return "Tệp không được vượt quá 50 MB.";
  if (!type) return "Chọn định dạng trước khi chọn tệp.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const valid = type === "video" ? extension === "mp4" : type === "image" ? ["jpg", "jpeg", "png", "webp"].includes(extension ?? "") : extension === type;
  return valid ? null : `Tệp không đúng định dạng ${type.toUpperCase()}.`;
}
function formatFileSize(size: number) { return `${(size / (1024 * 1024)).toFixed(2)} MB`; }
