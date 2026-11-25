export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
      {message}
    </p>
  );
}
