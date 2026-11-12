import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../platform/SystemText";
import { Crown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCommerceMoney } from '../../services/commerce.service';
import {
  getMembershipErrorMessage,
  membershipService,
  type MembershipCatalogItem,
  type MembershipCurrentState,
} from '../../services/membership.service';

export function MembershipPage() {
  const messageForUi = useSystemMessages();
  const navigate = useNavigate();
  const checkoutInFlight = useRef(false);
  const checkoutKeys = useRef(new Map<string,string>());
  const [items, setItems] = useState<MembershipCatalogItem[]>([]);
  const [currentState, setCurrentState] = useState<MembershipCurrentState>({ membership: null, pendingChange: null, expiringGraceCourses: [] });
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [changeKind, setChangeKind] = useState<Record<string, 'UPGRADE' | 'DOWNGRADE'>>({});
  const [pending, setPending] = useState<string | null>(null);
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
    if (checkoutInFlight.current) return;
    if (currentState.pendingChange) {
      navigate('/orders/' + encodeURIComponent(currentState.pendingChange.order.id));
      return;
    }
    const durationOptionId = selected[item.id] ?? item.durations[0]?.id;
    const current = currentState.membership;
      const changingPlan = Boolean(current && current.status === 'ACTIVE' && current.plan.id !== item.plan.id);
    if (!durationOptionId || !confirmed[item.id] || (changingPlan && !changeKind[item.id])) return;
    checkoutInFlight.current = true;
    setPending(item.id);
    setError(null);
    try {
      const checkoutFingerprint = JSON.stringify({ versionId: item.id, durationOptionId, requestedChange: changingPlan ? changeKind[item.id] : undefined });
      if (!checkoutKeys.current.has(checkoutFingerprint)) checkoutKeys.current.set(checkoutFingerprint, globalThis.crypto.randomUUID());
      const createdCheckout = await membershipService.checkout({
        versionId: item.id,
        durationOptionId,
        requestedChange: changingPlan ? changeKind[item.id] : undefined,
        changedBenefitsConfirmed: true,
      }, checkoutKeys.current.get(checkoutFingerprint));
      navigate('/orders/' + encodeURIComponent(createdCheckout.order.id));
    } catch (reason) {
      setError(getMembershipErrorMessage(reason));
    } finally {
      checkoutInFlight.current = false;
      setPending(null);
    }
  }

  const current = currentState.membership;
  return (
    <section className="container mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground"><SystemText message={"Thành viên EduAI"} /></p>
        <h1 className="text-3xl font-semibold"><SystemText message={"Chọn gói phù hợp với hành trình học của bạn"} /></h1>
        {current ? (
          <p className="mt-2">
            <SystemText message={"Gói hiện tại:"} /> <strong>{current.displayName}</strong>,{' '}
            {current.status === 'EXPIRED' ? <SystemText message={"đã hết hạn"} /> : <SystemText message={"hết hạn"} />} <SystemValue render={() => (formatDate(current.expiresAt))} />.
          </p>
        ) : null}
        {currentState.pendingChange ? (
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <SystemText message={({PURCHASE:'Đơn hội viên',RENEW:'Gia hạn',UPGRADE:'Nâng cấp',DOWNGRADE:'Hạ cấp'} as Record<string,string>)[currentState.pendingChange.action]} /> <SystemText message={"đang chờ:"} />{' '}
            <strong>{currentState.pendingChange.plan.displayName}</strong> · <a href={"/orders/" + encodeURIComponent(currentState.pendingChange.order.id)}><SystemText message={"Tiếp tục kiểm tra đơn"} /> {currentState.pendingChange.order.orderNumber}</a>.
          </p>
        ) : null}
        {currentState.expiringGraceCourses.map((course) => (
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" key={course.courseId} role="status">
            <SystemText message={"Quyền truy cập gia hạn cho"} /> <strong>{course.title}</strong> <SystemText message={"kết thúc ngày"} /> <SystemValue render={() => (formatDate(course.graceEndsAt))} /><SystemText message={". Tiến độ và chứng chỉ vẫn được giữ lại."} />
          </p>
        ))}
      </header>

      {loading ? <p aria-live="polite" role="status"><SystemText message={"Đang tải gói thành viên…"} /></p> : null}
      {error ? (
        <div className="mb-4 rounded border border-destructive p-3" role="alert">
          <p><SystemText message={error} /></p>
          <button className="mt-3 rounded border px-3 py-2" onClick={() => void load()} type="button"><SystemText message="Thử lại" /></button>
        </div>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold"><SystemText message={"Chưa có gói thành viên"} /></h2>
          <p className="mt-2 text-muted-foreground"><SystemText message={"Các gói đang được chuẩn bị. Vui lòng quay lại sau."} /></p>
        </div>
      ) : null}
      {!loading && items.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2" aria-label={messageForUi("Các gói thành viên")}>
          {items.map((item) => (
            <MembershipCard
              changeKind={changeKind[item.id]}
              confirmed={Boolean(confirmed[item.id])}
              current={current}
              hasPendingOrder={Boolean(currentState.pendingChange)}
              item={item}
              key={item.id}
              onChangeKind={(value) => setChangeKind((state) => ({ ...state, [item.id]: value }))}
              onCheckout={() => void beginCheckout(item)}
              onConfirm={(value) => setConfirmed((state) => ({ ...state, [item.id]: value }))}
              onSelectDuration={(value) => setSelected((state) => ({ ...state, [item.id]: value }))}
              pending={Boolean(pending)}
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
  hasPendingOrder,
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
  hasPendingOrder: boolean;
  item: MembershipCatalogItem;
  onChangeKind: (value: 'UPGRADE' | 'DOWNGRADE') => void;
  onCheckout: () => void;
  onConfirm: (value: boolean) => void;
  onSelectDuration: (value: string) => void;
  pending: boolean;
  selectedDurationId?: string;
}) {
  const messageForUi = useSystemMessages();
  const [renewalOpen, setRenewalOpen] = useState(false);
  const activePlan = current?.status === 'ACTIVE' && current.plan.id === item.plan.id;
  const showForm = !hasPendingOrder && (!activePlan || renewalOpen);
  const duration = item.durations.find((option) => option.id === selectedDurationId);
  const previewStart = current?.status === 'ACTIVE' && (activePlan || changeKind === 'DOWNGRADE') ? new Date(current.expiresAt) : new Date();
  const previewEnd = addPreviewMonths(previewStart, duration?.months ?? 1);
  const changingPlan = Boolean(current && current.status === 'ACTIVE' && current.plan.id !== item.plan.id);
  const disabled = pending || (!hasPendingOrder && (!showForm || !confirmed || !duration || (changingPlan && !changeKind)));
  return (
    <article className="rounded-lg border bg-card p-5">
      <Crown aria-hidden="true" className="mb-3 text-primary" />
      <h2 className="text-xl font-semibold">{item.displayName}</h2>
      {activePlan ? <p className="mt-2 font-semibold text-primary"><SystemText message={"Gói đang sử dụng · Hết hạn"} /> <SystemValue render={() => (formatDate(current.expiresAt))} /></p> : null}
      {item.description ? <p className="mt-2 text-muted-foreground">{item.description}</p> : null}
      <section className="mt-4 rounded border bg-background p-4" aria-label={messageForUi("Quyền lợi ") + item.displayName}>
        <h3 className="font-semibold"><SystemText message={"Quyền lợi của gói"} /></h3>
        {item.services.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{item.services.map(service => <li key={service.code}>
          {service.displayName}{service.valueType === 'UNLIMITED' ? <SystemText message={": Không giới hạn"} /> : service.valueType === 'BOOLEAN' ? service.booleanValue ? <SystemText message={": Có bao gồm"} /> : <SystemText message={": Không bao gồm"} /> : service.quota ? ': ' + service.quota + ' ' + (service.unitLabel ?? 'lượt') : ''}
        </li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground"><SystemText message={"Chưa cấu hình quyền lợi dịch vụ cho gói này."} /></p>}
        <h4 className="mt-3 text-sm font-semibold"><SystemText message={"Khóa học đi kèm"} /></h4>
        {item.includedCourses.length ? <ul className="mt-1 list-disc pl-5">{item.includedCourses.map(course => <li key={course.id}>{course.title}</li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground"><SystemText message={"Không có khóa học đi kèm."} /></p>}
      </section>
      {hasPendingOrder ? <p className="mt-4 text-sm"><SystemText message={"Bạn đã có đơn thành viên đang chờ. Hãy hoàn tất hoặc hủy đơn đó trước khi tạo đơn khác."} /></p> : null}
      {activePlan && !hasPendingOrder && !renewalOpen ? <button type="button" className="mt-5 rounded border px-4 py-2" onClick={() => setRenewalOpen(true)}><SystemText message={"Gia hạn gói"} /></button> : null}
      {showForm ? <>
      {activePlan ? <p className="mt-4 text-sm"><SystemText message={"Gia hạn sẽ nối tiếp sau ngày"} /> <SystemValue render={() => (formatDate(current.expiresAt))} /><SystemText message={"; không mua lại gói đang dùng."} /></p> : null}
      <label className="mt-5 block text-sm font-medium">
        <SystemText message={"Thời hạn cho"} /> {item.displayName}
        <select className="mt-1 w-full rounded border p-2" onChange={(event) => onSelectDuration(event.target.value)} value={selectedDurationId}>
          {item.durations.map((option) => (
            <option key={option.id} value={option.id}>
              {option.months} <SystemText message={"tháng ·"} /> <SystemValue render={() => (formatCommerceMoney({ amountMinor: option.finalPriceAmountMinor, currency: item.currency }))} />
              {option.discountPercent !== null ? `${messageForUi(" (giảm ")}${option.discountPercent}%)` : ''}
            </option>
          ))}
        </select>
      </label>
      {changingPlan ? (
        <label className="mt-4 block text-sm font-medium">
          <SystemText message={"Loại thay đổi cho"} /> {item.displayName}
          <select className="mt-1 w-full rounded border p-2" onChange={(event) => onChangeKind(event.target.value as 'UPGRADE' | 'DOWNGRADE')} value={changeKind ?? ''}>
            <option disabled value=""><SystemText message={"Chọn nâng cấp hoặc hạ cấp"} /></option>
            <option value="UPGRADE"><SystemText message={"Nâng cấp — có hiệu lực sau thanh toán"} /></option>
            <option value="DOWNGRADE"><SystemText message={"Hạ cấp — có hiệu lực khi gói hiện tại hết hạn"} /></option>
          </select>
        </label>
      ) : null}
      {duration ? <div className="mt-3 rounded bg-muted p-3 text-sm" role="status">
        <strong>{activePlan ? <SystemText message={"Gia hạn "} /> : changingPlan ? <SystemText message={"Thay đổi gói · "} /> : <SystemText message={"Mua mới · "} />}{duration.months} <SystemText message={"tháng"} /></strong>
        <p><SystemText message={"Dự kiến từ"} /> <SystemValue render={() => (formatDate(previewStart.toISOString()))} /> <SystemText message={"đến"} /> <SystemValue render={() => (formatDate(previewEnd.toISOString()))} />.</p>
        <p><SystemText message={"Thời hạn chính xác sẽ hiện trên đơn trước khi thanh toán. Không tự động gia hạn."} /></p>
      </div> : null}
      {duration ? (
        <p className="mt-2 text-sm">
          <SystemText message={"Giá gốc"} /> <SystemValue render={() => (formatCommerceMoney({ amountMinor: duration.basePriceAmountMinor, currency: item.currency }))} /><SystemText message={"; giá thanh toán"} />{' '}
          <strong><SystemValue render={() => (formatCommerceMoney({ amountMinor: duration.finalPriceAmountMinor, currency: item.currency }))} /></strong>.
        </p>
      ) : null}
      {(item.removedCourses ?? []).length > 0 ? (
        <section className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" aria-label={`${messageForUi("Thay đổi khóa học khi chọn ")}${item.displayName}`}>
          <strong><SystemText message={"Thay đổi khi gia hạn sang phiên bản mới nhất"} /></strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {(item.removedCourses ?? []).map((course) => (
              <li key={course.id}>
                {course.title}: <SystemValue render={() => (course.graceEndsAt
                  ? `đã bắt đầu, tiếp tục truy cập đến ${formatDate(course.graceEndsAt)}`
                  : course.startedBeforeRemoval
                    ? 'đã bắt đầu nhưng chính sách không có thời gian gia hạn sau kỳ hiện tại'
                    : 'chưa bắt đầu nên không có quyền truy cập gia hạn')} />.
              </li>
            ))}
          </ul>
          <p className="mt-2"><SystemText message={"Tiến độ và chứng chỉ đã đạt được không bị xóa."} /></p>
        </section>
      ) : null}
      <label className="mt-4 flex gap-2 text-sm">
        <input aria-label={`${messageForUi("Xác nhận quyền lợi ")}${item.displayName}`} checked={confirmed} onChange={(event) => onConfirm(event.target.checked)} type="checkbox" />
        <SystemText message={"Tôi đã xem và xác nhận quyền lợi của gói này. Không có gia hạn tự động."} />
      </label>
      </> : null}
      {showForm || hasPendingOrder ? <button className="mt-5 inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60" disabled={disabled} onClick={onCheckout} type="button">
        <RefreshCw aria-hidden="true" className={pending ? 'animate-spin' : ''} />
        {pending ? <SystemText message={"Đang tạo đơn…"} /> : hasPendingOrder ? <SystemText message={"Xem đơn đang chờ"} /> : activePlan ? <SystemText message={"Tạo đơn gia hạn"} /> : <SystemText message={"Tiếp tục tới đơn hàng"} />}
      </button> : null}
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(currentSystemLocale(), { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
}

function addPreviewMonths(start: Date, months: number): Date {
  const result = new Date(start); const day = result.getUTCDate(); result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months); const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate(); result.setUTCDate(Math.min(day, last)); return result;
}
