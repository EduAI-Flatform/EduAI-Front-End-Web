import { BookOpen, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthSession } from "../auth/auth-store";
import { CommunityComposer } from "./CommunityComposer";
import { CommunityPostCard } from "./CommunityPostCard";
import { communityService, getCommunityErrorMessage, type CommunityPost } from "../../services/community.service";
import "./CommunityPage.css";

export function CommunityPage() {
  const session = useAuthSession();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    communityService
      .listPosts()
      .then((nextPosts) => {
        if (!isMounted) return;
        setPosts(nextPosts);
      })
      .catch((error) => {
        if (!isMounted) return;
        setPosts([]);
        setErrorMessage(getCommunityErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [retryToken]);

  function handleCreated(post: CommunityPost) {
    setPosts((currentPosts) => [post, ...currentPosts]);
  }

  return (
    <div className="community-page">
      <section className="community-hero">
        <div className="community-hero__orb community-hero__orb--one" aria-hidden="true" />
        <div className="community-hero__orb community-hero__orb--two" aria-hidden="true" />
        <div className="container community-hero__content">
          <span className="community-eyebrow">Không gian kết nối</span>
          <h1>Cộng đồng học tập</h1>
          <p>Cùng chia sẻ kiến thức, đặt câu hỏi và tạo động lực học tập mỗi ngày.</p>
          <div className="community-hero__stats" aria-label="Thông tin cộng đồng">
            <span><Users aria-hidden="true" /> Học cùng nhau</span>
            <span><BookOpen aria-hidden="true" /> Chia sẻ điều hữu ích</span>
          </div>
        </div>
      </section>

      <main className="container community-main">
        <div className="community-layout">
          <div className="community-feed-column">
            <CommunityComposer isAuthenticated={Boolean(session)} onCreated={handleCreated} />
            {isLoading ? <CommunitySkeleton /> : null}
            {!isLoading && errorMessage ? (
              <CommunityState message={errorMessage} onRetry={() => setRetryToken((value) => value + 1)} tone="error" />
            ) : null}
            {!isLoading && !errorMessage && posts.length === 0 ? (
              <CommunityState message="Hãy là người đầu tiên chia sẻ một câu hỏi hoặc ý tưởng với cộng đồng." title="Chưa có bài viết nào" />
            ) : null}
            {!isLoading && !errorMessage && posts.length > 0 ? (
              <section className="community-feed" aria-label="Bảng tin cộng đồng">
                <div className="community-section-heading">
                  <div>
                    <span className="community-eyebrow">Bảng tin mới nhất</span>
                    <h2>Cuộc trò chuyện gần đây</h2>
                  </div>
                  <span>{posts.length} bài viết</span>
                </div>
                <div className="community-post-list">
                  {posts.map((post) => <CommunityPostCard key={post.id} post={post} />)}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="community-aside">
            <div className="community-aside__card community-aside__card--accent">
              <span className="community-aside__icon"><Users aria-hidden="true" /></span>
              <h2>Học tập hiệu quả hơn khi có cộng đồng</h2>
              <p>Đặt câu hỏi rõ ràng, chia sẻ nguồn học tập và cùng nhau tiến bộ.</p>
            </div>
            <div className="community-aside__card">
              <span className="community-eyebrow">Gợi ý đăng bài</span>
              <ul>
                <li>Đặt tiêu đề ngắn gọn, dễ hiểu.</li>
                <li>Chia sẻ bối cảnh để nhận phản hồi tốt hơn.</li>
                <li>Tôn trọng và hỗ trợ những người học khác.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải bảng tin" className="community-post-list">
      {[1, 2, 3].map((item) => <div className="community-post-card community-post-card--skeleton" key={item}><span /><i /><i /><i /></div>)}
    </div>
  );
}

function CommunityState({ message, onRetry, title = "Không thể hiển thị cộng đồng", tone = "empty" }: { message: string; onRetry?: () => void; title?: string; tone?: "empty" | "error" }) {
  return (
    <section className={`community-state community-state--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <RefreshCw aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry ? <button onClick={onRetry} type="button">Thử lại</button> : null}
    </section>
  );
}
