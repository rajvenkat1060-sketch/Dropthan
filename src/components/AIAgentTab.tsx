import React, { useState, useEffect, useRef } from 'react';
import { AIMessage, UserProfile } from '../types';

interface AIAgentTabProps {
  currentUser: UserProfile | null;
}

export const AIAgentTab: React.FC<AIAgentTabProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'ai-1',
      sender: 'ai',
      text: 'Hello! I am Dropthan AI Sourcing Assistant. Ask me about wholesale supplier discovery, MOQ negotiation, e-commerce profit margins, GST HSN breakdown, or digital marketing ROI calculations!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendPrompt = async (promptToSend?: string) => {
    const prompt = (promptToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    const userMsg: AIMessage = {
      id: `ai-user-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptToSend) setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          userContext: currentUser,
        }),
      });

      const data = await response.json();
      const replyText = data.reply || data.details || 'Unable to analyze sourcing prompt right now.';

      const aiMsg: AIMessage = {
        id: `ai-bot-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: '⚠️ Network connection issue while reaching Dropthan AI. Please verify your connection or try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'Find cotton tshirt manufacturers in Surat with MOQ < 50',
    'Estimate profit margin for dropshipping custom packaging',
    'Calculate GST breakdown for ₹180 wholesale price',
    'Draft a supplier price negotiation script for bulk order',
  ];

  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-4 space-y-3 shadow-md">
      <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h2 className="text-xs font-bold text-slate-900">Dropthan AI Mobile Sourcing</h2>
            <p className="text-[10px] text-[#0d47a1] font-bold">Powered by Gemini 3.6 Flash</p>
          </div>
        </div>
        <span className="text-[9px] bg-blue-50 text-[#0d47a1] border border-blue-200 px-2 py-0.5 rounded font-bold">
          LIVE AI
        </span>
      </div>

      {/* Suggested Prompts */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(p)}
            className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition font-medium"
          >
            💡 {p}
          </button>
        ))}
      </div>

      {/* AI Chat History */}
      <div className="h-72 overflow-y-auto p-3 bg-blue-50/30 rounded-xl text-xs space-y-3 border border-blue-100">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#0d47a1] text-white shadow-sm'
                  : 'bg-white text-slate-800 border border-blue-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1 text-[9px] font-bold opacity-75">
                <span>{m.sender === 'user' ? 'You' : 'Dropthan AI Agent'}</span>
                <span>{m.timestamp}</span>
              </div>
              <p className="whitespace-pre-line">{m.text}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-[#0d47a1] text-xs py-2 font-semibold">
            <div className="w-2 h-2 rounded-full bg-[#0d47a1] animate-ping" />
            <span>Dropthan AI is analyzing supplier databases & market prices...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Prompt Input Form */}
      <div className="flex items-center space-x-1.5 pt-1">
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
          placeholder="Ask AI agent about suppliers, margins, GST..."
          className="flex-1 bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1]"
        />
        <button
          onClick={() => handleSendPrompt()}
          disabled={isLoading}
          className="bg-[#0d47a1] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow"
        >
          Ask
        </button>
      </div>
    </div>
  );
};
