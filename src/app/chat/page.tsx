import { ChatPanel } from "@/components/chat/ChatPanel";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);

  return (
    <section className="animate-rise flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300/80">Assistant</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Ask the catalog</h1>
        <p className="mt-1 max-w-xl text-sm text-stone-400">
          Answers come from tool calls. The catalog itself is never pasted into the prompt.
        </p>
      </div>
      {hasKey ? (
        <ChatPanel />
      ) : (
        <p role="status" className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-4 text-amber-100">
          Set GEMINI_API_KEY in .env.local to use chat. The catalog dashboard still works without it.
        </p>
      )}
    </section>
  );
}
