import type { ReactNode } from "react";

type SectionHeadingProps = {
  icon?: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeading({ icon, eyebrow, title, description, action }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <div className="flex items-center gap-2 text-[var(--tenant-primary)] [&>svg]:h-[22px] [&>svg]:w-[22px] [&>svg]:shrink-0">
          {icon}
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h2>{title}</h2>
      </div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
