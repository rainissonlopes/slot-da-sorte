type PromotionalBannerProps = {
  desktopImageUrl?: string;
  mobileImageUrl?: string;
  fallbackImageUrl?: string;
  href?: string;
  target?: "_blank" | "_self";
  active?: boolean;
  alt?: string;
};

export function PromotionalBanner({
  desktopImageUrl,
  mobileImageUrl,
  fallbackImageUrl,
  href,
  target = "_blank",
  active = true,
  alt = "Banner promocional",
}: PromotionalBannerProps) {
  if (!active || !desktopImageUrl) return null;

  const artwork = (
    <picture>
      {mobileImageUrl && <source media="(max-width: 639px)" srcSet={mobileImageUrl} />}
      <img
        src={desktopImageUrl}
        alt={alt}
        className="block h-auto w-full rounded-2xl object-contain"
        onError={(event) => {
          const image = event.currentTarget;
          if (fallbackImageUrl && image.dataset.fallbackApplied !== "true") {
            image.dataset.fallbackApplied = "true";
            image.src = fallbackImageUrl;
            return;
          }
          image.closest("[data-campaign-banner]")?.setAttribute("hidden", "");
        }}
      />
    </picture>
  );

  if (!href) {
    return (
      <section data-campaign-banner className="mx-auto w-full max-w-[1080px]">
        {artwork}
      </section>
    );
  }

  return (
    <section data-campaign-banner className="mx-auto w-full max-w-[1080px]">
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        className="block w-full"
        aria-label={alt}
      >
        {artwork}
      </a>
    </section>
  );
}
