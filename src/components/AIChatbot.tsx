import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  User,
  ShieldAlert,
  ChevronDown,
  Minimize2,
  Maximize2
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Explain quantum computing simply",
  "Write a Python script for image preprocessing",
  "What are hallmark CT features of malignant nodules?",
  "How do transformers & LLMs work?",
  "What are best practices for React performance?"
];

interface AIChatbotProps {
  embedded?: boolean;
  className?: string;
  onClose?: () => void;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({
  embedded = true,
  className = '',
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: "Hello! I am your **AI Assistant**, ready to help you with **any question** across all subjects—just like ChatGPT! You can ask about general knowledge, programming and coding, writing and analysis, mathematics, or specialized topics like pulmonary CT imaging and neural network architectures.\n\n*What would you like to explore or solve today?*",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setError(null);
    setInput('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    try {
      // Build history for backend
      const historyPayload = nextMessages.slice(-6).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const modelMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (err: any) {
      console.error("Chatbot query failed:", err);
      setError(err?.message || "Failed to get a response from the research assistant.");
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: "Conversation reset. Feel free to ask any question regarding pulmonary CT classification, CNN architecture, or study validation methodology.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setError(null);
  };

  // Basic formatting helper for markdown bold and bullet points
  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Render bullet items
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const content = isBullet ? line.trim().substring(2) : line;

      // Simple bold replacer
      const parts = content.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-700 leading-relaxed my-0.5">
            {renderedParts}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="leading-relaxed my-1 text-slate-700">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden ${
        embedded ? 'w-full' : 'w-96 max-w-[calc(100vw-2rem)] h-[540px]'
      } ${className}`}
    >
      {/* Chatbot Header */}
      <div className="px-5 py-4 bg-[#102E36] text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-800/80 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-white">
                LungNet AI Assistant
              </h3>
              <span className="text-[10px] font-mono bg-teal-900/80 border border-teal-500/40 text-teal-300 px-1.5 py-0.5 rounded">
                All Topics · Gemini 3.8
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              General-purpose assistant (ChatGPT-style) · Ready for all questions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClear}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Close chat"
              aria-label="Close chat"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-slate-400 font-semibold uppercase tracking-wider shrink-0 text-[10px] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#126B67]" />
          Suggested:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="px-2.5 py-1 bg-white hover:bg-teal-50 text-slate-600 hover:text-[#126B67] border border-slate-200 hover:border-teal-300 rounded-md whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Thread */}
      <div
        className={`flex-1 p-5 overflow-y-auto space-y-4 ${
          embedded ? 'min-h-[280px] max-h-[460px]' : 'h-full'
        }`}
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs shadow-xs ${
                  isUser
                    ? 'bg-[#126B67] text-white'
                    : 'bg-teal-50 border border-teal-200 text-[#126B67]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-xs shadow-xs group relative ${
                  isUser
                    ? 'bg-[#126B67] text-white rounded-tr-xs'
                    : 'bg-slate-50/90 border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                ) : (
                  <div className="prose-xs leading-relaxed">{formatText(m.text)}</div>
                )}

                <div
                  className={`mt-2 flex items-center justify-between text-[10px] ${
                    isUser ? 'text-teal-100' : 'text-slate-400'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(m.id, m.text)}
                      className="opacity-0 group-hover:opacity-100 hover:text-slate-700 transition-opacity flex items-center gap-1 ml-2"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-teal-600" />
                          <span className="text-teal-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 items-center text-xs text-slate-500">
            <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 text-[#126B67] flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl rounded-tl-xs flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#126B67]" />
              <span>Thinking and formulating response...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Query encountered an issue</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
            <button
              onClick={() => handleSend(messages[messages.length - 1]?.text)}
              className="text-xs font-semibold underline text-rose-800 hover:text-rose-950 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form & Non-Diagnostic Disclaimer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask me anything (general questions, coding, research, writing, science)..."
            className="flex-1 px-4 py-2 text-xs bg-white border border-slate-300 focus:border-[#126B67] focus:ring-1 focus:ring-[#126B67] rounded-lg outline-none text-slate-800 placeholder:text-slate-400 transition-colors disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#126B67] hover:bg-[#0D524F] disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Ask AI</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-[10px]">
            <ShieldAlert className="w-3 h-3 text-amber-500" />
            Research use only — not for medical diagnosis
          </span>
          <span className="text-[10px] text-slate-400">
            Powered by Gemini 3.8 Flash
          </span>
        </div>
      </div>
    </div>
  );
};
