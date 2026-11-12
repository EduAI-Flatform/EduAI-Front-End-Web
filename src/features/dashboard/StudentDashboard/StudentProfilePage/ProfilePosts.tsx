import { SystemValue, SystemText } from '@/features/platform/SystemText';
import { useEffect, useState } from 'react';
import { communityService, type CommunityPost } from '../../../../services/community.service';
import { usePlatform } from '../../../platform/PlatformProvider';

export function ProfilePosts() {
  const { t, locale } = usePlatform();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    communityService.listOwnPosts(page).then(result => { if (active) { setPosts(result.items); setPages(result.totalPages); } })
      .catch(() => { if (active) setError(t('Không tải được bài viết.', 'Unable to load posts.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, locale]);
  return <section className="student-profile-card student-profile-bio">
    <h2>{t('Bài viết của tôi', 'My posts')}</h2>
    {loading && <p role="status">{t('Đang tải…', 'Loading…')}</p>}
    {error && <p role="alert"><SystemText message={error} /></p>}
    {!loading && !error && !posts.length && <p>{t('Bạn chưa có bài viết.', 'You have not written any posts yet.')}</p>}
    {posts.map(post => <article key={post.id} className="student-profile-post"><h3>{post.title}</h3><p>{post.content}</p><small><SystemValue render={() => (new Date(post.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US'))} /> · {post.visibility === 'private' ? t('Riêng tư', 'Private') : t('Công khai', 'Public')}</small></article>)}
    {pages > 1 && <nav aria-label={t('Trang bài viết', 'Post pages')}><button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>{t('Trước', 'Previous')}</button><span>{page} / {pages}</span><button disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>{t('Sau', 'Next')}</button></nav>}
  </section>;
}
