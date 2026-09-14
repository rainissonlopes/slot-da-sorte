import type { ReactNode } from "react";

type SectionHeadingProps = {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: "start" | "center";
  accentTitle?: boolean;
};

export function SectionHeading({ icon, eyebrow, title, description, action, align = "start", accentTitle = false }: SectionHeadingProps) {
  const isCentered = align === "center";

  return (
    <div
      className={`section-heading${accentTitle ? " section-heading-accent" : ""}`}
      style={isCentered ? { alignItems: "center", justifyContent: "center", textAlign: "center" } : undefined}
    >
      <div className={isCentered ? "flex flex-col items-center" : undefined}>
        {(icon || eyebrow) && (
          <div className={`flex items-center gap-2 text-[var(--tenant-primary)] [&>svg]:h-[22px] [&>svg]:w-[22px] [&>svg]:shrink-0${isCentered ? " justify-center" : ""}`}>
            {icon}
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          </div>
        )}
        <h2>{title}</h2>
      </div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
