export function PageLoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1a1a2e]/85">
      <div className="bg-[#c0c0c0] win95-outset p-6 max-w-sm text-center shadow-xl">
        <div className="text-sm font-bold mb-1">{message}</div>
        <div className="text-xs text-gray-600">
          Automatischer Wechsel nach dem Laden
        </div>
      </div>
    </div>
  );
}
