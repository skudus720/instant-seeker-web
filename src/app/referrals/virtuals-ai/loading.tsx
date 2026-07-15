export default function VirtualsAiLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto size-16 animate-pulse rounded-lg border border-white/10 bg-white/6 motion-reduce:animate-none" />
        <div className="mx-auto mt-8 h-10 w-4/5 animate-pulse rounded-lg bg-white/9 motion-reduce:animate-none" />
        <div className="mx-auto mt-4 h-5 w-3/5 animate-pulse rounded-lg bg-white/6 motion-reduce:animate-none" />
        <div className="mt-32 h-20 animate-pulse rounded-[28px] border border-white/10 bg-white/6 motion-reduce:animate-none" />
      </div>
    </main>
  );
}
