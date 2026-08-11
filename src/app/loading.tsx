export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div
        className="border-border border-t-accent h-6 w-6 animate-spin rounded-full border-2"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
