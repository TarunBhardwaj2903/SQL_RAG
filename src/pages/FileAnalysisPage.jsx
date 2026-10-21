import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, AlertCircle, ArrowLeft, Lightbulb } from 'lucide-react';
import FileDropzone from '../components/file/FileDropzone';
import SchemaPreview from '../components/file/SchemaPreview';
import AnalysisResultCard from '../components/file/AnalysisResultCard';
import { uploadFile, analyzeFile } from '../data/fileApiClient';

function ThinkingIndicator() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 animate-fade-in">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
        <Sparkles size={18} className="text-white animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-400 dot-1" />
          <span className="w-2 h-2 rounded-full bg-indigo-400 dot-2" />
          <span className="w-2 h-2 rounded-full bg-indigo-400 dot-3" />
        </div>
        <span className="text-sm font-medium text-slate-400">
          Analyzing data & generating visualization...
        </span>
      </div>
    </div>
  );
}

export default function FileAnalysisPage() {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'uploading' | 'ready' | 'analyzing' | 'result' | 'error'
  const [sessionData, setSessionData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [promptText, setPromptText] = useState('');
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const textareaRef = useRef(null);

  // Auto-resize prompt textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [promptText]);

  const handleFileUpload = async (file) => {
    setPhase('uploading');
    setErrorMsg(null);
    try {
      const data = await uploadFile(file);
      setSessionData(data);
      setPhase('ready');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to upload file');
      setPhase('error');
    }
  };

  const handleAnalyzeSubmit = async () => {
    const q = promptText.trim();
    if (!q || !sessionData || phase === 'analyzing') return;

    setLastSubmittedPrompt(q);
    setPhase('analyzing');
    setErrorMsg(null);

    try {
      const res = await analyzeFile(sessionData.session_id, q);
      setAnalysisResult(res);
      setPhase('result');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Analysis failed. Please try rephrasing your prompt.');
      setPhase('error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyzeSubmit();
    }
  };

  const handleResetFile = () => {
    setPhase('idle');
    setSessionData(null);
    setAnalysisResult(null);
    setPromptText('');
    setErrorMsg(null);
  };

  const handleAskAnother = () => {
    setPhase('ready');
    setAnalysisResult(null);
    setPromptText('');
    setErrorMsg(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-6 py-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">

        {/* Page Header */}
        <div className="text-center max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Sparkles className="text-indigo-400" size={24} />
            File Data Intelligence
          </h1>
          <p className="text-sm text-slate-400">
            Upload any CSV or Excel file and ask natural language questions to generate instant insights and interactive charts.
          </p>
        </div>

        {/* Phase: Idle (Upload Dropzone) */}
        {phase === 'idle' && (
          <FileDropzone onFileSelect={handleFileUpload} disabled={false} />
        )}

        {/* Phase: Uploading */}
        {phase === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
            <Loader2 className="animate-spin text-indigo-400" size={36} />
            <p className="text-sm font-medium text-slate-300">Parsing and inspecting file schema...</p>
          </div>
        )}

        {/* Phase: Ready / Analyzing / Result (Schema Preview Header) */}
        {(phase === 'ready' || phase === 'analyzing' || phase === 'result') && sessionData && (
          <SchemaPreview sessionData={sessionData} onReset={handleResetFile} />
        )}

        {/* Phase: Ready / Analyzing (Prompt Input Section) */}
        {(phase === 'ready' || phase === 'analyzing') && (
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 animate-fade-in">
            <div className={`relative flex items-end gap-3 rounded-2xl border transition-all bg-slate-800/60
                            ${phase === 'analyzing' ? 'border-slate-700 opacity-60' : 'border-slate-700 focus-within:border-indigo-500/50'}`}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={phase === 'analyzing'}
                placeholder={`Ask a question about ${sessionData?.filename || 'your file'}...`}
                className="flex-1 resize-none bg-transparent px-4 py-3.5 text-sm text-slate-200
                           placeholder-slate-500 focus:outline-none leading-relaxed"
                style={{ minHeight: '52px', maxHeight: '160px' }}
              />

              <div className="pr-3 pb-3 shrink-0">
                <button
                  onClick={handleAnalyzeSubmit}
                  disabled={phase === 'analyzing' || !promptText.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                             bg-indigo-600 hover:bg-indigo-500
                             disabled:bg-slate-700 disabled:text-slate-500
                             text-white transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                >
                  {phase === 'analyzing' ? (
                    <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
                  ) : (
                    <><Send size={15} /> Analyze</>
                  )}
                </button>
              </div>
            </div>

            {/* Tip line */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1 text-slate-400">
                <Lightbulb size={12} className="text-amber-400" />
                Tip: Mention chart preference in your prompt (e.g. <em>"as a pie chart"</em>, <em>"line graph"</em>)
              </span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-600 font-mono text-[9px]">Enter</kbd> to submit</span>
            </div>
          </div>
        )}

        {/* Phase: Analyzing indicator */}
        {phase === 'analyzing' && <ThinkingIndicator />}

        {/* Phase: Result */}
        {phase === 'result' && analysisResult && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between max-w-4xl mx-auto w-full border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Analysis Result for</span>
                <h3 className="text-sm font-semibold text-indigo-300 font-mono">"{lastSubmittedPrompt}"</h3>
              </div>
              <button
                onClick={handleAskAnother}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-all cursor-pointer"
              >
                <ArrowLeft size={13} /> Ask Another Question
              </button>
            </div>

            <AnalysisResultCard result={analysisResult} prompt={lastSubmittedPrompt} />
          </div>
        )}

        {/* Phase: Error */}
        {phase === 'error' && (
          <div className="w-full max-w-2xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col items-center text-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle size={20} />
            </div>
            <h4 className="text-sm font-semibold text-red-300">Analysis Error</h4>
            <p className="text-xs text-red-400 max-w-md">{errorMsg || 'An error occurred.'}</p>
            <button
              onClick={() => sessionData ? setPhase('ready') : setPhase('idle')}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              {sessionData ? 'Back to Prompt' : 'Upload File Again'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
