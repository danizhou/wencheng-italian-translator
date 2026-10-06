import { Translator } from "@/components/Translator";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Traduttore Wencheng 文成話</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Italiano → Wenchenghua (Daxue), con la pronuncia scritta all&apos;italiana</p>
      </header>

      <Translator />

      <footer className="mt-auto border-t border-zinc-200 pt-6 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800">
        <p>
          Pronunce dalle tabelle comunitarie di{" "}
          <a className="underline" href="https://github.com/osfans/MCPDict" target="_blank" rel="noreferrer">MCPDict / 漢字音典</a>:
          文成大嶨 (Daxue), 文成 (Wencheng) e 溫州 (Wenzhou).
        </p>
        <p className="mt-1">Pronuncia approssimata: a Yuhu può essere diversa. La traduzione è generata da un modello AI e può sbagliare.</p>
      </footer>
    </main>
  );
}
