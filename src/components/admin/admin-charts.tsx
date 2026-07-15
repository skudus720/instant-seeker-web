import { AdminEmptyState } from "@/components/admin/admin-ui";

interface ChartPoint {
  label: string;
  value: number;
  secondary?: number;
}

export function AdminBarChart({
  points,
  primaryLabel,
  secondaryLabel,
}: {
  points: ChartPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
}) {
  if (!points.some((point) => point.value || point.secondary)) {
    return (
      <AdminEmptyState
        title="No data in this range"
        description="This chart will populate as verified database activity is recorded."
      />
    );
  }
  const max = Math.max(
    1,
    ...points.flatMap((point) => [point.value, point.secondary || 0]),
  );
  const visible = points.slice(-31);
  return (
    <div className="p-5">
      <div
        className="admin-chart-grid flex min-h-52 items-end gap-1 border-b border-black/10"
        aria-hidden="true"
      >
        {visible.map((point, index) => (
          <div
            key={point.label}
            className="flex h-44 min-w-0 flex-1 items-end justify-center gap-px"
            title={`${point.label}: ${primaryLabel} ${point.value}${secondaryLabel ? `, ${secondaryLabel} ${point.secondary || 0}` : ""}`}
          >
            <span
              className="admin-chart-bar w-full max-w-3 rounded-t-sm bg-ink"
              style={{
                height: `${Math.max(point.value ? 4 : 0, (point.value / max) * 100)}%`,
                animationDelay: `${index * 18}ms`,
              }}
            />
            {secondaryLabel ? (
              <span
                className="admin-chart-bar w-full max-w-3 rounded-t-sm bg-signal"
                style={{
                  height: `${Math.max(point.secondary ? 4 : 0, ((point.secondary || 0) / max) * 100)}%`,
                  animationDelay: `${index * 18 + 50}ms`,
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-black/40">
        <span>{visible[0]?.label}</span>
        <span>{visible.at(-1)?.label}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-black/55">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 bg-ink" /> {primaryLabel}
        </span>
        {secondaryLabel ? (
          <span className="inline-flex items-center gap-2">
            <span className="size-2 bg-signal" /> {secondaryLabel}
          </span>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>
          {primaryLabel}
          {secondaryLabel ? ` and ${secondaryLabel}` : ""}
        </caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>{primaryLabel}</th>
            {secondaryLabel ? <th>{secondaryLabel}</th> : null}
          </tr>
        </thead>
        <tbody>
          {visible.map((point) => (
            <tr key={point.label}>
              <th>{point.label}</th>
              <td>{point.value}</td>
              {secondaryLabel ? <td>{point.secondary || 0}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDistributionChart({
  values,
}: {
  values: Array<{ label: string; value: number; tone?: string }>;
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    return (
      <AdminEmptyState
        title="No distribution available"
        description="Completed analyses with validated confidence bands will appear here."
      />
    );
  }
  return (
    <div className="space-y-5 p-5">
      {values.map((item, index) => {
        const percent = Math.round((item.value / total) * 100);
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="font-black capitalize">{item.label}</span>
              <span className="text-black/48">
                {item.value.toLocaleString()} ({percent}%)
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/7">
              <div
                className={`admin-progress-fill ${item.tone || "h-full bg-ink"}`}
                style={{
                  width: `${percent}%`,
                  animationDelay: `${index * 70}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminOutcomeChart({
  completed,
  failed,
}: {
  completed: number;
  failed: number;
}) {
  const total = completed + failed;
  if (!total) {
    return (
      <AdminEmptyState
        title="No finished analyses"
        description="Successful and failed analysis outcomes will be compared here."
      />
    );
  }
  const completedPercent = Math.round((completed / total) * 100);
  return (
    <div className="p-5">
      <div
        className="flex h-5 overflow-hidden rounded-full bg-black/7"
        role="img"
        aria-label={`${completed} completed and ${failed} failed analyses`}
      >
        <span
          className="admin-progress-fill bg-emerald-600"
          style={{ width: `${completedPercent}%` }}
        />
        <span
          className="admin-progress-fill bg-alert"
          style={{
            width: `${100 - completedPercent}%`,
            animationDelay: "80ms",
          }}
        />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-black">{completed.toLocaleString()}</p>
          <p className="mt-1 text-xs text-black/45">
            Completed ({completedPercent}%)
          </p>
        </div>
        <div>
          <p className="text-2xl font-black">{failed.toLocaleString()}</p>
          <p className="mt-1 text-xs text-black/45">
            Failed ({100 - completedPercent}%)
          </p>
        </div>
      </div>
    </div>
  );
}
