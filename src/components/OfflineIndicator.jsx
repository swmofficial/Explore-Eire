import { useOfflineQueue } from '../hooks/useOfflineQueue';

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOfflineQueue();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0)',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        borderRadius: 'var(--radius-row, 12px)',
        background: isOnline ? 'var(--color-success, #4BE87A)' : 'var(--color-danger, #E84B4B)',
        color: 'var(--color-void, #0D0F1A)',
        fontSize: 'var(--text-label-size, 11px)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {!isOnline && <span>Offline</span>}
      {pendingCount > 0 && (
        <span>{pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}</span>
      )}
      {isOnline && pendingCount > 0 && <span>Syncing...</span>}
    </div>
  );
}