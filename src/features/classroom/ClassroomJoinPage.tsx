import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Loader2,
  LogOut,
  Play,
  RefreshCw,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuthSession } from "../auth/auth-store";
import {
  classroomService,
  getClassroomErrorMessage,
  type ClassroomSession,
} from "../../services/classroom.service";
import "./ClassroomJoinPage.css";

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ClassroomJoinPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const authSession = useAuthSession();
  const isInstructor = Boolean(authSession?.user.roles.includes("instructor"));
  const isStudent = Boolean(authSession?.user.roles.includes("student"));
  const backPath = isInstructor ? "/instructor/dashboard/classrooms" : "/dashboard/classrooms";
  const [session, setSession] = useState<ClassroomSession | null>(null);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const attendanceActiveRef = useRef(false);

  const canJoin = useMemo(
    () => isStudent && session?.status === "live",
    [isStudent, session?.status],
  );

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setErrorMessage("Không tìm thấy buổi học.");
      setIsLoading(false);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      setSession(await classroomService.getSession(sessionId));
    } catch (error) {
      setErrorMessage(getClassroomErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    function recordLeaveOnPageHide() {
      if (!sessionId || !attendanceActiveRef.current) return;

      attendanceActiveRef.current = false;
      classroomService.recordAttendanceKeepalive(sessionId, "leave");
    }

    window.addEventListener("pagehide", recordLeaveOnPageHide);

    return () => {
      window.removeEventListener("pagehide", recordLeaveOnPageHide);

      if (sessionId && attendanceActiveRef.current) {
        attendanceActiveRef.current = false;
        void classroomService.recordAttendance(sessionId, "leave").catch(() => undefined);
      }
    };
  }, [sessionId]);

  async function startSession() {
    if (!sessionId) return;

    setActionMessage(null);
    setErrorMessage(null);
    setIsStarting(true);

    try {
      const startedSession = await classroomService.startSession(sessionId);
      setMeetingUrl(startedSession.meetingUrl);
      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              actualStart: startedSession.actualStart,
              status: startedSession.status,
            }
          : currentSession,
      );
      setActionMessage("Buổi học đã sẵn sàng.");
    } catch (error) {
      setErrorMessage(getClassroomErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  }

  async function joinSession() {
    if (!sessionId || !canJoin) return;

    setActionMessage(null);
    setErrorMessage(null);
    setIsJoining(true);

    try {
      const joinedSession = await classroomService.joinSession(sessionId);
      await classroomService.recordAttendance(sessionId, "join");
      attendanceActiveRef.current = true;
      setMeetingUrl(joinedSession.meetingUrl);
      setActionMessage("Điểm danh vào lớp đã được ghi nhận.");
    } catch (error) {
      setErrorMessage(getClassroomErrorMessage(error));
    } finally {
      setIsJoining(false);
    }
  }

  async function leaveSession() {
    if (!sessionId || !attendanceActiveRef.current) {
      setMeetingUrl(null);
      return;
    }

    attendanceActiveRef.current = false;
    setMeetingUrl(null);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      await classroomService.recordAttendance(sessionId, "leave");
      setActionMessage("Điểm danh rời lớp đã được ghi nhận.");
    } catch (error) {
      setErrorMessage(getClassroomErrorMessage(error));
    }
  }

  return (
    <section className="classroom-join">
      <header className="classroom-join__header">
        <Link to={backPath}>
          <ArrowLeft aria-hidden="true" />
          Quay lại
        </Link>
        <div>
          <span>Lớp trực tuyến</span>
          <h1>{session?.title ?? "Buổi học"}</h1>
          {session ? (
            <p>
              {dateTimeFormatter.format(new Date(session.scheduledStart))} -{" "}
              {dateTimeFormatter.format(new Date(session.scheduledEnd))}
            </p>
          ) : null}
        </div>
      </header>

      {isLoading ? (
        <ClassroomJoinState icon={Loader2} message="Đang tải buổi học..." loading />
      ) : null}

      {!isLoading && errorMessage ? (
        <ClassroomJoinState
          icon={AlertCircle}
          message={errorMessage}
          onRetry={() => void loadSession()}
          tone="error"
        />
      ) : null}

      {!isLoading && !errorMessage && session ? (
        <div className="classroom-join__body">
          <aside className="classroom-join__panel">
            <div className={`classroom-join__status classroom-join__status--${session.status}`}>
              <Video aria-hidden="true" />
              <span>{getSessionStatusLabel(session.status)}</span>
            </div>

            <p>{session.description || "Buổi học chưa có mô tả."}</p>

            {actionMessage ? (
              <p className="classroom-join__message" role="status">
                {actionMessage}
              </p>
            ) : null}

            {isInstructor ? (
              <button
                className="classroom-join__primary"
                disabled={isStarting || session.status === "cancelled"}
                onClick={() => void startSession()}
                type="button"
              >
                {isStarting ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Play aria-hidden="true" />}
                {meetingUrl ? "Mở lại phòng học" : "Bắt đầu buổi học"}
              </button>
            ) : null}

            {isStudent ? (
              <button
                className="classroom-join__primary"
                disabled={isJoining || !canJoin || Boolean(meetingUrl)}
                onClick={() => void joinSession()}
                type="button"
              >
                {isJoining ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Video aria-hidden="true" />}
                {canJoin ? "Vào lớp" : "Chưa thể vào lớp"}
              </button>
            ) : null}

            {meetingUrl ? (
              <button
                className="classroom-join__secondary"
                onClick={() => void leaveSession()}
                type="button"
              >
                <LogOut aria-hidden="true" />
                Rời phòng học
              </button>
            ) : null}
          </aside>

          <main className="classroom-join__stage">
            {meetingUrl ? (
              <iframe
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="classroom-join__iframe"
                src={meetingUrl}
                title={`Phòng học trực tuyến ${session.title}`}
              />
            ) : (
              <div className="classroom-join__placeholder">
                <CalendarClock aria-hidden="true" />
                <h2>{isInstructor ? "Sẵn sàng bắt đầu" : "Đang chờ phòng học mở"}</h2>
                <p>
                  {isInstructor
                    ? "Nhấn bắt đầu để tạo đường vào Jitsi cho buổi học này."
                    : "Bạn có thể vào lớp khi giảng viên đã bắt đầu buổi học."}
                </p>
              </div>
            )}
          </main>
        </div>
      ) : null}
    </section>
  );
}

function ClassroomJoinState({
  icon: Icon,
  loading = false,
  message,
  onRetry,
  tone = "neutral",
}: {
  icon: typeof Video;
  loading?: boolean;
  message: string;
  onRetry?: () => void;
  tone?: "error" | "neutral";
}) {
  return (
    <div className={`classroom-join__state classroom-join__state--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" className={loading ? "is-spinning" : undefined} />
      <p>{message}</p>
      {onRetry ? (
        <button onClick={onRetry} type="button">
          <RefreshCw aria-hidden="true" />
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

function getSessionStatusLabel(status: ClassroomSession["status"]): string {
  if (status === "live") return "Đang diễn ra";
  if (status === "ended") return "Đã kết thúc";
  if (status === "cancelled") return "Đã hủy";
  return "Đã lên lịch";
}
