export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-14 w-full rounded-xl bg-amber text-base font-semibold text-cockpit transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
