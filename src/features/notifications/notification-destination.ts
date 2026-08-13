const applicationOrigin = "https://eduai.local";

const supportedDestinationPrefixes = [
  "/dashboard",
  "/instructor/dashboard",
  "/admin/dashboard",
  "/courses",
  "/learning",
  "/quizzes",
  "/assignments",
  "/classroom-sessions",
  "/library",
  "/community",
  "/ai",
  "/certificates",
] as const;

export function getNotificationDestination(link: string | null): string | null {
  if (!link || link !== link.trim() || !link.startsWith("/") || link.startsWith("//")) {
    return null;
  }

  const destination = new URL(link, applicationOrigin);

  if (
    destination.origin !== applicationOrigin ||
    !supportedDestinationPrefixes.some(
      (prefix) =>
        destination.pathname === prefix ||
        destination.pathname.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
}
