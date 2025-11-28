import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DbBook } from "@/types/db";
import { BookOpen, Loader2, MessageCircle, Sparkles } from "lucide-react";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface DbBookChatProps {
  book: DbBook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingQuestion: string | null;
  onPendingQuestionHandled: () => void;
}

interface AnswerSource {
  chapter_number: number | null;
  page_number: number | null;
  chapter_heading: string | null;
  chunk_id: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  sources?: AnswerSource[];
}

function buildGreetingMessage(): ChatMessage {
  return {
    id: `assistant-greeting-${Date.now()}`,
    role: "assistant",
    content: "Hi, how can I help you today?",
    createdAt: new Date(),
  };
}

export function DbBookChat({
  book,
  open,
  onOpenChange,
  pendingQuestion,
  onPendingQuestionHandled,
}: DbBookChatProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildGreetingMessage()]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setQuestion("");
      setIsLoading(false);
      setMessages([buildGreetingMessage()]);
    }
  }, [open]);

  useEffect(() => {
    setMessages([buildGreetingMessage()]);
    setQuestion("");
    setError(null);
  }, [book.id]);

  const getConversationHistoryPayload = useCallback(() => {
    const relevant = messages.filter((entry) => {
      if (entry.role !== "user" && entry.role !== "assistant") {
        return false;
      }
      if (entry.role === "assistant" && entry.id.startsWith("assistant-greeting")) {
        return false;
      }
      return entry.content.trim().length > 0;
    });

    const history: { role: "user" | "assistant"; content: string }[] = [];
    let userCount = 0;
    let assistantCount = 0;

    for (let index = relevant.length - 1; index >= 0 && history.length < 4; index -= 1) {
      const entry = relevant[index];
      if (entry.role === "user") {
        if (userCount >= 2) {
          continue;
        }
        userCount += 1;
      } else if (entry.role === "assistant") {
        if (assistantCount >= 2) {
          continue;
        }
        assistantCount += 1;
      }

      history.push({ role: entry.role, content: entry.content.trim() });
    }

    return history.reverse();
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const suggestions = useMemo(() => {
    const base = [
      "Give me a summary.",
      "Share key themes.",
    ];
    return Array.from(new Set(base));
  }, []);

  const handleSubmit = useCallback(
    async (rawQuestion: string, options?: { includeBookTitle?: boolean }) => {
      const trimmed = rawQuestion.trim();
      if (!trimmed || isLoading) {
        return;
      }

      const backendQuestion = options?.includeBookTitle && book.title ? `${book.title}: ${trimmed}` : trimmed;
      const conversationHistoryPayload = getConversationHistoryPayload();

      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content: trimmed,
        createdAt: new Date(),
      };

      setMessages((previous) => [...previous, userMessage]);
      setQuestion("");
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/books/${book.id}/qa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: backendQuestion,
            conversation_history: conversationHistoryPayload,
            bookTitle: book.title,
          }),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || !result) {
          throw new Error((result && (result.error?.message || result.message)) || response.statusText);
        }

        // Extract data from response wrapper
        const payload = result.data || result;

        const assistantMessage: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: typeof payload.answer === "string" ? payload.answer : "I couldn't generate an answer right now.",
          createdAt: new Date(),
          sources: Array.isArray(payload.sources) ? payload.sources : [],
        };

        setMessages((previous) => [...previous, assistantMessage]);
      } catch (caught) {
        const message = (caught as Error)?.message || "Unable to fetch answer.";
        setError(message);
        setMessages((previous) =>
          previous.map((entry) =>
            entry.id === userMessage.id
              ? {
                  ...entry,
                  content: `${entry.content}\n\n— Delivery failed: ${message}`,
                }
              : entry,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [book.id, book.title, getConversationHistoryPayload, isLoading],
  );

  useEffect(() => {
    if (!open) return;
    if (!pendingQuestion || !pendingQuestion.trim()) return;
    const nextQuestion = pendingQuestion.trim();
    setQuestion(nextQuestion);
    void handleSubmit(nextQuestion, { includeBookTitle: true });
    onPendingQuestionHandled();
  }, [handleSubmit, onPendingQuestionHandled, open, pendingQuestion]);

  const renderSourceLabel = useCallback((source: AnswerSource) => {
    const parts: string[] = [];
    // const chapterNumber = Number.isFinite(source.chapter_number)
    //   ? Number(source.chapter_number)
    //   : Number.isFinite(Number(source.chapter_number))
    //     ? Number(source.chapter_number)
    //     : null;
    const pageNumber = Number.isFinite(source.page_number)
      ? Number(source.page_number)
      : Number.isFinite(Number(source.page_number))
        ? Number(source.page_number)
        : null;

    // if (chapterNumber !== null || chapterNumber != 0) {
    //   parts.push(`Chapter ${chapterNumber}`);
    // }
    if (pageNumber !== null) {
      parts.push(`Page ${pageNumber}`);
    }
    // if (source.chapter_heading) {
    //   const heading = source.chapter_heading.trim();
    //   if (heading.length > 0) {
    //     parts.push(heading);
    //   }
    // }

    if (parts.length === 0 && pageNumber !== null) {
      return `Page ${pageNumber}`;
    }

    return parts.join(" • ") || "Referenced section";
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full lg:max-w-5xl overflow-hidden p-0 sm:max-h-[90vh]">
        <div className="flex h-full max-h-[90vh] flex-col">
          <DialogHeader className="flex flex-col gap-3 border-b bg-muted/40 px-6 pb-5 pt-6 sm:px-8 sm:pt-7">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 text-left">
                <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                  <MessageCircle className="h-5 w-5" />
                  Book Q&A Tutor
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {book.title}
                      </Badge>
                      <Badge variant="outline">by {book.author}</Badge>
                      {book.category && <Badge variant="outline" className="capitalize">{book.category}</Badge>}
                    </div>
                    <p>Ask a question about the book to receive curated excerpts and guidance.</p>
                  </div>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-hidden px-6 pb-6 pt-5 sm:px-8 sm:pt-6">
            <section className="space-y-2.5">
              <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Suggested prompts
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="px-3 py-1 text-xs"
                    onClick={() => {
                      setQuestion(suggestion);
                      void handleSubmit(suggestion, { includeBookTitle: true });
                    }}
                    disabled={isLoading}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </section>

            <Separator />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
              <ScrollArea className="flex-1 rounded-xl border bg-background p-5">
                <div className="space-y-4">
              {messages.length === 0 && (
                <div className="py-20 text-center text-sm text-muted-foreground">
                  Ask your first question to explore this book's content.
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-6 shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/60 bg-muted/80",
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 space-y-2 text-xs">
                        <p className="font-semibold text-muted-foreground/80">Sources</p>
                        <ul className="space-y-1.5 text-muted-foreground">
                          {message.sources.map((source) => (
                            <li key={source.chunk_id} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>
                              <span>{renderSourceLabel(source)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <span className="mt-3 block text-[0.65rem] text-muted-foreground/80">
                      {message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-6 shadow-sm border border-border/60 bg-muted/80 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={scrollAnchorRef} />
            </div>
              </ScrollArea>
            </div>

            <form
              className="space-y-3 pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit(question);
              }}
            >
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a question about this book..."
                rows={4}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit(question);
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Tip: Reference specific chapters or topics for more precise results.
                </p>
                <div className="flex items-center gap-2">
                  
                  <Button type="submit" disabled={isLoading || !question.trim()}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ask question
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
