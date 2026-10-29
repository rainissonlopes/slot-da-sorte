import type { ReactNode } from "react";

type SectionHeadingProps = {
  icon?: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: "start" | "center";
};

export function SectionHeading({ title, description, action, align = "start" }: SectionHeadingProps) {
  const isCentered = align === "center";

  return (
    <div
      className="section-heading"
      style={isCentered ? { alignItems: "center", justifyContent: "center", textAlign: "center" } : undefined}
    >
      <div className={isCentered ? "flex flex-col items-center" : undefined}>
        <h2>{title}</h2>
      </div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
