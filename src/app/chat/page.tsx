import { ChatPanel } from "@/components/chat/ChatPanel";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-stone-600">
          Questions are answered from tool calls against the catalog, not from a pasted dump.
        </p>
      </div>
      {hasKey ? (
        <ChatPanel />
      ) : (
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950">
          Set GEMINI_API_KEY in .env.local to use chat. The catalog dashboard still works without it.
        </p>
      )}
    </section>
  );
}
