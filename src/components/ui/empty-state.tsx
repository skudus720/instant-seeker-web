import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-52 place-items-center border border-dashed border-black/18 bg-black/[0.02] p-8 text-center">
      <div>
        <span className="mx-auto mb-4 grid size-11 place-items-center rounded-md bg-[#090909] text-[#ffd400]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="text-base font-bold text-[#090909]">{title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#5f625f]">
          {description}
        </p>
      </div>
    </div>
  );
}
