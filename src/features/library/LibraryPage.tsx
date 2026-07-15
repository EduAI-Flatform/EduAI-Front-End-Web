import {
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileText,
  Film,
  Presentation,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  getLibraryErrorMessage,
  libraryService,
  type LibraryCategory,
  type LibraryResource,
  type LibraryResourceType,
  type LibraryTag,
} from "../../services/library.service";
import "./LibraryPage.css";

const pageSize = 12;
const typeLabels: Record<LibraryResourceType, string> = {
  docx: "Tài liệu Word",
  image: "Hình ảnh",
  pdf: "Tài liệu PDF",
  pptx: "Bài trình chiếu",
  video: "Video",
};

export function LibraryPage() {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [tags, setTags] = useState<LibraryTag[]>([]);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const [type, setType] = useState<LibraryResourceType | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [retryToken, setRetryToken] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([libraryService.listCategories(), libraryService.listTags()])
      .then(([nextCategories, nextTags]) => {
        if (!isMounted) return;
        setCategories(nextCategories);
        setTags(nextTags);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    libraryService
      .listResources({ page, limit: pageSize, search, categoryId, tagId, type: type || undefined })
      .then((response) => {
        if (!isMounted) return;
        setResources(response.items);
        setTotal(response.total);
        setTotalPages(response.totalPages);
      })
      .catch((error) => {
        if (!isMounted) return;
        setResources([]);
        setErrorMessage(getLibraryErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [categoryId, page, retryToken, search, tagId, type]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }

  function resetFilters() {
    setSearchDraft("");
    setSearch("");
    setCategoryId("");
    setTagId("");
    setType("");
    setPage(1);
  }

  return (
    <div className="library-page">
      <section className="library-hero">
        <div className="library-hero__glow" aria-hidden="true" />
        <div className="library-hero__content">
          <span className="library-eyebrow">Không gian học tập</span>
          <h1>Thư viện số</h1>
          <p>Khám phá tài liệu, video và nguồn học tập được chọn lọc cho hành trình của bạn.</p>
          <form className="library-search" onSubmit={submitSearch}>
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="library-search-input">Tìm kiếm tài liệu</label>
            <input
              id="library-search-input"
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Tìm theo tên tài liệu, danh mục hoặc thẻ..."
              type="search"
              value={searchDraft}
            />
            <button type="submit">Tìm kiếm</button>
          </form>
        </div>
      </section>

      <main className="library-main container">
        <div className="library-toolbar">
          <div>
            <span className="library-eyebrow">Kho tài nguyên</span>
            <h2>Khám phá tài liệu</h2>
          </div>
          <span className="library-count">{total} tài nguyên</span>
        </div>

        <section className="library-filter-panel" aria-label="Bộ lọc thư viện">
          <div className="library-filter-panel__title"><SlidersHorizontal aria-hidden="true" /> Bộ lọc</div>
          <label>
            <span>Danh mục</span>
            <select onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} value={categoryId}>
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>
            <span>Định dạng</span>
            <select onChange={(event) => { setType(event.target.value as LibraryResourceType | ""); setPage(1); }} value={type}>
              <option value="">Tất cả định dạng</option>
              {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Thẻ</span>
            <select onChange={(event) => { setTagId(event.target.value); setPage(1); }} value={tagId}>
              <option value="">Tất cả thẻ</option>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </label>
          <button className="library-filter-reset" onClick={resetFilters} type="button">Xóa lọc</button>
        </section>

        {isLoading ? <LibrarySkeleton /> : null}
        {!isLoading && errorMessage ? <LibraryState message={errorMessage} onRetry={() => setRetryToken((current) => current + 1)} tone="error" /> : null}
        {!isLoading && !errorMessage && resources.length === 0 ? <LibraryState message="Thử thay đổi từ khóa hoặc bộ lọc để tìm tài nguyên phù hợp." title="Chưa có tài nguyên phù hợp" /> : null}
        {!isLoading && !errorMessage && resources.length > 0 ? (
          <>
            <div className="library-grid">
              {resources.map((resource) => <LibraryResourceCard key={resource.id} resource={resource} />)}
            </div>
            <nav className="library-pagination" aria-label="Phân trang tài nguyên">
              <button aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button"><ChevronLeft aria-hidden="true" /></button>
              <span>Trang {page} / {Math.max(totalPages, 1)}</span>
              <button aria-label="Trang sau" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} type="button"><ChevronRight aria-hidden="true" /></button>
            </nav>
          </>
        ) : null}
      </main>
    </div>
  );
}

function LibraryResourceCard({ resource }: { resource: LibraryResource }) {
  const Icon = resource.type === "image" ? FileImage : resource.type === "video" ? Film : resource.type === "pptx" ? Presentation : FileText;
  const resourceUrl = resource.fileUrl ?? resource.externalUrl;

  return (
    <article className="library-card">
      <div className={`library-card__visual library-card__visual--${resource.type}`}><Icon aria-hidden="true" /><span>{resource.type.toUpperCase()}</span></div>
      <div className="library-card__body">
        <span className="library-card__category">{resource.category.name}</span>
        <h3>{resource.title}</h3>
        <p>{resource.description || "Tài nguyên học tập được chia sẻ trong thư viện."}</p>
        <div className="library-card__footer">
          <span>{resource.tags.slice(0, 2).map(({ tag }) => `#${tag.name}`).join(" ") || "Tài nguyên học tập"}</span>
          {resourceUrl ? <a href={resourceUrl} rel="noreferrer" target="_blank">Mở tài liệu</a> : null}
        </div>
      </div>
    </article>
  );
}

function LibrarySkeleton() {
  return <div aria-busy="true" aria-label="Đang tải thư viện" className="library-grid">{[1, 2, 3, 4].map((item) => <div className="library-card library-card--skeleton" key={item}><span /><div><i /><i /><i /></div></div>)}</div>;
}

function LibraryState({ message, onRetry, title = "Không thể hiển thị thư viện", tone = "empty" }: { message: string; onRetry?: () => void; title?: string; tone?: "empty" | "error" }) {
  return <section className={`library-state library-state--${tone}`} role={tone === "error" ? "alert" : "status"}><RefreshCw aria-hidden="true" /><h2>{title}</h2><p>{message}</p>{onRetry ? <button onClick={onRetry} type="button">Thử lại</button> : null}</section>;
}
