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
    <div className="admin-page-header flex flex-col gap-5 border-b border-white/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="flex items-center gap-2 text-[11px] font-black text-signal uppercase">
            <span className="h-px w-5 bg-signal/65" aria-hidden="true" />
            <span>{eyebrow}</span>
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#94A3B8]">
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
    default: "border border-signal/18 bg-signal/8 text-signal",
    success: "border border-emerald-500/18 bg-emerald-500/10 text-emerald-400",
    warning: "border border-amber-500/18 bg-amber-500/10 text-amber-300",
    danger: "border border-alert/18 bg-alert/10 text-alert",
  }[tone];
  const accentClass = {
    default: "bg-signal",
    success: "bg-emerald-600",
    warning: "bg-signal",
    danger: "bg-alert",
  }[tone];
  return (
    <article className="admin-surface group relative min-w-0 overflow-hidden rounded-lg border border-white/8 bg-[#101216] p-5">
      <span
        className={cn("absolute inset-x-0 top-0 h-0.5", accentClass)}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[11px] leading-4 font-black text-[#94A3B8] uppercase">
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
      <p className="mt-5 truncate text-2xl font-black text-white tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 min-h-4 text-xs text-[#64748B]">{detail}</p>
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
        "admin-surface overflow-hidden rounded-lg border border-white/8 bg-[#101216]",
        className,
      )}
    >
      {title || description || action ? (
        <div className="flex flex-col gap-3 border-b border-white/8 bg-white/[0.012] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-base font-black text-white">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs leading-5 text-[#64748B]">
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
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  verified: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  published: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  healthy: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  processing: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  under_review: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  suspended: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  critical: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  error: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  hidden: "border-white/10 bg-white/5 text-white/55",
  inactive: "border-white/10 bg-white/5 text-white/55",
  archived: "border-white/10 bg-white/5 text-white/55",
  sub_admin: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
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
        statusStyles[status] || "border-white/10 bg-white/5 text-white/60",
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
        <span className="mx-auto grid size-11 place-items-center rounded-md border border-white/8 bg-white/[0.035] text-white/35">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-sm font-black text-white">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#64748B]">
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
    <div className="flex flex-col gap-3 border-t border-white/8 px-4 py-3 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
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
            "admin-interactive inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-white/6",
          )}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Previous
        </Link>
        <span className="font-bold text-white">
          {page} / {pages}
        </span>
        <Link
          aria-disabled={page >= pages}
          tabIndex={page >= pages ? -1 : undefined}
          href={page >= pages ? hrefFor(pages) : hrefFor(page + 1)}
          className={cn(
            "admin-interactive inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
            page >= pages
              ? "pointer-events-none opacity-40"
              : "hover:bg-white/6",
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
    <thead className="border-b border-white/8 bg-[#0B0D10] text-[10px] text-[#64748B] uppercase">
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
        "border-b border-white/7 px-4 py-3.5 align-middle text-white/78",
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
