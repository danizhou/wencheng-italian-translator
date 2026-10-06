import { Translator } from "@/components/Translator";
import { GITHUB_PROFILE, GITHUB_REPO } from "@/components/labels";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <header className="bg-appbar text-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span lang="zh-Hans" className="flex size-10 items-center justify-center rounded-xl bg-accent text-xl font-bold text-appbar">温</span>
            <div className="leading-tight">
              <h1 className="text-lg font-semibold">Traduttore Wenzhouhua <span lang="zh-Hans" className="font-normal text-accent">温州话</span></h1>
              <p className="text-xs text-white/70">Italiano → dialetti dell&apos;area di Wenzhou (Wencheng, Qingtian), con la pronuncia all&apos;italiana</p>
            </div>
          </div>
          <a href={GITHUB_REPO} target="_blank" rel="noreferrer" aria-label="Codice su GitHub" className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
            <GitHubIcon />
          </a>
        </div>
        <div className="h-1 bg-accent" />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <Translator />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 text-xs leading-relaxed text-muted sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p>
              Pronunce dalle tabelle comunitarie di{" "}
              <a className="font-medium text-primary hover:underline" href="https://github.com/osfans/MCPDict" target="_blank" rel="noreferrer">MCPDict</a>:{" "}
              <span lang="zh-Hans">文成大峃</span> (Daxue) e <span lang="zh-Hans">文成</span> (Wencheng);{" "}
              <span lang="zh-Hans">青田温溪</span> (Wenxi), <span lang="zh-Hans">青田北山</span> (Beishan) e <span lang="zh-Hans">青田</span> (Qingtian);{" "}
              <span lang="zh-Hans">温州</span> (Wenzhou) per i caratteri che mancano.
            </p>
            <p className="mt-1">Pronuncia approssimata: a Yuhu può essere diversa. La traduzione è generata da un modello AI e può sbagliare.</p>
          </div>
          <a
            href={GITHUB_PROFILE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1.5 font-medium text-text hover:border-primary hover:text-primary"
          >
            <GitHubIcon /> Creato da danizhou su GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
