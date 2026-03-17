interface WaitingScreenProps {
  sessionId: string
  playerCount: number
  onCancel: () => void
}

function WaitingScreen({ sessionId, playerCount, onCancel }: WaitingScreenProps) {
  return (
    <div className="relative flex min-h-[34rem] overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 p-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur md:p-10">
      <div className="absolute -left-6 top-8 h-24 w-24 rounded-full bg-sky-400/25 blur-2xl" />
      <div className="absolute -right-6 bottom-8 h-28 w-28 rounded-full bg-amber-300/20 blur-2xl" />

      <div className="relative flex flex-1 flex-col justify-center">
        <h2 className="mt-6 text-4xl font-black uppercase tracking-[0.08em] text-white sm:text-5xl">
          Waiting For
          <br />
          Another Player
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-200">
          Keep this session open. As soon as the second player joins, the match will launch automatically.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-300">Session ID</div>
            <div className="mt-2 text-3xl font-bold text-amber-200">{sessionId}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-300">Players Ready</div>
            <div className="mt-2 text-3xl font-bold text-white">{playerCount}/2</div>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="mt-8 rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-rose-400"
        >
          Cancel Lobby
        </button>
      </div>
    </div>
  )
}

export default WaitingScreen
