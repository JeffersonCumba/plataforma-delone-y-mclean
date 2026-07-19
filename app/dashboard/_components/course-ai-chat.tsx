"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Bot, Loader2, Send, Trash2, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { type AnalyticsData } from "@/types/analytics";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface CourseAiChatContextValue {
  openChat: (prefill?: string) => void;
  closeChat: () => void;
  clearChat: () => void;
  isOpen: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  error: string | null;
  input: string;
  setInput: (value: string) => void;
  sendMessage: (content: string) => Promise<void>;
  courseName: string;
  scrollRef: RefObject<HTMLDivElement | null>;
}

const CourseAiChatContext = createContext<CourseAiChatContextValue | null>(
  null,
);

export function useCourseAiChat(): CourseAiChatContextValue {
  const context = useContext(CourseAiChatContext);
  if (!context) {
    throw new Error(
      "useCourseAiChat must be used within a CourseAiChatProvider",
    );
  }
  return context;
}

const SUGGESTIONS: string[] = [
  "¿Cual dimension presenta el mayor riesgo y por que?",
  "Explica el coeficiente beta dominante en terminos de negocio.",
  "¿Que acciones concretas me recomiendas para mejorar la satisfaccion?",
  "¿Como interpreto el Alfa de Cronbach en este contexto?",
];

function parseStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  return (onChunk: (chunk: string) => void) => {
    return (async () => {
      let accumulated = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        const text = decoder.decode(value, { stream: true });
        accumulated += text;
        onChunk(text);
      }
      return accumulated;
    })();
  };
}

interface CourseAiChatProviderProps {
  children: ReactNode;
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
}

export function CourseAiChatProvider({
  children,
  courseId,
  courseName,
  analytics,
}: CourseAiChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const isSendingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const sendMessage = useCallback(
    async (rawContent: string) => {
      if (isSendingRef.current) {
        return;
      }

      const content = rawContent.trim();
      if (!content) {
        return;
      }

      isSendingRef.current = true;

      const userMessage: ChatMessage = { role: "user", content };
      const historySnapshot = [...messagesRef.current, userMessage];
      const nextMessages: ChatMessage[] = [
        ...historySnapshot,
        { role: "assistant", content: "" },
      ];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setInput("");
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            courseName,
            analytics,
            messages: historySnapshot,
          }),
        });

        if (!response.ok || !response.body) {
          const payload = await response
            .json()
            .catch(() => ({ message: "Error al contactar al asistente" }));
          throw new Error(payload.message ?? "Error desconocido");
        }

        const reader = response.body.getReader();
        const stream = parseStream(reader);

        await stream((accumulated) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = { ...last, content: accumulated };
            }
            return next;
          });
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error desconocido";
        setError(message);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant" && last.content === "") {
            next.pop();
            messagesRef.current = next;
          }
          return next;
        });
      } finally {
        setIsLoading(false);
        isSendingRef.current = false;
      }
    },
    [analytics, courseId, courseName],
  );

  useEffect(() => {
    if (isOpen && prefill && !isLoading && !isSendingRef.current) {
      const msg = prefill;
      setPrefill(null);
      void sendMessage(msg);
    }
  }, [isOpen, prefill, isLoading, sendMessage]);

  const openChat = useCallback((prefillMessage?: string) => {
    if (prefillMessage) {
      setPrefill(prefillMessage);
    }
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => setIsOpen(false), []);

  const clearChat = useCallback(() => {
    if (isSendingRef.current) {
      return;
    }
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    setPrefill(null);
  }, []);

  const value: CourseAiChatContextValue = {
    openChat,
    closeChat,
    clearChat,
    isOpen,
    isLoading,
    messages,
    error,
    input,
    setInput,
    sendMessage,
    courseName,
    scrollRef,
  };

  return (
    <CourseAiChatContext.Provider value={value}>
      {children}
      <CourseAiChatFab />
      <CourseAiChatPanel />
    </CourseAiChatContext.Provider>
  );
}

function CourseAiChatFab() {
  const { isOpen, openChat } = useCourseAiChat();

  return (
    <button
      type="button"
      aria-label="Abrir asistente de IA"
      onClick={() => openChat()}
      className={cn(
        "group fixed bottom-6 right-6 z-40 flex size-13 items-center justify-center rounded-full text-white bg-cyan-600 hover:bg-black",
        "transition-all duration-200 hover:cursor-pointer",
        "hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60",
        isOpen && "pointer-events-none scale-95 opacity-0",
      )}
    >
      <Bot className="size-8" />
    </button>
  );
}

function CourseAiChatPanel() {
  const {
    isOpen,
    closeChat,
    clearChat,
    sendMessage,
    isLoading,
    messages,
    error,
    input,
    courseName,
    scrollRef,
  } = useCourseAiChat();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const isEmpty = messages.length === 0;
  const canClear = !isLoading && messages.length > 0;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeChat();
        }
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full w-full flex-col gap-0 border-l-cyan-200/80 bg-linear-to-b from-white via-slate-50 to-cyan-50/40 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-slate-200/80 bg-white/80 p-5 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-linear-to-br from-cyan-500 to-teal-600 text-white shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-base text-slate-950">
                  Asistente de IA
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Analisis · {courseName}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearChat}
                disabled={!canClear}
                title="Limpiar conversacion"
                aria-label="Limpiar conversacion"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={closeChat}
                aria-label="Cerrar asistente"
                title="Cerrar asistente"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-5"
        >
          {isEmpty ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 p-4 shadow-sm">
                <p className="text-sm text-slate-700">
                  Hola, soy tu copiloto analitico. Puedo ayudarte a interpretar
                  los resultados del curso segun el modelo DeLone y McLean.
                  Preguntame lo que necesites.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sugerencias
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      disabled={isLoading}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatBubble
                key={`${message.role}-${index}`}
                message={message}
                isStreaming={
                  isLoading &&
                  index === messages.length - 1 &&
                  message.role === "assistant"
                }
              />
            ))
          )}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200/80 bg-white/90 p-3 backdrop-blur"
        >
          <p className="mt-2 text-[11px] text-slate-500">
            Las respuestas se generan a partir de los datos reales del curso.
            Verifica cualquier conclusion antes de tomar decisiones.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ChatBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
          isUser ? "bg-slate-700" : "bg-linear-to-br from-cyan-500 to-teal-600",
        )}
      >
        {isUser ? (
          <UserRound className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm",
          isUser
            ? "rounded-tr-sm bg-slate-900 text-white"
            : "rounded-tl-sm border border-cyan-100 bg-white text-slate-800",
        )}
      >
        {message.content || (isStreaming ? "" : "...")}
        {isStreaming && message.content.length === 0 ? (
          <span className="inline-flex items-center gap-1 text-slate-400">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500" />
          </span>
        ) : null}
        {isStreaming && message.content.length > 0 ? (
          <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse rounded-sm bg-cyan-500" />
        ) : null}
      </div>
    </div>
  );
}
