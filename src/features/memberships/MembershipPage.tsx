import { CheckCircle2, Crown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { formatCommerceMoney } from '../../services/commerce.service';
import {
  getMembershipErrorMessage,
  membershipService,
  type MembershipCatalogItem,
  type MembershipCheckout,
  type MembershipCurrentState,
} from '../../services/membership.service';

export function MembershipPage() {
  const [items, setItems] = useState<MembershipCatalogItem[]>([]);
  const [currentState, setCurrentState] = useState<MembershipCurrentState>({ membership: null, pendingChange: null, expiringGraceCourses: [] });
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [changeKind, setChangeKind] = useState<Record<string, 'UPGRADE' | 'DOWNGRADE'>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<MembershipCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalog, current] = await Promise.all([
        membershipService.catalog(),
        membershipService.current(),
      ]);
      setItems(catalog.items.map((item) => ({ ...item, removedCourses: item.removedCourses ?? [] })));
      setCurrentState({ ...current, expiringGraceCourses: current.expiringGraceCourses ?? [] });
    } catch (reason) {
      setError(getMembershipErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function beginCheckout(item: MembershipCatalogItem) {
    const durationOptionId = selected[item.id] ?? item.durations[0]?.id;
    const current = currentState.membership;
    const changingPlan = Boolean(current && current.status === 'ACTIVE' && current.plan.id !== item.plan.id);
    if (!durationOptionId || !confirmed[item.id] || (changingPlan && !changeKind[item.id])) return;
    setPending(item.id);
    setError(null);
    try {
      setCheckout(await membershipService.checkout({
        versionId: item.id,
        durationOptionId,
        requestedChange: changingPlan ? changeKind[item.id] : undefined,
        changedBenefitsConfirmed: true,
      }));
    } catch (reason) {
      setError(getMembershipErrorMessage(reason));
    } finally {
      setPending(null);
    }
  }

  if (checkout) {
    return (
      <section className="container mx-auto max-w-2xl px-4 py-12" role="status">
        <CheckCircle2 aria-hidden="true" className="mb-4 text-primary" />
        <h1 className="text-2xl font-semibold">Đơn gói thành viên đã được tạo</h1>
        <p className="mt-2">{checkout.order.orderNumber} · {formatCommerceMoney(checkout.order.payable)}</p>
        <p className="mt-2">
          {checkout.paymentRequired
            ? 'Đơn đang chờ thanh toán; quyền lợi chỉ được kích hoạt sau khi thanh toán được máy chủ xác minh.'
            : 'Máy chủ sẽ xử lý đơn không cần thanh toán.'}
        </p>
      </section>
    );
  }

  const current = currentState.membership;
  return (
    <section className="container mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Thành viên EduAI</p>
        <h1 className="text-3xl font-semibold">Chọn gói phù hợp với hành trình học của bạn</h1>
        {current ? (
          <p className="mt-2">
            Gói hiện tại: <strong>{current.displayName}</strong>,{' '}
            {current.status === 'EXPIRED' ? 'đã hết hạn' : 'hết hạn'} {formatDate(current.expiresAt)}.
          </p>
        ) : null}
        {currentState.pendingChange ? (
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            {currentState.pendingChange.action === 'DOWNGRADE' ? 'Hạ cấp' : 'Nâng cấp'} đang chờ:{' '}
            <strong>{currentState.pendingChange.plan.displayName}</strong> · {currentState.pendingChange.order.orderNumber}.
          </p>
        ) : null}
        {currentState.expiringGraceCourses.map((course) => (
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" key={course.courseId} role="status">
            Quyền truy cập gia hạn cho <strong>{course.title}</strong> kết thúc ngày {formatDate(course.graceEndsAt)}. Tiến độ và chứng chỉ vẫn được giữ lại.
          </p>
        ))}
      </header>

      {loading ? <p aria-live="polite" role="status">Đang tải gói thành viên…</p> : null}
      {error ? (
        <div className="mb-4 rounded border border-destructive p-3" role="alert">
          <p>{error}</p>
          <button className="mt-3 rounded border px-3 py-2" onClick={() => void load()} type="button">Thử lại</button>
        </div>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">Chưa có gói thành viên</h2>
          <p className="mt-2 text-muted-foreground">Các gói đang được chuẩn bị. Vui lòng quay lại sau.</p>
        </div>
      ) : null}
      {!loading && items.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2" aria-label="Các gói thành viên">
          {items.map((item) => (
            <MembershipCard
              changeKind={changeKind[item.id]}
              confirmed={Boolean(confirmed[item.id])}
              current={current}
              item={item}
              key={item.id}
              onChangeKind={(value) => setChangeKind((state) => ({ ...state, [item.id]: value }))}
              onCheckout={() => void beginCheckout(item)}
              onConfirm={(value) => setConfirmed((state) => ({ ...state, [item.id]: value }))}
              onSelectDuration={(value) => setSelected((state) => ({ ...state, [item.id]: value }))}
              pending={pending === item.id}
              selectedDurationId={selected[item.id] ?? item.durations[0]?.id}
            />
          ))}
        </section>
      ) : null}
    </section>
  );
}

