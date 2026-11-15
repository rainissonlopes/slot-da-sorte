import { formatCountdown } from "@/lib/signals/catalog-pagination";

export function MobileUpdateCountdown({
  seconds,
  isUpdating,
  totalSeconds,
}: {
  seconds: number;
  isUpdating: boolean;
  totalSeconds: number;
}) {
  return (
    <div
      className="mobile-update-countdown"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span aria-hidden="true" className="mobile-update-countdown__progress" style={{ width: `${Math.max(0, Math.min(100, (1 - seconds / totalSeconds) * 100))}%` }} />
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
