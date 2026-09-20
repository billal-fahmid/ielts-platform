"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Plus, Trash2, MessageSquare, X, RefreshCw, Loader2, Sparkles, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageContent } from "./message-content";
import { TUTOR_LANGUAGE_LABELS, type TutorLanguage } from "@/lib/ai/tutor";
import { requestMicrophone, useSpeechRecognition, useSpeechSupport, type RecognitionError } from "@/hooks/use-speech-recognition";
import { useReadAloud } from "@/hooks/use-read-aloud";

type Message = { id: string; role: "USER" | "ASSISTANT"; content: string; language: TutorLanguage | null };
type Conversation = { id: string; title: string };

const MAX_CHARS = 2000;
const LANGUAGES: TutorLanguage[] = ["EN", "BN", "MIXED"];
const STORAGE_KEY = "tutor-language";
const AUTO_READ_KEY = "tutor-auto-read";

/** The language the browser listens for when the student speaks. Bangla only when they chose বাংলা. */
const SPEECH_LANG: Record<TutorLanguage, string> = { EN: "en-GB", BN: "bn-BD", MIXED: "en-GB" };

const MIC_ERRORS: Record<RecognitionError, string> = {
  denied: "Microphone access is blocked. Allow it in your browser's address bar to speak to the tutor.",
  "no-mic": "No microphone was found. Connect one to speak to the tutor.",
  network: "Voice input couldn't reach its speech service. Check your connection, or type instead.",
  unknown: "Voice input isn't working in this browser. You can type instead.",
};

const joinText = (base: string, spoken: string) => [base, spoken].filter(Boolean).join(" ");

const SUGGESTIONS: { label: string; text: string; send: boolean }[] = [
  { label: "Explain present perfect", text: "Explain present perfect.", send: true },
  { label: "Correct my sentence", text: "Correct my sentence: ", send: false },
  { label: "Give me IELTS vocabulary", text: "Give me IELTS vocabulary.", send: true },
  { label: "Practice English with me", text: "Practice English with me.", send: true },
  { label: "Explain this in Bangla", text: "Explain this in Bangla: ", send: false },
];

