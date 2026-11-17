import type { Route } from "./+types/home";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "stocked — back-in-stock alerts" },
    { name: "description", content: "Get notified the moment your items are back in stock." },
  ];
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[-20%] h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-emerald-400">●</span> stocked
          </span>
          <Link
            to="/admin"
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
          >
            Dashboard
          </Link>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Watching stores around the clock
          </span>

          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
            Never miss a{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              restock
            </span>{" "}
            again.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-neutral-400">
            stocked keeps an eye on the items you want across Target, Amazon, Vibram and Rhode —
            and emails you the instant they're back, on a schedule you control per item.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/admin"
              className="rounded-xl bg-emerald-500 px-7 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40"
            >
              Open the dashboard →
            </Link>
          </div>

          <div className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { title: "Per-item timing", body: "Set how often each item is checked — seconds or hours." },
              { title: "Instant email alerts", body: "The moment stock flips, the right people get notified." },
              { title: "Multi-store", body: "Target, Amazon, Vibram and Rhode supported out of the box." },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-left backdrop-blur"
              >
                <h3 className="mb-1 font-semibold text-emerald-400">{f.title}</h3>
                <p className="text-sm text-neutral-400">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="py-8 text-center text-sm text-neutral-600">
          stocked · back-in-stock monitoring
        </footer>
      </div>
    </main>
  );
}
