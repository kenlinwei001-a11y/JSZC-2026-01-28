import React, { useState } from 'react';
import { Settings, Play, Sparkles, History, Save, Trash2, List, Code, FileText, CheckSquare } from 'lucide-react';
import { ExtractionRule, ProcessingStatus, ExtractionSkill } from '../types';

interface RuleEngineProps {
  rule: ExtractionRule | null;
  status: ProcessingStatus;
  onRunExtraction: () => void;
  onUpdateRule: (updatedRule: ExtractionRule) => void;
  onOptimizeRule: () => void;
  hasEdits: boolean;
}

const RuleEngine: React.FC<RuleEngineProps> = ({ 
  rule, 
  status, 
  onRunExtraction, 
  onUpdateRule,
  onOptimizeRule,
  hasEdits
}) => {
  const [activeTab, setActiveTab] = useState<'skills' | 'prompt' | 'schema'>('skills');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    await onOptimizeRule();
    setIsOptimizing(false);
  };

  const handleDeleteSkill = (skillId: string) => {
    if (!rule) return;
    const updatedSkills = rule.skills.filter(s => s.id !== skillId);
    onUpdateRule({
        ...rule,
        skills: updatedSkills
    });
  };

  const handleUpdateInstruction = (val: string) => {
    if (!rule) return;
    onUpdateRule({ ...rule, systemInstruction: val });
  };

  if (!rule) {
    return (
      <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200 p-6">
        <div className="text-slate-400 text-center mt-10">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">未选择规则</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200 w-[350px]">
      <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700 text-sm truncate max-w-[150px]">{rule.name}</span>
          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">v{rule.version}</span>
        </div>
        <button className="text-slate-400 hover:text-slate-600">
          <History className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        
        {/* Actions */}
        <div className="mb-4 space-y-2">
          <button
            onClick={onRunExtraction}
            disabled={status === ProcessingStatus.EXTRACTING}
            className="w-full flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-md shadow-sm text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === ProcessingStatus.EXTRACTING ? (
               <span>提取中...</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>运行提取</span>
              </>
            )}
          </button>

          {hasEdits && (
            <button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md shadow-sm text-sm font-medium transition-colors border border-purple-700 disabled:opacity-70"
            >
              {isOptimizing ? (
                <span className="animate-pulse">推演中...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI 反向优化规则</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-slate-200 mb-2">
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center ${activeTab === 'skills' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <List className="w-3 h-3 mr-1" />
            提取要素 ({rule.skills?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center ${activeTab === 'prompt' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className="w-3 h-3 mr-1" />
            Prompt
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center ${activeTab === 'schema' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Code className="w-3 h-3 mr-1" />
            Schema
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative border border-slate-200 rounded-md bg-white shadow-sm overflow-hidden">
           
           {/* Skills List View (Interactive) */}
           {activeTab === 'skills' && (
             <div className="h-full overflow-y-auto p-2">
                {(!rule.skills || rule.skills.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs text-center p-4">
                        <List className="w-8 h-8 mb-2 opacity-20" />
                        <p>该规则暂无具体技能点。</p>
                        <p>请在左侧文档中选中内容添加。</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rule.skills.map((skill: ExtractionSkill) => (
                            <div key={skill.id} className="group flex items-start p-3 bg-slate-50 hover:bg-slate-100 rounded border border-slate-100 transition-colors">
                                <div className="mt-0.5 text-brand-500 mr-2">
                                    <CheckSquare className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-xs font-bold text-slate-700 truncate">{skill.name}</h4>
                                        <button 
                                            onClick={() => handleDeleteSkill(skill.id)}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="本次运行删除此要素"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                        {skill.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div className="mt-4 p-2 text-[10px] text-slate-400 text-center border-t border-dashed border-slate-200">
                             勾选列表代表本次提取将关注的重点。删除要素不会影响全局规则库，仅影响当前会话。
                        </div>
                    </div>
                )}
             </div>
           )}

           {/* Prompt View (Read-Only/Edit) */}
           {activeTab === 'prompt' && (
             <textarea
               value={rule.systemInstruction}
               onChange={(e) => handleUpdateInstruction(e.target.value)}
               className="w-full h-full p-3 text-xs font-mono text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20"
               spellCheck={false}
             />
           )}

           {/* Schema View (Read-Only) */}
           {activeTab === 'schema' && (
             <div className="w-full h-full p-3 bg-slate-50 overflow-auto">
               <pre className="text-xs font-mono text-slate-600">
                 {JSON.stringify(JSON.parse(rule.schema), null, 2)}
               </pre>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default RuleEngine;