export function TutorChat({
  initialConversations,
  initialConversationId,
  initialMessages,
  levelLabel,
  defaultLanguage,
}: {
  initialConversations: Conversation[];
  initialConversationId: string | null;
  initialMessages: Message[];
  levelLabel: string | null;
  defaultLanguage: TutorLanguage;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState(initialMessages);
  const [language, setLanguage] = useState<TutorLanguage>(defaultLanguage);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const speech = useSpeechRecognition();
  const speechSupported = useSpeechSupport();
  const readAloud = useReadAloud();
  const [autoRead, setAutoRead] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  /** What was already in the box when dictation started; spoken words are added after it. */
  const micBaseRef = useRef("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const last = messages[messages.length - 1];
  const needsReply = !sending && !loadingConversation && last?.role === "USER";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "EN" || saved === "BN" || saved === "MIXED") setLanguage(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    try {
      setAutoRead(localStorage.getItem(AUTO_READ_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleAutoRead = () => {
    const next = !autoRead;
    setAutoRead(next);
    if (!next) readAloud.cancel();
    try {
      localStorage.setItem(AUTO_READ_KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  };

  // Show what is being dictated in the message box as the student speaks.
  useEffect(() => {
    if (speech.listening) setInput(joinText(micBaseRef.current, speech.liveText).slice(0, MAX_CHARS));
  }, [speech.listening, speech.liveText]);

  useEffect(() => {
    if (speech.error) setNotice(MIC_ERRORS[speech.error]);
  }, [speech.error]);

  const toggleMic = async () => {
    if (speech.listening) {
      const heard = await speech.stop();
      setInput(joinText(micBaseRef.current, heard.transcript).slice(0, MAX_CHARS));
      inputRef.current?.focus();
      return;
    }
    readAloud.cancel(); // don't let the microphone hear the tutor's voice
    setNotice(null);
    setMicBusy(true);
    const access = await requestMicrophone();
    setMicBusy(false);
    if (access !== "granted") {
      setNotice(access === "denied" ? MIC_ERRORS.denied : MIC_ERRORS["no-mic"]);
      return;
    }
    micBaseRef.current = input.trim();
    speech.start(SPEECH_LANG[language]);
  };

  /** Sends the box's content; if the mic is still on, it is stopped first so the last words are included. */
  const submit = async () => {
    let text = input;
    if (speech.listening) {
      const heard = await speech.stop();
      text = joinText(micBaseRef.current, heard.transcript);
    }
    send(text);
  };

  const chooseLanguage = (value: TutorLanguage) => {
    setLanguage(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage unavailable */
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending, needsReply]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const setUrl = (id: string | null) => window.history.replaceState(null, "", id ? `/dashboard/tutor?c=${id}` : "/dashboard/tutor");

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      setNotice(null);
      setSending(true);
      setInput("");
      readAloud.cancel();

      const tempId = `tmp-${Date.now()}`;
      setMessages((m) => [...m, { id: tempId, role: "USER", content: text, language }]);

      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text, language }),
      }).catch(() => null);
      const data = await res?.json().catch(() => null);
      setSending(false);

      if (!res?.ok || !data?.userMessage) {
        setMessages((m) => m.filter((x) => x.id !== tempId));
        setInput(text);
        setNotice(data?.error ?? "We couldn't send your message. Check your connection and try again.");
        return;
      }

      setMessages((m) => [...m.filter((x) => x.id !== tempId), data.userMessage, ...(data.assistantMessage ? [data.assistantMessage] : [])]);
      if (!conversationId) {
        setConversationId(data.conversationId);
        setUrl(data.conversationId);
      }
      setConversations((list) => [{ id: data.conversationId, title: data.title }, ...list.filter((c) => c.id !== data.conversationId)]);
      if (autoRead && data.assistantMessage) readAloud.speak(data.assistantMessage.id, data.assistantMessage.content);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, language, sending, autoRead, readAloud.speak, readAloud.cancel]
  );

  const retry = async () => {
    if (!conversationId) return;
    setNotice(null);
    setSending(true);
    const res = await fetch(`/api/ai/tutor/${conversationId}/retry`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSending(false);
    if (data?.assistantMessage) {
      setMessages((m) => [...m, data.assistantMessage]);
      if (autoRead) readAloud.speak(data.assistantMessage.id, data.assistantMessage.content);
    } else setNotice(data?.failureMessage ?? data?.error ?? "The tutor is still unavailable. Please try again in a moment.");
  };

  const newChat = () => {
    readAloud.cancel();
    setConversationId(null);
    setMessages([]);
    setNotice(null);
    setInput("");
    setListOpen(false);
    setUrl(null);
    inputRef.current?.focus();
  };

  const openConversation = async (id: string) => {
    setListOpen(false);
    if (id === conversationId) return;
    readAloud.cancel();
    setLoadingConversation(true);
    setNotice(null);
    const res = await fetch(`/api/ai/tutor/${id}`).catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoadingConversation(false);
    if (!res?.ok || !data) {
      setNotice("We couldn't open that conversation.");
      return;
    }
    setConversationId(id);
    setMessages(data.messages);
    setUrl(id);
  };

  const removeConversation = async (id: string) => {
    if (!window.confirm("Delete this conversation? This can't be undone.")) return;
    const res = await fetch(`/api/ai/tutor/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setNotice("We couldn't delete that conversation.");
      return;
    }
    setConversations((list) => list.filter((c) => c.id !== id));
    if (id === conversationId) newChat();
  };

  const onSuggestion = (s: (typeof SUGGESTIONS)[number]) => {
    if (s.send) send(s.text);
    else {
      setInput(s.text);
      inputRef.current?.focus();
    }
  };

  const list = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <Button size="sm" onClick={newChat} className="flex-1">
          <Plus className="h-4 w-4" /> New chat
        </Button>
        <button
          type="button"
          onClick={() => setListOpen(false)}
          aria-label="Close conversation list"
          className="rounded-lg p-2 text-ink-soft hover:bg-primary-soft lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 && <p className="p-3 text-xs text-ink-soft">Your conversations will appear here.</p>}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-1 rounded-lg pr-1",
              c.id === conversationId ? "bg-primary-soft" : "hover:bg-primary-soft/60"
            )}
          >
            <button
              type="button"
              onClick={() => openConversation(c.id)}
              className={cn("min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm", c.id === conversationId ? "text-primary" : "text-ink")}
            >
              {c.title}
            </button>
            <button
              type="button"
              onClick={() => removeConversation(c.id)}
              aria-label={`Delete conversation: ${c.title}`}
              className="rounded-md p-1.5 text-ink-soft opacity-70 hover:bg-danger-soft hover:text-danger hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[calc(100dvh-13rem)] min-h-[26rem] gap-4 lg:h-[calc(100dvh-8rem)]">
      <aside className="hidden w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-surface lg:block">{list}</aside>
      {listOpen && <aside className="absolute inset-0 z-20 overflow-hidden rounded-xl border border-border bg-surface lg:hidden">{list}</aside>}

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-ink-soft hover:bg-primary-soft lg:hidden"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Chats
            </button>
            <div>
              <p className="text-sm font-medium text-ink">AI English Tutor</p>
              <p className="text-xs text-ink-soft">{levelLabel ? `Teaching at your level: ${levelLabel}` : "Adapts to how you write"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {readAloud.supported && (
            <button
              type="button"
              onClick={toggleAutoRead}
              aria-pressed={autoRead}
              title="Read the tutor's replies aloud automatically"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                autoRead ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink"
              )}
            >
              {autoRead ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />} Read aloud
            </button>
          )}
          <div role="radiogroup" aria-label="Reply language" className="flex rounded-lg border border-border p-0.5">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={language === l}
                onClick={() => chooseLanguage(l)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  language === l ? "bg-primary text-white" : "text-ink-soft hover:text-ink"
                )}
              >
                {TUTOR_LANGUAGE_LABELS[l]}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
          {loadingConversation ? (
            <div className="flex h-full items-center justify-center text-ink-soft">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Sparkles className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-display text-xl text-ink">Hi! I'm your English tutor.</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Ask me about grammar, get your sentences corrected, learn IELTS vocabulary, or practise a conversation. I can explain in English, বাংলা, or both.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => onSuggestion(s)}
                    disabled={sending}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-ink transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) =>
                m.role === "USER" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-white">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-border bg-bg px-4 py-3 text-ink">
                      <MessageContent text={m.content} />
                      {readAloud.supported && (
                        <div className="mt-2 border-t border-border/60 pt-2">
                          <button
                            type="button"
                            onClick={() => (readAloud.speakingKey === m.id ? readAloud.cancel() : readAloud.speak(m.id, m.content))}
                            aria-label={readAloud.speakingKey === m.id ? "Stop reading this reply" : "Listen to this reply"}
                            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                          >
                            {readAloud.speakingKey === m.id ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            {readAloud.speakingKey === m.id ? "Stop" : "Listen"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {sending && (
                <div className="flex items-start gap-2.5" role="status" aria-label="The tutor is typing">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-border bg-bg px-4 py-3.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}

              {needsReply && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="rounded-2xl rounded-tl-md border border-dashed border-border px-4 py-3 text-sm text-ink-soft">
                    <p>The tutor couldn't reply just now. Your message is saved.</p>
                    <Button size="sm" variant="outline" onClick={retry} className="mt-2">
                      <RefreshCw className="h-3.5 w-3.5" /> Try again
                    </Button>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          {notice && (
            <p role="alert" className="mb-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
              {notice}
            </p>
          )}
          {readAloud.note && (
            <p role="status" className="mb-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-ink-soft">
              {readAloud.note}
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              aria-label="Message the tutor"
              placeholder={speechSupported ? "Type or speak…" : "Ask a question…"}
              className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
            {speechSupported !== null && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={speechSupported === false || micBusy || sending}
                aria-label={speech.listening ? "Stop voice input" : "Speak your message"}
                aria-pressed={speech.listening}
                title={
                  speechSupported === false
                    ? "Voice input needs Chrome or Edge"
                    : speech.listening
                      ? "Stop"
                      : `Speak your message (${language === "BN" ? "Bangla" : "English"})`
                }
                className={cn(
                  "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  speech.listening ? "border-primary bg-primary text-white" : "border-border text-ink-soft hover:border-primary hover:text-primary"
                )}
              >
                {speech.listening && <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-30" />}
                {micBusy ? <Loader2 className="relative h-4 w-4 animate-spin" /> : speech.listening ? <Square className="relative h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <Button onClick={submit} disabled={sending || input.trim().length === 0} aria-label="Send message" className="h-11 w-11 shrink-0 px-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {speech.listening && (
            <p role="status" className="mt-2 text-xs font-medium text-primary">
              Listening in {language === "BN" ? "Bangla" : "English"}… speak now, then tap the square to stop.
            </p>
          )}
          <p className="mt-2 text-[11px] text-ink-soft">
            Enter to send · Shift+Enter for a new line{input.length > 1800 ? ` · ${input.length}/${MAX_CHARS}` : ""} · The AI tutor can make mistakes, so check important points with your teacher.
          </p>
        </div>
      </section>
    </div>
  );
}
