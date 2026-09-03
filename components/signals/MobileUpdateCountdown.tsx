import { formatCountdown } from "@/lib/signals/catalog-pagination";

export function MobileUpdateCountdown({
  seconds,
  isUpdating,
}: {
  seconds: number;
  isUpdating: boolean;
}) {
  return (
    <div
      className="mobile-update-countdown"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="mobile-update-countdown__indicator" aria-hidden="true" />
      {isUpdating ? (
        <span className="mobile-update-countdown__updating">Atualizando sinais...</span>
      ) : (
        <span>
          Próxima atualização:{" "}
          <strong className="mobile-update-countdown__value tabular-nums">
            {formatCountdown(seconds)}
          </strong>
        </span>
      )}
    </div>
  );
}
