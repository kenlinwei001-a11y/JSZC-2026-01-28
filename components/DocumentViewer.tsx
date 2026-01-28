import React, { useState, useRef } from 'react';
import { FileText, ChevronLeft, ChevronRight, Plus, X, ScanSearch, Wand2, AlertTriangle, MessageSquarePlus } from 'lucide-react';
import { DocumentFile, BadCase, BadCaseType } from '../types';

interface DocumentViewerProps {
  document: DocumentFile;
  extractedValues?: string[]; // All extracted values to highlight
  activeValue?: string | null; // The currently focused value to highlight differently
  badCases?: BadCase[]; // New: List of bad cases to highlight
  onAddSkill?: (text: string, description: string, fieldName: string) => void;
  onAiAnalysis?: (text: string) => void; 
  onMarkBadCase?: (text: string, type: BadCaseType) => void; // New callback
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  document, 
  extractedValues = [], 
  activeValue = null, 
  badCases = [],
  onAddSkill,
  onAiAnalysis,
  onMarkBadCase
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Selection Popup State
  const [selection, setSelection] = useState<{text: string; top: number; left: number} | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleMouseUp = () => {
    if (isPopupOpen || isAnalyzing) return; // Don't override if busy
    
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0 && contentRef.current?.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Calculate relative position inside the scrolling container
      const scrollTop = contentRef.current.parentElement?.scrollTop || 0;
      
      setSelection({
        text: sel.toString().trim(),
        top: rect.bottom + scrollTop + 10, // Position below selection
        left: rect.left + (rect.width / 2) // Center horizontally
      });
    } else {
      setSelection(null);
    }
  };

  const initiateSkillCreation = () => {
    if (selection) {
        setIsPopupOpen(true);
        setSkillDesc(`从选中文本 "${selection.text}" 中提取...`);
        setFieldName('');
    }
  };

  const initiateAiAnalysis = () => {
    if (selection && onAiAnalysis) {
        setIsAnalyzing(true);
        onAiAnalysis(selection.text);
        setTimeout(() => {
            setIsAnalyzing(false);
            setSelection(null);
            window.getSelection()?.removeAllRanges();
        }, 1000); 
    }
  };

  const handleMark = (type: BadCaseType) => {
    if (selection && onMarkBadCase) {
        onMarkBadCase(selection.text, type);
        cancelSelection();
    }
  };

  const cancelSelection = () => {
    setSelection(null);
    setIsPopupOpen(false);
    window.getSelection()?.removeAllRanges();
  };

  const confirmSkill = () => {
    if (onAddSkill && selection) {
        onAddSkill(selection.text, skillDesc, fieldName);
        cancelSelection();
    }
  };

  // Helper to highlight text within the content
  const renderContentWithHighlights = (text: string) => {
    // Collect all strings to split by
    const valuesToHighlight = extractedValues.filter(v => v && v.toString().trim().length > 0);
    const active = activeValue && activeValue.trim().length > 0 ? activeValue : null;
    const badCaseTexts = badCases.map(bc => bc.text);

    const allPatterns = [...valuesToHighlight, ...badCaseTexts];
    if (active) allPatterns.push(active);

    const uniquePatterns = Array.from(new Set(allPatterns.filter(p => p.length > 0)));

    if (uniquePatterns.length === 0) return <span>{text}</span>;

    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patternRegex = new RegExp(`(${uniquePatterns.map(escapeRegExp).join('|')})`, 'gi');
    
    const parts = text.split(patternRegex);

    return parts.map((part, index) => {
      const lowerPart = part.toLowerCase();
      
      // 1. Bad Cases Highlighting
      const matchingBadCase = badCases.find(bc => bc.text.toLowerCase() === lowerPart);
      if (matchingBadCase) {
         return (
            <span 
                key={index} 
                className={`cursor-help border-b-2 px-0.5 rounded ${
                    matchingBadCase.type === 'missed' 
                    ? 'border-red-500 bg-red-100 text-red-900' 
                    : 'border-amber-500 bg-amber-100 text-amber-900 line-through decoration-amber-500'
                }`}
                title={matchingBadCase.type === 'missed' ? "标记为：漏提" : "标记为：错提"}
            >
              {part}
            </span>
         );
      }

      // 2. Active Value (Focused)
      if (active && lowerPart === active.toLowerCase()) {
         return (
            <span key={index} className="bg-yellow-300 text-slate-900 font-bold px-0.5 rounded border-b-2 border-yellow-500 cursor-pointer shadow-sm animate-pulse" title="当前选中字段">
              {part}
            </span>
         );
      } 
      
      // 3. Extracted Value (General)
      if (valuesToHighlight.some(v => v.toLowerCase() === lowerPart)) {
         return (
            <span key={index} className="bg-green-100 text-green-800 font-medium px-0.5 rounded border-b border-green-200 cursor-pointer hover:bg-green-200 transition-colors" title="已自动提取">
              {part}
            </span>
         );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 border-r border-slate-200 relative">
      {/* Toolbar */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2 text-slate-600">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium truncate max-w-[150px]">{document.name}</span>
        </div>
        <div className="flex items-center space-x-2 bg-slate-100 rounded-md px-2 py-1">
          <button 
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(c => Math.max(0, c - 1))}
            className="p-1 hover:bg-white rounded disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-xs text-slate-500 font-mono">
            第 {currentPage + 1} 页 / 共 {document.content.length} 页
          </span>
          <button 
            disabled={currentPage === document.content.length - 1}
            onClick={() => setCurrentPage(c => Math.min(document.content.length - 1, c + 1))}
            className="p-1 hover:bg-white rounded disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-100/50 relative">
        <div 
            ref={contentRef}
            onMouseUp={handleMouseUp}
            className="bg-white shadow-sm border border-slate-200 w-full max-w-[800px] min-h-[800px] p-10 text-sm leading-relaxed text-slate-800 font-serif relative"
        >
          {/* Simulated Page Content */}
          <div className="mb-4 text-xs text-slate-400 text-right uppercase tracking-widest">
            第 {currentPage + 1} 页
          </div>
          <div className="whitespace-pre-wrap">
             {renderContentWithHighlights(document.content[currentPage])}
          </div>
        </div>

        {/* Floating Selection Tool */}
        {selection && !isPopupOpen && (
            <div 
                style={{ top: selection.top, left: selection.left }}
                className="fixed transform -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-200 flex flex-col items-center space-y-1"
            >
                <div className="flex space-x-2 bg-white rounded-full shadow-lg p-1 border border-slate-200">
                     <button 
                        onClick={() => handleMark('missed')}
                        className="flex items-center space-x-1 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        title="标记为漏提内容"
                    >
                        <MessageSquarePlus className="w-3 h-3" />
                        <span>漏提</span>
                    </button>
                    <div className="w-[1px] bg-slate-200 h-6"></div>
                    <button 
                        onClick={() => handleMark('incorrect')}
                        className="flex items-center space-x-1 hover:bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        title="标记为错误提取"
                    >
                        <AlertTriangle className="w-3 h-3" />
                        <span>错提</span>
                    </button>
                </div>
                
                <div className="flex space-x-2">
                    <button 
                        onClick={initiateAiAnalysis}
                        disabled={isAnalyzing}
                        className="flex items-center space-x-1 bg-purple-600 text-white px-3 py-1.5 rounded-full shadow-lg hover:bg-purple-700 text-xs font-medium transition-colors"
                    >
                        {isAnalyzing ? <Wand2 className="w-3 h-3 animate-spin"/> : <ScanSearch className="w-3 h-3" />}
                        <span>AI 局部侦测</span>
                    </button>
                    <button 
                        onClick={initiateSkillCreation}
                        className="flex items-center space-x-1 bg-slate-800 text-white px-3 py-1.5 rounded-full shadow-lg hover:bg-slate-700 text-xs font-medium transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        <span>存为新规则</span>
                    </button>
                </div>
            </div>
        )}

        {/* Creation Popover */}
        {isPopupOpen && selection && (
             <div 
                style={{ top: selection.top, left: selection.left }}
                className="fixed transform -translate-x-1/2 z-50 w-72 bg-white rounded-lg shadow-xl border border-slate-200 p-4 animate-in fade-in zoom-in duration-200"
            >
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase">新建提取技能</h3>
                    <button onClick={cancelSelection} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] text-slate-500 font-medium mb-1">目标字段名称</label>
                        <input 
                            value={fieldName}
                            onChange={e => setFieldName(e.target.value)}
                            placeholder="例如：总金额"
                            className="w-full text-xs p-2 border border-slate-300 rounded focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-slate-500 font-medium mb-1">提取逻辑描述</label>
                        <textarea 
                            value={skillDesc}
                            onChange={e => setSkillDesc(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-300 rounded focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none h-16"
                        />
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                        <p className="text-[10px] text-slate-500 truncate"><span className="font-semibold">选中内容:</span> "{selection.text}"</p>
                    </div>
                    <button 
                        onClick={confirmSkill}
                        disabled={!fieldName}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white py-1.5 rounded text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                        保存到规则库
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;