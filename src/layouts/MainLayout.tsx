import type { ReactNode } from "react";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-semibold text-brand">
            EduAI
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <a className="hover:text-brand" href="/">
              Home
            </a>
            <a className="hover:text-brand" href="/">
              Courses
            </a>
            <a className="hover:text-brand" href="/">
              Library
            </a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
