import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Code, FileText, Check, Sparkles, Wand2, Tag, ArrowRight, User, Calendar, Activity, Bot, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DocType, ExtractionRule, ExtractionSkill, DocTypeCN, SkillCategory, SkillCategoryCN } from '../types';
import { optimizeSkillDescription, generateRuleStructure } from '../services/geminiService';

interface RuleLibraryProps {
  rules: ExtractionRule[];
  onUpdateRules: (rules: ExtractionRule[]) => void;
  onBack: () => void;
}

const RuleLibrary: React.FC<RuleLibraryProps> = ({ rules, onUpdateRules, onBack }) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(rules[0]?.id || null);
  const [editForm, setEditForm] = useState<ExtractionRule | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loadingSkillId, setLoadingSkillId] = useState<string | null>(null);
  
  // AI Generation Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize form when selection changes
  React.useEffect(() => {
    if (selectedRuleId) {
      const rule = rules.find(r => r.id === selectedRuleId);
      if (rule) {
        setEditForm({ ...rule, skills: rule.skills || [] }); // Ensure skills array exists
        setIsDirty(false);
      }
    }
  }, [selectedRuleId, rules]);

  const handleCreate = () => {
    const newRule: ExtractionRule = {
      id: uuidv4(),
      docType: DocType.UNKNOWN,
      name: '新提取规则',
      version: 1,
      isActive: true,
      creatorName: '我 (当前用户)',
      creationMethod: 'Manual',
      lastRunDate: 'Never',
      systemInstruction: '基于以下定义的技能提取字段。',
      skills: [],
      schema: JSON.stringify({ "示例字段": "string" }, null, 2)
    };
    const updatedRules = [...rules, newRule];
    onUpdateRules(updatedRules);
    setSelectedRuleId(newRule.id);
  };

  const handleAiGenerate = async () => {
      if (!editForm || !aiPrompt.trim()) return;
      
      setIsGenerating(true);
      try {
          const generated = await generateRuleStructure(aiPrompt);
          
          // Merge generated content into current edit form
          const newSkills: ExtractionSkill[] = generated.skills.map((s: any) => ({
              id: uuidv4(),
              name: s.name,
              category: s.category,
              description: s.description,
              outputExample: s.outputExample
          }));

          setEditForm({
              ...editForm,
              systemInstruction: generated.systemInstruction,
              schema: generated.schema,
              skills: newSkills,
              creationMethod: 'AI_Generated'
          });
          setIsDirty(true);
          setShowAiModal(false);
          setAiPrompt('');
      } catch (e) {
          alert('规则生成失败，请重试');
      } finally {
          setIsGenerating(false);
      }
  };

  const handleDelete = (id: string) => {
    if (confirm('确认删除此规则吗？')) {
      const updatedRules = rules.filter(r => r.id !== id);
      onUpdateRules(updatedRules);
      if (selectedRuleId === id) {
        setSelectedRuleId(updatedRules[0]?.id || null);
      }
    }
  };

  const handleSave = () => {
    if (!editForm) return;
    const updatedRules = rules.map(r => r.id === editForm.id ? editForm : r);
    onUpdateRules(updatedRules);
    setIsDirty(false);
  };

  const handleChange = (field: keyof ExtractionRule, value: any) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
    setIsDirty(true);
  };

  // Skill Management
  const addSkill = () => {
    if (!editForm) return;
    const newSkill: ExtractionSkill = {
        id: uuidv4(),
        name: '新字段',
        category: 'Text',
        description: '在此描述如何提取该字段...',
        example: '',
        outputExample: ''
    };
    setEditForm({...editForm, skills: [...editForm.skills, newSkill]});
    setIsDirty(true);
  };

  const updateSkill = (index: number, field: keyof ExtractionSkill, value: string) => {
    if (!editForm) return;
    const newSkills = [...editForm.skills];
    // @ts-ignore
    newSkills[index] = { ...newSkills[index], [field]: value };
    setEditForm({ ...editForm, skills: newSkills });
    setIsDirty(true);
  };

  const removeSkill = (index: number) => {
    if (!editForm) return;
    const newSkills = [...editForm.skills];
    newSkills.splice(index, 1);
    setEditForm({ ...editForm, skills: newSkills });
    setIsDirty(true);
  };

  const optimizeSkill = async (index: number) => {
    if (!editForm) return;
    const skill = editForm.skills[index];
    setLoadingSkillId(skill.id);
    
    const improvedDesc = await optimizeSkillDescription(skill.description, skill.example);
    
    updateSkill(index, 'description', improvedDesc);
    setLoadingSkillId(null);
  };

  const categories: SkillCategory[] = ['Date', 'Amount', 'Entity', 'Text', 'Boolean', 'Other'];

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shadow-sm flex-shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">提取规则配置库</h1>
        </div>
      </header>

      {/* AI Generate Modal */}
      {showAiModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-gradient-to-r from-purple-600 to-brand-600 p-6 text-white">
                      <div className="flex justify-between items-start">
                          <h3 className="text-lg font-bold flex items-center">
                              <Sparkles className="w-5 h-5 mr-2" />
                              AI 智能生成规则
                          </h3>
                          <button onClick={() => setShowAiModal(false)} className="text-white/80 hover:text-white">
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                      <p className="text-xs text-white/80 mt-2">
                          粘贴非结构化文档的表头、字段列表，或者直接描述你想提取的内容。AI 将自动生成正则式表达规则（Schema + Skills）。
                      </p>
                  </div>
                  <div className="p-6">
                      <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="例如：请帮我提取借款人姓名、身份证号、贷款金额、起止日期、担保人列表..."
                          className="w-full h-32 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none text-sm mb-4"
                      />
                      <div className="flex justify-end space-x-3">
                          <button 
                              onClick={() => setShowAiModal(false)}
                              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded"
                          >
                              取消
                          </button>
                          <button 
                              onClick={handleAiGenerate}
                              disabled={!aiPrompt.trim() || isGenerating}
                              className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 flex items-center"
                          >
                              {isGenerating ? <Wand2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                              {isGenerating ? '生成中...' : '开始生成'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar List */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-0">
          <div className="p-4 border-b border-slate-100">
            <button 
              onClick={handleCreate}
              className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新建规则</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rules.map(rule => (
              <div 
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group relative ${selectedRuleId === rule.id ? 'bg-brand-50 border-l-4 border-l-brand-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                    <div className="font-medium text-slate-700 text-sm truncate pr-2">{rule.name}</div>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${rule.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    rule.docType === DocType.UNKNOWN ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-blue-50 border-blue-100 text-blue-600'
                  }`}>
                    {DocTypeCN[rule.docType] || rule.docType}
                  </span>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <span className="flex items-center"><User className="w-3 h-3 mr-0.5" /> {rule.creatorName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {editForm ? (
            <>
              {/* Toolbar */}
              <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
                <div className="flex items-center space-x-6 text-sm">
                   <div className="flex items-center space-x-2 text-slate-500" title="创建人">
                        <User className="w-4 h-4" />
                        <span>{editForm.creatorName}</span>
                   </div>
                   <div className="flex items-center space-x-2 text-slate-500" title="创建方式">
                        {editForm.creationMethod === 'AI_Generated' ? <Bot className="w-4 h-4 text-purple-500" /> : <Code className="w-4 h-4" />}
                        <span>{editForm.creationMethod === 'AI_Generated' ? 'AI生成' : '人工创建'}</span>
                   </div>
                   <div className="flex items-center space-x-2 text-slate-500" title="上次运行">
                        <Activity className="w-4 h-4" />
                        <span>上次运行: {editForm.lastRunDate || 'Never'}</span>
                   </div>
                   
                   {/* Active Toggle */}
                   <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={editForm.isActive} onChange={(e) => handleChange('isActive', e.target.checked)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${editForm.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editForm.isActive ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <span className="ml-2 text-slate-600 font-medium text-xs">{editForm.isActive ? '规则已启用' : '规则已停用'}</span>
                   </label>
                </div>

                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => handleDelete(editForm.id)}
                    className="flex items-center space-x-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除</span>
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!isDirty}
                    className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isDirty 
                        ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isDirty ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    <span>{isDirty ? '保存修改' : '已保存'}</span>
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                  
                  {/* Basic Info Card */}
                  <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">基本信息</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">规则名称</label>
                        <input 
                            type="text" 
                            value={editForm.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full p-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        />
                        </div>
                        <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">适用文档类型</label>
                        <select 
                            value={editForm.docType}
                            onChange={(e) => handleChange('docType', e.target.value)}
                            className="w-full p-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        >
                            {Object.values(DocType).map(type => (
                            <option key={type} value={type}>{DocTypeCN[type] || type}</option>
                            ))}
                        </select>
                        </div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="flex items-center text-sm font-bold text-slate-800">
                                <Sparkles className="w-4 h-4 mr-2 text-brand-500" />
                                提取技能 (Extraction Skills)
                            </label>
                            <p className="text-xs text-slate-500 mt-1">定义具体的字段提取逻辑。支持正则式表达风格的描述。</p>
                        </div>
                        <div className="flex space-x-3">
                            <button 
                                onClick={() => setShowAiModal(true)}
                                className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded font-medium flex items-center transition-colors"
                            >
                                <Bot className="w-3 h-3 mr-1" /> AI 智能生成
                            </button>
                            <button onClick={addSkill} className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1.5 rounded font-medium flex items-center transition-colors">
                                <Plus className="w-3 h-3 mr-1" /> 添加技能
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        {editForm.skills.map((skill, idx) => (
                            <div key={skill.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm group hover:border-brand-300 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center space-x-3 w-2/3">
                                        <div className="relative">
                                            <Tag className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                                            <select 
                                                value={skill.category}
                                                onChange={(e) => updateSkill(idx, 'category', e.target.value)}
                                                className="pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-medium text-slate-600"
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{SkillCategoryCN[cat]}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <input 
                                            className="text-sm font-bold text-slate-800 border-none focus:ring-0 p-0 placeholder-slate-400 flex-1 bg-transparent"
                                            value={skill.name}
                                            onChange={(e) => updateSkill(idx, 'name', e.target.value)}
                                            placeholder="技能名称 (例如: 发票金额)"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button 
                                            onClick={() => optimizeSkill(idx)}
                                            className="text-purple-600 hover:bg-purple-50 px-2 py-1 rounded flex items-center text-xs font-medium transition-colors"
                                            disabled={loadingSkillId === skill.id}
                                        >
                                            {loadingSkillId === skill.id ? <Wand2 className="w-3 h-3 animate-spin mr-1"/> : <Sparkles className="w-3 h-3 mr-1" />}
                                            AI 优化
                                        </button>
                                        <button onClick={() => removeSkill(idx)} className="text-slate-400 hover:text-red-500 p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <textarea 
                                        className="w-full text-sm text-slate-600 border border-slate-200 rounded p-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none h-16 bg-slate-50/50"
                                        value={skill.description}
                                        onChange={(e) => updateSkill(idx, 'description', e.target.value)}
                                        placeholder="请详细描述如何提取该信息..."
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 absolute -top-2 left-2 bg-white px-1">输入样例</label>
                                        <input 
                                            value={skill.example || ''}
                                            onChange={(e) => updateSkill(idx, 'example', e.target.value)}
                                            placeholder="原文片段..."
                                            className="w-full text-xs p-2 border border-slate-200 rounded focus:border-brand-500 outline-none"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 absolute -top-2 left-2 bg-white px-1 flex items-center">
                                            输出结果 <ArrowRight className="w-2 h-2 mx-1"/>
                                        </label>
                                        <input 
                                            value={skill.outputExample || ''}
                                            onChange={(e) => updateSkill(idx, 'outputExample', e.target.value)}
                                            placeholder="期望格式..."
                                            className="w-full text-xs p-2 border border-slate-200 rounded focus:border-brand-500 outline-none font-mono text-brand-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {editForm.skills.length === 0 && (
                            <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm flex flex-col items-center">
                                <Code className="w-8 h-8 mb-2 opacity-20" />
                                <p>暂无技能。请点击上方 “AI 智能生成” 或 “添加技能”。</p>
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Schema */}
                  <div className="space-y-2 mt-8 border-t border-slate-200 pt-6">
                    <label className="flex items-center text-sm font-bold text-slate-800">
                      <Code className="w-4 h-4 mr-2" />
                      输出格式 (JSON Schema)
                    </label>
                    <textarea 
                      value={editForm.schema}
                      onChange={(e) => handleChange('schema', e.target.value)}
                      className="w-full h-48 p-4 text-xs font-mono text-slate-600 bg-slate-900 text-green-400 border border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
                      placeholder="{ ... }"
                    />
                  </div>

                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-medium">请选择左侧规则进行查看或编辑</p>
              <p className="text-sm mt-2 opacity-70">点击 “新建规则” 开始创建</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RuleLibrary;