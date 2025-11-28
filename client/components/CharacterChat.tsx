import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface Character {
  id: string;
  name: string;
  short_description: string | null;
  persona: string | null;
  example_responses: string[] | null;
}

interface DbBook {
  id: string;
  title: string;
  author: string;
}

interface CharacterChatProps {
  book: DbBook;
  character: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "character";
  sender: string;
  content: string;
  createdAt: Date;
}

function buildGreetingMessage(character: Character): ChatMessage {
  const greeting = `Hello! I'm ${character.name}.`;

  return {
    id: `character-greeting-${Date.now()}`,
    role: "character",
    sender: character.name,
    content: greeting,
    createdAt: new Date(),
  };
}

export function CharacterChat({
  book,
  character,
  open,
  onOpenChange,
}: CharacterChatProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  // Initialize messages when character changes
  useEffect(() => {
    if (character) {
      setMessages([buildGreetingMessage(character)]);
    } else {
      setMessages([]);
    }
  }, [character?.id]);

  // Close handler
  useEffect(() => {
    if (!open) {
      setError(null);
      setMessage("");
      setIsLoading(false);
    }
  }, [open]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const getConversationStarters = useCallback((char: Character) => {
    if (char.example_responses && char.example_responses.length > 0) {
      return [
        `Tell me more about yourself, ${char.name}`,
        "What's your role in this story?",
        "How did you get involved in this adventure?",
      ];
    }
    return [];
  }, []);

  const handleSubmit = useCallback(
    async (rawMessage: string) => {
      if (!rawMessage.trim() || !character || isLoading) {
        return;
      }

      const trimmed = rawMessage.trim();

      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        sender: "You",
        content: trimmed,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setMessage("");
      setIsLoading(true);
      setError(null);

      try {
        // Build conversation history for context
        const conversationHistory = messages
          .filter((msg) => msg.role === "user" || msg.role === "character")
          .map((msg) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          }));

        const response = await fetch(
          `${BACKEND_URL}/api/v1/books/${book.id}/characters/${character.id}/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: trimmed,
              conversation_history: conversationHistory,
            }),
          }
        );

        const result = await response.json().catch(() => null);

        if (!response.ok || !result) {
          throw new Error(
            (result && (result.error?.message || result.message)) || response.statusText
          );
        }

        // Extract data from response wrapper
        const payload = result.data || result;

        const characterMessage: ChatMessage = {
          id: `${Date.now()}-character`,
          role: "character",
          sender: character.name,
          content: payload.message || "I'm not sure how to respond to that!",
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, characterMessage]);
      } catch (caught) {
        const errorMsg = (caught as Error)?.message || "Unable to get response.";
        setError(errorMsg);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id
              ? {
                  ...msg,
                  content: `${msg.content}\n\n— Failed to send: ${errorMsg}`,
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [book.id, character, isLoading, messages]
  );

  const starters =
    character && messages.length === 1 ? getConversationStarters(character) : [];

  if (!character) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full lg:max-w-5xl overflow-hidden p-0 sm:max-h-[90vh]">
        <div className="flex h-full max-h-[90vh] flex-col">
          <DialogHeader className="flex flex-col gap-3 border-b bg-muted/40 px-6 pb-5 pt-6 sm:px-8 sm:pt-7">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 text-left">
                <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                  <MessageCircle className="h-5 w-5" />
                  Chat with {character.name}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{book.title}</Badge>
                      <Badge variant="outline">by {book.author}</Badge>
                    </div>

                  </div>
                </DialogDescription>
              </div>
           
            </div>
          </DialogHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-hidden px-6 pb-6 pt-5 sm:px-8 sm:pt-6">
            {starters.length > 0 && (
              <>
                <section className="space-y-2.5">
                  <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    Suggested openers
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {starters.map((starter) => (
                      <Button
                        key={starter}
                        variant="outline"
                        size="sm"
                        className="px-3 py-1 text-xs"
                        onClick={() => {
                          setMessage(starter);
                          void handleSubmit(starter);
                        }}
                        disabled={isLoading}
                      >
                        {starter}
                      </Button>
                    ))}
                  </div>
                </section>

                <Separator />
              </>
            )}

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
                      Start a conversation with {character.name}.
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === "character" && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                            {character.name[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-5 py-4 text-sm leading-6 shadow-sm",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border border-border/60 bg-muted/80"
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                        <span className="mt-2 block text-[0.65rem] text-muted-foreground/80">
                          {msg.createdAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {msg.role === "user" && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
                            Y
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                          {character.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-[70%] rounded-2xl px-5 py-4 text-sm leading-6 shadow-sm border border-border/60 bg-muted/80 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">{character.name} is thinking...</span>
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
                void handleSubmit(message);
              }}
            >
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={`What would you like to ask ${character.name}?`}
                rows={3}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit(message);
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Shift+Enter for a new line
                </p>
                <div className="flex items-center gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isLoading}>
                      Close
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isLoading || !message.trim()}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send
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
