export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-16 sm:py-32">
      <main className="flex flex-col items-center max-w-2xl text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
          Pitalock
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mb-10">
          Zero-knowledge, end-to-end encrypted secret sharing for small teams.
        </p>

        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-6 py-4 mb-12 max-w-xl">
          <p className="text-sm text-amber-900 dark:text-amber-200 font-semibold mb-1">
            Pre-1.0, pre-audit
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Pitalock has not yet undergone independent security audit. Not yet
            recommended for high-stakes production secrets.{" "}
            <a
              href="https://github.com/pitalock/pitalock/blob/main/docs/THREAT_MODEL.md"
              className="underline font-medium"
            >
              Read the threat model
            </a>
            .
          </p>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-8">
          v0.1 alpha — implementation in progress.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://github.com/pitalock/pitalock"
            className="px-6 py-2.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://github.com/pitalock/pitalock/blob/main/docs/SPEC.md"
            className="px-6 py-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            Specification
          </a>
        </div>
      </main>

      <footer className="mt-20 text-xs text-zinc-500 dark:text-zinc-500">
        MIT licensed · Built by{" "}
        <a
          href="https://github.com/shwarmadev"
          className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          @shwarmadev
        </a>
      </footer>
    </div>
  );
}
