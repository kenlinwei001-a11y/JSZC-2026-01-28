import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Code, FileText, Check, Sparkles, Wand2, Tag, ArrowRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DocType, ExtractionRule, ExtractionSkill, DocTypeCN, SkillCategory, SkillCategoryCN } from '../types';
import { optimizeSkillDescription } from '../services/geminiService';

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
      systemInstruction: '基于以下定义的技能提取字段。',
      skills: [],
      schema: JSON.stringify({ "示例字段": "string" }, null, 2)
    };
    const updatedRules = [...rules, newRule];
    onUpdateRules(updatedRules);
    setSelectedRuleId(newRule.id);
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
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">规则库</h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar List */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
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
                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${selectedRuleId === rule.id ? 'bg-brand-50 border-l-4 border-l-brand-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="font-medium text-slate-700 text-sm mb-1">{rule.name}</div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    rule.docType === DocType.UNKNOWN ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-blue-50 border-blue-100 text-blue-600'
                  }`}>
                    {DocTypeCN[rule.docType] || rule.docType}
                  </span>
                  <span className="text-[10px] text-slate-400">v{rule.version}</span>
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
              <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center space-x-2 text-slate-500 text-sm">
                  <span className="font-mono text-xs text-slate-400">{editForm.id}</span>
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
                <div className="max-w-4xl mx-auto space-y-6">
                  
                  {/* Basic Info */}
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
                      <label className="text-sm font-medium text-slate-700">文档类型</label>
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

                  {/* Skills Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center text-sm font-medium text-slate-700">
                            <Sparkles className="w-4 h-4 mr-2 text-brand-500" />
                            提取技能 (Skills)
                        </label>
                        <button onClick={addSkill} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center">
                            <Plus className="w-3 h-3 mr-1" /> 添加技能
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">定义模块化的提取规则 (Skills)。每个技能针对特定的信息点，并提供样例以提高准确性。</p>
                    
                    <div className="space-y-3">
                        {editForm.skills.map((skill, idx) => (
                            <div key={skill.id} className="bg-white border border-slate-200 rounded-md p-4 shadow-sm group">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center space-x-3 w-2/3">
                                        <div className="relative">
                                            <Tag className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                                            <select 
                                                value={skill.category}
                                                onChange={(e) => updateSkill(idx, 'category', e.target.value)}
                                                className="pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{SkillCategoryCN[cat]}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <input 
                                            className="text-sm font-semibold text-slate-800 border-none focus:ring-0 p-0 placeholder-slate-400 flex-1"
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
                                        <button onClick={() => removeSkill(idx)} className="text-slate-400 hover:text-red-500">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <textarea 
                                        className="w-full text-sm text-slate-600 border border-slate-200 rounded p-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none h-16"
                                        value={skill.description}
                                        onChange={(e) => updateSkill(idx, 'description', e.target.value)}
                                        placeholder="请详细描述如何提取该信息..."
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100">
                                    <div>
                                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">原文输入样例</label>
                                        <input 
                                            value={skill.example || ''}
                                            onChange={(e) => updateSkill(idx, 'example', e.target.value)}
                                            placeholder="例如：伍仟万元整"
                                            className="w-full text-xs p-1.5 border border-slate-200 rounded focus:border-brand-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center">
                                            标准输出样例 <ArrowRight className="w-3 h-3 mx-1 text-slate-300"/>
                                        </label>
                                        <input 
                                            value={skill.outputExample || ''}
                                            onChange={(e) => updateSkill(idx, 'outputExample', e.target.value)}
                                            placeholder="例如：50000000"
                                            className="w-full text-xs p-1.5 border border-slate-200 rounded focus:border-brand-500 outline-none font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {editForm.skills.length === 0 && (
                            <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                                暂无技能。请点击“添加技能”开始定义。
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Schema */}
                  <div className="space-y-2 mt-8 border-t border-slate-200 pt-6">
                    <label className="flex items-center text-sm font-medium text-slate-700">
                      <Code className="w-4 h-4 mr-2" />
                      输出格式 (JSON Schema)
                    </label>
                    <textarea 
                      value={editForm.schema}
                      onChange={(e) => handleChange('schema', e.target.value)}
                      className="w-full h-32 p-3 text-sm font-mono text-slate-600 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
                      placeholder="{ ... }"
                    />
                  </div>

                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p>请选择左侧规则进行编辑</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RuleLibrary;