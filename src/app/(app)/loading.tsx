export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="loading">
      <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-sunken" />
      <div className="h-12 w-full animate-pulse rounded-full bg-sunken" />
      <div className="grid gap-3">
        <div className="h-40 animate-pulse rounded-3xl bg-sunken" />
        <div className="h-32 animate-pulse rounded-3xl bg-sunken" />
        <div className="h-32 animate-pulse rounded-3xl bg-sunken" />
      </div>
    </div>
  );
}
