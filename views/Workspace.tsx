import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, BookOpen } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DocumentFile, ExtractionRule, ExtractionField, ProcessingStatus, DocType, ExtractionSkill, StatusCN, DocTypeCN, BadCase, BadCaseType } from '../types';
import DocumentViewer from '../components/DocumentViewer';
import DataExtractor from '../components/DataExtractor';
import RuleEngine from '../components/RuleEngine';
import { extractDataWithRule, optimizeRuleFromFeedback, analyzeSpecificRegion, refineExtractionWithFeedback } from '../services/geminiService';

interface WorkspaceProps {
  document: DocumentFile;
  allRules: ExtractionRule[];
  activeModelId: string; // Passed from Dashboard
  onBack: () => void;
  onUpdateDocument: (doc: DocumentFile) => void;
  onUpdateRules: (rules: ExtractionRule[]) => void;
  onManageRules: () => void; // Navigate to Rule Library
}

const Workspace: React.FC<WorkspaceProps> = ({ 
  document, 
  allRules,
  activeModelId,
  onBack, 
  onUpdateDocument,
  onUpdateRules,
  onManageRules
}) => {
  // Originally filtered by type, now we allow selecting any rule to override "Unknown"
  // Default logic: match type, or if unknown/none, just pick null until user selects
  const initialRule = allRules.find(r => r.id === document.appliedRuleId) 
                     || allRules.find(r => r.docType === document.type) 
                     || null;

  const [activeRule, setActiveRule] = useState<ExtractionRule | null>(initialRule);
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // New State for Bad Cases
  const [badCases, setBadCases] = useState<BadCase[]>([]);

  // Sync if document type changes externally or initial load
  useEffect(() => {
    if (!activeRule && initialRule) {
      setActiveRule(initialRule);
    }
  }, [initialRule]);

  // Toast Timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Calculate all extracted values for general highlighting
  const allExtractedValues = document.extractedData 
    ? Array.from(new Set(Object.values(document.extractedData)
        .map((f: ExtractionField) => f.value ? String(f.value) : '')
        .filter(v => v.length > 0)))
    : [];

  const handleRuleChange = (ruleId: string) => {
    const selectedRule = allRules.find(r => r.id === ruleId);
    if (selectedRule) {
        setActiveRule(selectedRule);
        // Optionally update document type to match the rule if we want to "correct" the classification
        onUpdateDocument({
            ...document,
            appliedRuleId: ruleId,
            type: selectedRule.docType // Auto-correct doc type based on manual rule selection
        });
    }
  };

  const handleRunExtraction = async () => {
    if (!activeRule) return;
    onUpdateDocument({ ...document, status: ProcessingStatus.EXTRACTING });
    setBadCases([]); // Reset bad cases on new run
    
    try {
      const extractedData = await extractDataWithRule(document.content.join('\n'), activeRule, activeModelId);
      
      onUpdateDocument({
        ...document,
        status: ProcessingStatus.REVIEW,
        extractedData: extractedData,
        appliedRuleId: activeRule.id
      });
      setHasUnsavedEdits(false);
    } catch (e) {
      console.error(e);
      onUpdateDocument({ ...document, status: ProcessingStatus.READY_TO_EXTRACT });
      alert("提取失败，请检查 API Key 或重试。");
    }
  };

  const handleFieldChange = (key: string, newValue: string) => {
    if (!document.extractedData) return;
    
    const updatedData = { ...document.extractedData };
    updatedData[key] = {
      ...updatedData[key],
      value: newValue,
      isEdited: true,
      confidence: 1.0 // Human override is 100% confidence
    };

    onUpdateDocument({
      ...document,
      extractedData: updatedData
    });
    setHasUnsavedEdits(true);
  };

  const handleUpdateActiveRule = (updatedRule: ExtractionRule) => {
    setActiveRule(updatedRule);
  };

  // Import Fields: Adds them to extracted data with null values
  const handleImportFields = (fields: string[]) => {
    if (!document.extractedData) return;
    
    const updatedData = { ...document.extractedData };
    let addedCount = 0;

    fields.forEach(fieldLabel => {
        // Use label as key for simplicity in this flow, or simple sanitization
        const key = fieldLabel; 
        if (!updatedData[key]) {
            updatedData[key] = {
                key: key,
                label: fieldLabel,
                value: null,
                confidence: 0,
                sourcePage: 1
            };
            addedCount++;
        }
    });

    onUpdateDocument({
        ...document,
        extractedData: updatedData
    });
    setToastMessage(`已导入 ${addedCount} 个新字段待提取`);
  };

  // Targeted AI Analysis based on selection
  const handleAiLocalAnalysis = async (text: string) => {
    if (!document.extractedData) return;

    // Find fields that are empty/null
    const missingFields = (Object.values(document.extractedData) as ExtractionField[])
        .filter(f => f.value === null || f.value === '')
        .map(f => f.key);

    if (missingFields.length === 0) {
        setToastMessage("所有字段均已填充，无需补全。");
        return;
    }

    setToastMessage("AI 正在分析选区以补全遗漏字段...");

    const result = await analyzeSpecificRegion(text, missingFields, document.type);
    
    if (result.found && result.data) {
        const updatedData = { ...document.extractedData };
        let filledCount = 0;

        Object.keys(result.data).forEach(key => {
            // Fuzzy match the key returned by AI to our fields
            const targetFieldKey = Object.keys(updatedData).find(k => k.includes(key) || key.includes(k));
            
            if (targetFieldKey && result.data[key]) {
                 updatedData[targetFieldKey] = {
                     ...updatedData[targetFieldKey],
                     value: result.data[key],
                     confidence: 0.95, // High confidence for targeted user selection
                     isEdited: true // Treat as semi-manual edit
                 };
                 filledCount++;
            }
        });

        if (filledCount > 0) {
            onUpdateDocument({
                ...document,
                extractedData: updatedData
            });
            setHasUnsavedEdits(true);
            setToastMessage(`成功补全 ${filledCount} 个字段！`);
        } else {
            setToastMessage("AI 未在选区中找到匹配的遗漏信息。");
        }
    } else {
        setToastMessage("分析完成，未检测到有效信息。");
    }
  };

  // Add Skill from selection
  const handleAddSkillFromSelection = (text: string, description: string, fieldName: string) => {
    if (!activeRule) {
        alert("请先选择一个提取规则。");
        return;
    }

    const newSkill: ExtractionSkill = {
        id: uuidv4(),
        name: fieldName || '新字段',
        category: 'Text', // Default to Text
        description: description,
        example: text,
        outputExample: '' // Default empty
    };

    const updatedRule = {
        ...activeRule,
        skills: [...(activeRule.skills || []), newSkill]
    };

    setActiveRule(updatedRule);
    
    // Persist to global rules
    const newRulesList = allRules.map(r => r.id === updatedRule.id ? updatedRule : r);
    onUpdateRules(newRulesList);
    
    setToastMessage(`已将 "${fieldName}" 提取技能保存至规则库`);
  };

  const handleOptimizeRule = async () => {
    if (!document.extractedData || !activeRule) return;

    const correctedData: Record<string, any> = {};
    const editedFields: string[] = [];
    
    Object.values(document.extractedData).forEach((f: ExtractionField) => {
      correctedData[f.key] = f.value;
      if (f.isEdited) editedFields.push(f.key);
    });

    if (editedFields.length === 0) {
      alert("未检测到人工修改，无法推演。");
      return;
    }

    const newInstruction = await optimizeRuleFromFeedback(
        activeRule,
        document.content[0],
        { note: "Previous extraction was inaccurate for fields: " + editedFields.join(', ') },
        correctedData
    );

    const updatedRule = {
        ...activeRule,
        systemInstruction: newInstruction,
        version: activeRule.version + 1,
        name: `${activeRule.name} (AI优化版)`
    };

    setActiveRule(updatedRule);
    
    // Update the rule in the global store
    const newRulesList = allRules.map(r => r.id === updatedRule.id ? updatedRule : r);
    onUpdateRules(newRulesList);
    
    setHasUnsavedEdits(false);
    setToastMessage("规则推演完成并已入库！");
  };

  // --- NEW: Bad Case & Secondary Extraction Handlers ---

  const handleMarkBadCase = (text: string, type: BadCaseType) => {
    const newBadCase: BadCase = {
        id: uuidv4(),
        text,
        type
    };
    setBadCases(prev => [...prev, newBadCase]);
    setToastMessage(`已标记为 ${type === 'missed' ? '漏提' : '错提'}，可点击下方按钮进行二次提取。`);
  };

  const handleRunRefinement = async () => {
     if (!document.extractedData || badCases.length === 0) return;
     
     setToastMessage("AI 正在基于您的反馈进行二次提取...");
     
     try {
         const refinedData = await refineExtractionWithFeedback(
             document.content.join('\n'),
             document.extractedData,
             badCases,
             document.type
         );

         onUpdateDocument({
             ...document,
             extractedData: refinedData
         });
         
         setBadCases([]); // Clear cases after processing
         setToastMessage("二次提取完成，结果已更新。");

     } catch (e) {
         setToastMessage("二次提取失败，请重试。");
     }
  };

  return (
    <div className="flex flex-col h-screen bg-white relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 flex items-center">
            <BookOpen className="w-4 h-4 mr-2 text-brand-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">提取工作台</h1>
          <div className="h-4 w-[1px] bg-slate-300 mx-2"></div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium border
            ${document.type === DocType.UNKNOWN ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
          `}>
            {DocTypeCN[document.type] || document.type}
          </span>
          
          {/* Rule Selector - Manual Override */}
          <div className="relative group ml-4 flex items-center space-x-2">
            <div className="relative">
                <select 
                    value={activeRule?.id || ''} 
                    onChange={(e) => handleRuleChange(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded pl-3 pr-8 py-1.5 font-medium focus:ring-brand-500 focus:border-brand-500 cursor-pointer"
                >
                    <option value="" disabled>选择提取规则...</option>
                    {allRules.map(rule => (
                        <option key={rule.id} value={rule.id}>
                           {rule.name}
                        </option>
                    ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            
            <button 
                onClick={onManageRules}
                className="flex items-center space-x-1 text-xs text-brand-600 hover:bg-brand-50 px-2 py-1.5 rounded transition-colors"
                title="查看完整规则库"
            >
                <BookOpen className="w-3 h-3" />
                <span>规则库</span>
            </button>
          </div>

        </div>
        <div>
            <span className="text-xs font-mono text-slate-400 uppercase">{StatusCN[document.status] || document.status}</span>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Document */}
        <div className="flex-1 min-w-[300px] relative z-0">
          <DocumentViewer 
            document={document} 
            extractedValues={allExtractedValues}
            activeValue={focusedValue}
            badCases={badCases}
            onAddSkill={handleAddSkillFromSelection}
            onAiAnalysis={handleAiLocalAnalysis}
            onMarkBadCase={handleMarkBadCase}
          />
        </div>

        {/* Middle: Data */}
        <div className="w-[400px] border-l border-slate-200 z-10 shadow-lg">
          <DataExtractor 
            status={document.status}
            data={document.extractedData}
            badCases={badCases}
            onFieldChange={handleFieldChange}
            onFieldFocus={(val) => setFocusedValue(val)}
            onImportFields={handleImportFields}
            onRunRefinement={handleRunRefinement}
          />
        </div>

        {/* Right: Rules */}
        <div className="w-[350px] relative z-20">
          <RuleEngine 
            rule={activeRule}
            status={document.status}
            onRunExtraction={handleRunExtraction}
            onUpdateRule={handleUpdateActiveRule}
            onOptimizeRule={handleOptimizeRule}
            hasEdits={hasUnsavedEdits}
          />
        </div>

      </div>
    </div>
  );
};

export default Workspace;