function MembershipCard({
  changeKind,
  confirmed,
  current,
  item,
  onChangeKind,
  onCheckout,
  onConfirm,
  onSelectDuration,
  pending,
  selectedDurationId,
}: {
  changeKind?: 'UPGRADE' | 'DOWNGRADE';
  confirmed: boolean;
  current: MembershipCurrentState['membership'];
  item: MembershipCatalogItem;
  onChangeKind: (value: 'UPGRADE' | 'DOWNGRADE') => void;
  onCheckout: () => void;
  onConfirm: (value: boolean) => void;
  onSelectDuration: (value: string) => void;
  pending: boolean;
  selectedDurationId?: string;
}) {
  const duration = item.durations.find((option) => option.id === selectedDurationId);
  const changingPlan = Boolean(current && current.status === 'ACTIVE' && current.plan.id !== item.plan.id);
  const disabled = pending || !confirmed || !duration || (changingPlan && !changeKind);
  return (
    <article className="rounded-lg border bg-card p-5">
      <Crown aria-hidden="true" className="mb-3 text-primary" />
      <h2 className="text-xl font-semibold">{item.displayName}</h2>
      {item.description ? <p className="mt-2 text-muted-foreground">{item.description}</p> : null}
      <ul className="mt-4 list-disc space-y-1 pl-5">
        {item.services.map((service) => (
          <li key={service.code}>{service.displayName}{service.quota ? `: ${service.quota} ${service.unitLabel ?? ''}` : ''}</li>
        ))}
        {item.includedCourses.map((course) => <li key={course.id}>{course.title}</li>)}
      </ul>
      <label className="mt-5 block text-sm font-medium">
        Thời hạn cho {item.displayName}
        <select className="mt-1 w-full rounded border p-2" onChange={(event) => onSelectDuration(event.target.value)} value={selectedDurationId}>
          {item.durations.map((option) => (
            <option key={option.id} value={option.id}>
              {option.months} tháng · {formatCommerceMoney({ amountMinor: option.finalPriceAmountMinor, currency: item.currency })}
              {option.discountPercent !== null ? ` (giảm ${option.discountPercent}%)` : ''}
            </option>
          ))}
        </select>
      </label>
      {changingPlan ? (
        <label className="mt-4 block text-sm font-medium">
          Loại thay đổi cho {item.displayName}
          <select className="mt-1 w-full rounded border p-2" onChange={(event) => onChangeKind(event.target.value as 'UPGRADE' | 'DOWNGRADE')} value={changeKind ?? ''}>
            <option disabled value="">Chọn nâng cấp hoặc hạ cấp</option>
            <option value="UPGRADE">Nâng cấp — có hiệu lực sau thanh toán</option>
            <option value="DOWNGRADE">Hạ cấp — có hiệu lực khi gói hiện tại hết hạn</option>
          </select>
        </label>
      ) : null}
      {duration ? (
        <p className="mt-2 text-sm">
          Giá gốc {formatCommerceMoney({ amountMinor: duration.basePriceAmountMinor, currency: item.currency })}; giá thanh toán{' '}
          <strong>{formatCommerceMoney({ amountMinor: duration.finalPriceAmountMinor, currency: item.currency })}</strong>.
        </p>
      ) : null}
      {(item.removedCourses ?? []).length > 0 ? (
        <section className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" aria-label={`Thay đổi khóa học khi chọn ${item.displayName}`}>
          <strong>Thay đổi khi gia hạn sang phiên bản mới nhất</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {(item.removedCourses ?? []).map((course) => (
              <li key={course.id}>
                {course.title}: {course.graceEndsAt
                  ? `đã bắt đầu, tiếp tục truy cập đến ${formatDate(course.graceEndsAt)}`
                  : course.startedBeforeRemoval
                    ? 'đã bắt đầu nhưng chính sách không có thời gian gia hạn sau kỳ hiện tại'
                    : 'chưa bắt đầu nên không có quyền truy cập gia hạn'}.
              </li>
            ))}
          </ul>
          <p className="mt-2">Tiến độ và chứng chỉ đã đạt được không bị xóa.</p>
        </section>
      ) : null}
      <label className="mt-4 flex gap-2 text-sm">
        <input aria-label={`Xác nhận quyền lợi ${item.displayName}`} checked={confirmed} onChange={(event) => onConfirm(event.target.checked)} type="checkbox" />
        Tôi đã xem và xác nhận quyền lợi của gói này. Không có gia hạn tự động.
      </label>
      <button className="mt-5 inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60" disabled={disabled} onClick={onCheckout} type="button">
        <RefreshCw aria-hidden="true" className={pending ? 'animate-spin' : ''} />
        {pending ? 'Đang tạo đơn…' : 'Tiếp tục thanh toán'}
      </button>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}
