export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
      <h1 className="text-2xl font-bold text-ink">You're offline</h1>
      <p className="text-ink-soft">
        Fasted works offline — your timer and history are stored on this device. Reconnect to sync.
      </p>
    </main>
  );
}
