import { ChatPanel } from "@/components/assistant/chat-panel";
import { aiConversationStarter, suggestedQuestions } from "@/lib/mock-data";

export default function AssistantPage() {
  return <ChatPanel initialMessages={aiConversationStarter} suggestions={suggestedQuestions} />;
}
