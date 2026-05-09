import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-xl font-bold text-forest">Ask AI</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Your personal finance assistant — knows your real numbers
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
}
