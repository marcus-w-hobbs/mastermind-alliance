import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight">
          Mastermind Alliance
        </h1>
        <p className="text-xl text-muted-foreground">
          AI personas engaging in philosophical dialogue
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
          <Link
            href="/mastermind"
            className="group p-6 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
          >
            <h2 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
              Mastermind →
            </h2>
            <p className="text-muted-foreground">
              Multi-persona roundtable discussions. Ask a question, watch great minds debate.
            </p>
          </Link>

          <Link
            href="/backrooms"
            className="group p-6 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
          >
            <h2 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
              Backrooms →
            </h2>
            <p className="text-muted-foreground">
              Stream-of-consciousness AI dialogues. Explore the liminal spaces of thought.
            </p>
          </Link>
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          <p>
            See{" "}
            <code className="px-1 py-0.5 rounded bg-muted">experiments/ablation/</code>{" "}
            for prompt engineering research.
          </p>
        </div>
      </div>
    </main>
  );
}
