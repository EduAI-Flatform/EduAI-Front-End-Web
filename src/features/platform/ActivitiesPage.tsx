import { SystemValue } from '@/features/platform/SystemText';
import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Trophy, UsersRound } from "lucide-react";
import { usePlatform } from "./PlatformProvider";
import "./ActivitiesPage.css";
export function ActivitiesPage() {
  const { settings, locale, t } = usePlatform();
  const [kind, setKind] = useState<"competition" | "event">("competition");
  const activities = (settings.operations.activities ?? []).filter(
    (item) => item.enabled && item.kind === kind,
  );
  return (
    <section className="activities-page container">
      <header>
        <h1>{t("Hoạt động", "Activities")}</h1>
        <p>
          {t(
            "Kết nối cộng đồng và khám phá những cơ hội học tập mới.",
            "Connect with the community and discover new learning opportunities.",
          )}
        </p>
      </header>
      <nav
        aria-label={t("Loại hoạt động", "Activity type")}
        className="activities-page__tabs"
      >
        <Link to="/community">
          <UsersRound aria-hidden="true" />
          {t("Cộng đồng", "Community")}
        </Link>
        <button
          aria-pressed={kind === "competition"}
          onClick={() => setKind("competition")}
        >
          <Trophy aria-hidden="true" />
          {t("Cuộc thi", "Competitions")}
        </button>
        <button
          aria-pressed={kind === "event"}
          onClick={() => setKind("event")}
        >
          <CalendarDays aria-hidden="true" />
          {t("Sự kiện", "Events")}
        </button>
      </nav>
      {!activities.length ? (
        <div className="activities-page__empty">
          <CalendarDays aria-hidden="true" />
          <h2>
            {t(
              "Chưa có hoạt động được công bố",
              "No activities have been published",
            )}
          </h2>
          <p>
            {t(
              "Thông tin sẽ được cập nhật tại đây.",
              "New activities will appear here when announced.",
            )}
          </p>
        </div>
      ) : (
        <div className="activities-page__list">
          {activities.map((item, index) => (
            <article key={index}>
              <h2>{item.title[locale] || item.title.vi}</h2>
              <p>{item.description[locale] || item.description.vi}</p>
              {item.startsAt && (
                <time dateTime={item.startsAt}>
                  <SystemValue render={() => (new Date(item.startsAt).toLocaleString(
                    locale === "vi" ? "vi-VN" : "en-US",
                  ))} />
                </time>
              )}
              {item.url && (
                <a href={item.url} rel="noopener noreferrer">
                  {t("Xem thông tin và đăng ký", "Details and registration")}
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
