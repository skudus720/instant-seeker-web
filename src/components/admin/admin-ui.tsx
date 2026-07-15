import { ArrowLeft, ArrowRight, Database, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-page-header flex flex-col gap-5 border-b border-black/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="flex items-center gap-2 text-[11px] font-black text-signal-ink uppercase">
            <span className="h-px w-5 bg-signal-ink/55" aria-hidden="true" />
            <span>{eyebrow}</span>
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-black text-ink sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-ink text-signal",
    success: "bg-emerald-700 text-white",
    warning: "bg-signal text-ink",
    danger: "bg-alert text-white",
  }[tone];
  const accentClass = {
    default: "bg-ink",
    success: "bg-emerald-600",
    warning: "bg-signal",
    danger: "bg-alert",
  }[tone];
  return (
    <article className="admin-surface group relative min-w-0 overflow-hidden rounded-lg border border-black/10 bg-white p-5">
      <span
        className={cn("absolute inset-x-0 top-0 h-0.5", accentClass)}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[11px] leading-4 font-black text-black/45 uppercase">
          {label}
        </p>
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-md transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none",
            toneClass,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-5 truncate text-2xl font-black text-ink tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 min-h-4 text-xs text-black/45">{detail}</p>
      ) : null}
    </article>
  );
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "admin-surface overflow-hidden rounded-lg border border-black/10 bg-white",
        className,
      )}
    >
      {title || description || action ? (
        <div className="flex flex-col gap-3 border-b border-black/8 bg-black/[0.012] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-base font-black text-ink">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs leading-5 text-black/48">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const statusStyles: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  processing: "border-blue-200 bg-blue-50 text-blue-800",
  under_review: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  suspended: "border-rose-200 bg-rose-50 text-rose-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  hidden: "border-neutral-200 bg-neutral-100 text-neutral-700",
  inactive: "border-neutral-200 bg-neutral-100 text-neutral-700",
  archived: "border-neutral-200 bg-neutral-100 text-neutral-700",
  sub_admin: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

const statusDotStyles: Record<string, string> = {
  active: "bg-emerald-600",
  completed: "bg-emerald-600",
  verified: "bg-emerald-600",
  approved: "bg-emerald-600",
  published: "bg-emerald-600",
  healthy: "bg-emerald-600",
  pending: "bg-amber-500",
  processing: "bg-blue-600",
  under_review: "bg-blue-600",
  warning: "bg-amber-500",
  suspended: "bg-rose-600",
  failed: "bg-rose-600",
  rejected: "bg-rose-600",
  critical: "bg-rose-600",
  error: "bg-rose-600",
  hidden: "bg-neutral-500",
  inactive: "bg-neutral-500",
  archived: "bg-neutral-500",
  sub_admin: "bg-cyan-600",
};

export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-black whitespace-nowrap capitalize",
        statusStyles[status] || "border-black/10 bg-black/5 text-black/60",
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          statusDotStyles[status] || "bg-neutral-500",
        )}
        aria-hidden="true"
      />
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon = Database,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="admin-empty-state grid min-h-56 place-items-center px-5 py-10 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-md bg-black/5 text-black/35">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-sm font-black text-ink">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-black/45">
          {description}
        </p>
      </div>
    </div>
  );
}

export function AdminPagination({
  page,
  pageSize,
  total,
  pathname,
  query = {},
}: {
  page: number;
  pageSize: number;
  total: number;
  pathname: string;
  query?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (nextPage: number) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", String(nextPage));
    return `${pathname}?${params.toString()}`;
  };
  return (
    <div className="flex flex-col gap-3 border-t border-black/10 px-4 py-3 text-xs text-black/50 sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite">
        {total === 0
          ? "No records"
          : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <Link
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          href={page <= 1 ? hrefFor(1) : hrefFor(page - 1)}
          className={cn(
            "admin-interactive inline-flex min-h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-black/5",
          )}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Previous
        </Link>
        <span className="font-bold text-black">
          {page} / {pages}
        </span>
        <Link
          aria-disabled={page >= pages}
          tabIndex={page >= pages ? -1 : undefined}
          href={page >= pages ? hrefFor(pages) : hrefFor(page + 1)}
          className={cn(
            "admin-interactive inline-flex min-h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            page >= pages
              ? "pointer-events-none opacity-40"
              : "hover:bg-black/5",
          )}
        >
          Next
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function AdminTable({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <div className="admin-table-scroll overflow-x-auto">
      <table
        id={id}
        className="admin-table w-full min-w-[760px] border-collapse text-left text-sm"
      >
        {children}
      </table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-black/10 bg-[#f7f7f4] text-[10px] text-black/48 uppercase">
      <tr>{children}</tr>
    </thead>
  );
}

export function AdminTh({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3.5 font-black whitespace-nowrap">{children}</th>
  );
}

export function AdminTd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-black/7 px-4 py-3.5 align-middle",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function AdminSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading admin data">
      <div className="admin-skeleton h-10 w-72 rounded" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="admin-skeleton h-40 rounded-lg" />
        ))}
      </div>
      <div className="admin-skeleton h-96 rounded-lg" />
    </div>
  );
}
