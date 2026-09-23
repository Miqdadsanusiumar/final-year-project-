import React, { useState, useEffect } from 'react';
import { Bot, X } from 'lucide-react';
import { Header } from './components/Header';
import { ResearchDisclaimerModal } from './components/ResearchDisclaimerModal';
import { Dashboard } from './pages/Dashboard';
import { ScanAnalysis } from './pages/ScanAnalysis';
import { AnalysisHistory } from './pages/AnalysisHistory';
import { ModelReview } from './pages/ModelReview';
import { AIChatbot } from './components/AIChatbot';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'analyze' | 'history' | 'model'>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(undefined);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  useEffect(() => {
    const accepted = localStorage.getItem('lungnet_disclaimer_accepted');
    if (accepted === 'true') {
      setDisclaimerAccepted(true);
    }
  }, []);

  const handleTabChange = (tab: 'dashboard' | 'analyze' | 'history' | 'model', caseId?: string) => {
    if (tab === 'analyze' && !disclaimerAccepted) {
      setShowDisclaimer(true);
    }
    setSelectedCaseId(caseId);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('lungnet_disclaimer_accepted', 'true');
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-slate-900">
      {/* Global Header with 3-zone contract and persistent research bar */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => handleTabChange(tab)}
      />

      {/* Main Page Stage */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <Dashboard onNavigate={handleTabChange} />
        )}

        {currentTab === 'analyze' && (
          <ScanAnalysis
            disclaimerAccepted={disclaimerAccepted}
            onDisclaimerRequest={() => setShowDisclaimer(true)}
            onAnalysisSuccess={() => {}}
          />
        )}

        {currentTab === 'history' && (
          <AnalysisHistory
            initialSelectedId={selectedCaseId}
            onClearInitialId={() => setSelectedCaseId(undefined)}
          />
        )}

        {currentTab === 'model' && (
          <ModelReview />
        )}
      </main>

      {/* Quiet Academic Research Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">LungNet Research Platform</span>
          </div>

          <div className="text-center sm:text-right text-slate-500">
            <span>Protocol: Zero fabricated metrics · Verified patient-disjoint splits</span>
            <span className="mx-2">·</span>
            <span className="font-mono text-[11px]">Build v0.3.0</span>
          </div>
        </div>
      </footer>

      {/* One-time Disclaimer Modal */}
      <ResearchDisclaimerModal
        isOpen={showDisclaimer}
        onAccept={handleAcceptDisclaimer}
      />

      {/* Persistent Floating AI Research Chatbot */}
      <div className="fixed bottom-6 right-6 z-40">
        {isChatOpen ? (
          <div className="shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <AIChatbot embedded={false} onClose={() => setIsChatOpen(false)} />
          </div>
        ) : (
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-[#102E36] hover:bg-[#0D524F] text-white rounded-full shadow-lg border border-teal-500/30 hover:scale-105 transition-all text-xs font-semibold cursor-pointer group"
            title="Open LungNet AI Research Assistant"
          >
            <div className="w-6 h-6 rounded-full bg-teal-800/80 flex items-center justify-center text-teal-300">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span>AI Research Assistant</span>
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          </button>
        )}
      </div>
    </div>
  );
}
