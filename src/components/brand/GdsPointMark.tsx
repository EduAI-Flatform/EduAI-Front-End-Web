import "./GdsPointMark.css";

type PointSize = "small" | "medium" | "large" | "hero";

/** The same designed GDS Point artwork across account, wallet and rewards. */
export function GdsPointMark({ size = "medium", imageUrl }: { size?: PointSize; imageUrl?: string }) {
  return <span className={`gds-point-mark gds-point-mark--${size}`} aria-hidden="true">
    <img src={imageUrl || "/gds-point.webp"} alt="" loading="lazy" />
  </span>;
}
