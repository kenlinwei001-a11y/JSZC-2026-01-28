import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Settings, Server, Cpu, Folder, Users, ArrowRight, PieChart, MoreHorizontal, Plus, Briefcase, ChevronRight, Calendar, TrendingUp, Search, Sparkles, Check, ChevronDown } from 'lucide-react';
import { DocumentFile, ProcessingStatus, DocType, AIModel, MCPTool, StatusCN, DocTypeCN, Project, User, ComparableTransaction } from '../types';

interface DashboardProps {
  currentProject: Project | null;
  projects: Project[];
  documents: DocumentFile[];
  users: User[];
  models: AIModel[];
  tools: MCPTool[];
  selectedModelId: string;
  selectedToolIds: string[];
  onModelSelect: (id: string) => void;
  onToolToggle: (id: string) => void;
  onUpload: (files: FileList) => void;
  onSelectDoc: (docId: string) => void;
  onSelectProject: (projectId: string | null) => void;
  onManageRules: () => void;
  onOpenSettings: () => void;
  onUpdateDocument: (doc: DocumentFile) => void;
}

// MOCK DATA FOR ANALYSIS
const MOCK_COMPARABLES: ComparableTransaction[] = [
    { id: 'c1', projectName: '武汉江汉区某商业综合体债权', similarity: 92, transactionDate: '2023-12-10', transactionPrice: '¥11,500万', source: '阿里拍卖', status: '已成交' },
    { id: 'c2', projectName: '湖北天诚置业关联办公楼抵押', similarity: 88, transactionDate: '2024-02-15', transactionPrice: '¥4,200万', source: '京东法拍', status: '已成交' },
    { id: 'c3', projectName: '光谷软件园B区整层办公资产', similarity: 76, transactionDate: '2023-09-20', transactionPrice: '¥850万', source: '公拍网', status: '流拍' },
];

const Dashboard: React.FC<DashboardProps> = ({ 
    currentProject,
    projects,
    documents, 
    users,
    models, 
    tools,
    selectedModelId,
    selectedToolIds,
    onModelSelect,
    onToolToggle,
    onUpload, 
    onSelectDoc, 
    onSelectProject,
    onManageRules,
    onOpenSettings,
    onUpdateDocument
}) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Staging for manual classification changes before confirmation
  const [stagingTypes, setStagingTypes] = useState<Record<string, DocType>>({});

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }, [onUpload]);

  const handleRunAnalysis = () => {
    if (showAnalysis) {
        setShowAnalysis(false);
        return;
    }
    setAnalyzing(true);
    // Simulate API call
    setTimeout(() => {
        setAnalyzing(false);
        setShowAnalysis(true);
    }, 1500);
  };

  const handleStageTypeChange = (docId: string, newType: DocType) => {
    setStagingTypes(prev => ({...prev, [docId]: newType}));
  };

  const handleConfirmType = (e: React.MouseEvent, doc: DocumentFile) => {
      e.stopPropagation();
      const newType = stagingTypes[doc.id];
      if (newType && newType !== doc.type) {
          onUpdateDocument({ ...doc, type: newType });
          // Clear staging
          const nextStaging = { ...stagingTypes };
          delete nextStaging[doc.id];
          setStagingTypes(nextStaging);
      }
  };

  // Helper for progress bar
  const getProgressStyle = (status: ProcessingStatus) => {
    switch (status) {
      case ProcessingStatus.UPLOADED: 
        return { percent: 10, color: 'bg-slate-300', animate: false };
      case ProcessingStatus.CLASSIFYING: 
        return { percent: 30, color: 'bg-blue-400', animate: true };
      case ProcessingStatus.READY_TO_EXTRACT: 
        return { percent: 5, color: 'bg-slate-200', animate: false };
      case ProcessingStatus.EXTRACTING: 
        return { percent: 60, color: 'bg-brand-500', animate: true };
      case ProcessingStatus.REVIEW: 
        return { percent: 90, color: 'bg-amber-500', animate: false };
      case ProcessingStatus.COMPLETED: 
        return { percent: 100, color: 'bg-green-500', animate: false };
      default: 
        return { percent: 0, color: 'bg-slate-200', animate: false };
    }
  };

  // Helper to get user details
  const getUser = (id: string) => users.find(u => u.id === id);

  // Grouping Logic
  const projectDocs = documents.filter(d => d.projectId === currentProject?.id);
  const unclassifiedDocs = projectDocs.filter(d => d.type === DocType.UNKNOWN);
  const classifiedGroups = Object.values(DocType)
    .filter(t => t !== DocType.UNKNOWN)
    .map(type => ({
        type,
        docs: projectDocs.filter(d => d.type === type)
    }))
    .filter(g => g.docs.length > 0);

  // --- VIEW 1: PROJECT LIST (Main Dashboard) ---
  if (!currentProject) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">不良资产项目管理</h1>
            <p className="text-slate-500 text-sm">选择一个项目开始文档处理与分析。</p>
          </div>
          <div className="flex space-x-3">
             <button 
              onClick={onManageRules}
              className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md shadow-sm transition-colors text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              <span>规则库</span>
            </button>
            <button className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" />
              <span>新建项目</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div 
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group flex flex-col h-56"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-brand-50 rounded-lg text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full border font-medium ${
                    project.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {project.status === 'Active' ? '进行中' : '已归档'}
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{project.name}</h3>
                <p className="text-xs text-slate-500 mb-4 flex items-center">
                   <Users className="w-3 h-3 mr-1" /> 债务人: {project.debtorName}
                </p>
                
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div 
                    className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>处置进度</span>
                  <span>{project.progress}%</span>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex justify-between items-center">
                 <div className="flex -space-x-2">
                    {project.memberIds.map(uid => {
                      const user = getUser(uid);
                      if (!user) return null;
                      return (
                        <div key={uid} title={`${user.name} - ${user.role}`} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white border-2 border-white font-medium ${user.color}`}>
                          {user.avatarInitial}
                        </div>
                      );
                    })}
                 </div>
                 <span className="text-xs text-slate-400 font-mono">
                   {project.totalAmount}
                 </span>
              </div>
            </div>
          ))}
          
          {/* New Project Placeholder Card */}
          <button className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-brand-400 hover:bg-brand-50/5 hover:text-brand-600 transition-all h-56">
             <Plus className="w-8 h-8 mb-2" />
             <span className="text-sm font-medium">创建新资产包项目</span>
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW 2: PROJECT DETAIL (File Dashboard) ---

  return (
    <div className="max-w-7xl mx-auto p-6">
      
      {/* Breadcrumb & Project Header */}
      <div className="flex flex-col mb-8">
        <div className="flex items-center space-x-2 text-sm text-slate-500 mb-4">
          <span onClick={() => onSelectProject(null)} className="hover:text-brand-600 cursor-pointer transition-colors">所有项目</span>
          <ChevronRight className="w-4 h-4" />
          <span className="font-semibold text-slate-800">{currentProject.name}</span>
        </div>

        <div className="flex items-center justify-between">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                <Briefcase className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{currentProject.name}</h1>
                <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                   <span className="flex items-center"><Users className="w-3 h-3 mr-1"/> 债务人: {currentProject.debtorName}</span>
                   <span className="flex items-center"><PieChart className="w-3 h-3 mr-1"/> 债权总额: {currentProject.totalAmount}</span>
                   <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> 立项: {new Date(currentProject.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
           </div>

           <div className="flex items-center space-x-4">
              {/* Team Members */}
              <div className="flex -space-x-2 mr-2">
                  {currentProject.memberIds.map(uid => {
                    const user = getUser(uid);
                    if (!user) return null;
                    return (
                      <div key={uid} title={`${user.name} - ${user.role}`} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white border-2 border-white font-medium shadow-sm cursor-help ${user.color}`}>
                        {user.avatarInitial}
                      </div>
                    );
                  })}
                  <button className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-white hover:bg-slate-200">
                    <Plus className="w-4 h-4" />
                  </button>
              </div>
              
              <div className="h-8 w-[1px] bg-slate-200"></div>

              <button 
                onClick={handleRunAnalysis}
                className={`flex items-center space-x-1 text-sm font-medium px-3 py-1.5 rounded transition-all ${
                    showAnalysis || analyzing
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <TrendingUp className="w-4 h-4" />}
                <span>{analyzing ? '分析中...' : '智能行情分析'}</span>
              </button>
              <button 
                onClick={onOpenSettings}
                className="text-slate-600 hover:text-brand-600 text-sm font-medium px-2"
              >
                设置
              </button>
           </div>
        </div>
      </div>
      
      {/* ANALYSIS PANEL (Conditional) */}
      {showAnalysis && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-100 p-6 shadow-sm">
                {/* ... Analysis Content same as before ... */}
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                        历史相似案例匹配 (Comparable Transactions)
                    </h3>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
                        AI 自动检索完成
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="md:col-span-2">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-purple-50/50 border-b border-purple-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">项目名称 (历史招拍挂)</th>
                                    <th className="px-4 py-3 font-semibold">相似度</th>
                                    <th className="px-4 py-3 font-semibold">成交价</th>
                                    <th className="px-4 py-3 font-semibold">成交日期</th>
                                    <th className="px-4 py-3 font-semibold">来源</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-50">
                                {MOCK_COMPARABLES.map(item => (
                                    <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-700">{item.projectName}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center">
                                                <div className="w-16 h-1.5 bg-slate-200 rounded-full mr-2">
                                                    <div className="h-1.5 rounded-full bg-green-500" style={{width: `${item.similarity}%`}}></div>
                                                </div>
                                                <span className="text-xs font-bold text-green-600">{item.similarity}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-600">{item.transactionPrice}</td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{item.transactionDate}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                                item.status === '已成交' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}>
                                                {item.source}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                     <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm flex flex-col justify-center">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">估值参考建议</h4>
                        <div className="text-2xl font-bold text-slate-800 mb-1">¥4,800-5,200万</div>
                        <p className="text-xs text-slate-400 mb-4">基于加权平均算法推算</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            根据相似案例分析，建议重点关注抵押物的变现周期。武汉地区商业地产近期流拍率较高，建议适当下调起拍价以提高成交率。
                        </p>
                        <button className="mt-4 w-full bg-slate-900 text-white text-xs py-2 rounded hover:bg-slate-800 transition-colors">
                            生成详细估值报告
                        </button>
                     </div>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
         {/* Configuration Panel (Compact) */}
         <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span className="flex items-center"><Cpu className="w-4 h-4 mr-2" /> 模型配置</span>
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1.5">提取大模型</label>
                        <select 
                            value={selectedModelId}
                            onChange={(e) => onModelSelect(e.target.value)}
                            className="w-full p-2 text-sm border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50"
                        >
                            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1.5">启用工具 (MCP)</label>
                        <div className="flex flex-wrap gap-2">
                            {tools.map(tool => (
                                <button
                                    key={tool.id}
                                    onClick={() => onToolToggle(tool.id)}
                                    className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
                                        selectedToolIds.includes(tool.id) 
                                        ? 'bg-brand-50 border-brand-200 text-brand-700 font-medium' 
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {tool.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl shadow-lg text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-sm font-semibold mb-1">批量处理状态</h3>
                    <p className="text-xs text-slate-400 mb-4">当前项目文件提取进度</p>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-2xl font-bold">{projectDocs.filter(d => d.status === ProcessingStatus.COMPLETED || d.status === ProcessingStatus.REVIEW).length}</span>
                        <span className="text-sm text-slate-400">/ {projectDocs.length} 文档</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                        <div 
                           className="bg-brand-400 h-1.5 rounded-full transition-all duration-500"
                           style={{ width: `${projectDocs.length ? (projectDocs.filter(d => d.status === ProcessingStatus.COMPLETED || d.status === ProcessingStatus.REVIEW).length / projectDocs.length) * 100 : 0}%`}}
                        ></div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
            </div>
         </div>

         {/* Upload Area */}
         <div 
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="lg:col-span-2 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-12 text-center hover:border-brand-500 hover:bg-brand-50/10 transition-colors cursor-pointer group bg-white"
            onClick={() => document.getElementById('fileInput')?.click()}
        >
            <input 
            id="fileInput" 
            type="file" 
            multiple 
            // @ts-ignore
            webkitdirectory=""
            className="hidden" 
            onChange={(e) => e.target.files && onUpload(e.target.files)}
            />
            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-800">上传项目相关文件 / 文件夹</h3>
            <p className="text-slate-400 text-sm mt-1">支持拖拽或选择文件夹。自动识别合同、判决书、评估报告等不良资产文件。</p>
        </div>
      </div>

      {/* Classification List View */}
      <div className="space-y-6">
        
        {/* SECTION 1: Unclassified Documents */}
        {unclassifiedDocs.length > 0 && (
             <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-red-100 flex justify-between items-center bg-red-50">
                    <div className="flex items-center space-x-2 text-red-700">
                        <AlertCircle className="w-5 h-5" />
                        <h3 className="font-bold text-sm">待分类/未知类型文档 ({unclassifiedDocs.length})</h3>
                    </div>
                    <span className="text-xs text-red-500">请人工调整分类并确认</span>
                </div>
                <div className="p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3">文件名</th>
                                <th className="px-6 py-3">AI 建议类型</th>
                                <th className="px-6 py-3">调整分类</th>
                                <th className="px-6 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {unclassifiedDocs.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">{doc.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                                            未知 / Unknown
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="relative w-64">
                                            <select
                                                value={stagingTypes[doc.id] || ''}
                                                onChange={(e) => handleStageTypeChange(doc.id, e.target.value as DocType)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none appearance-none cursor-pointer hover:border-brand-300"
                                            >
                                                <option value="" disabled>选择文档类型...</option>
                                                {Object.values(DocType)
                                                    .filter(t => t !== DocType.UNKNOWN)
                                                    .map(type => (
                                                        <option key={type} value={type}>{DocTypeCN[type]}</option>
                                                    ))
                                                }
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"/>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={(e) => handleConfirmType(e, doc)}
                                            disabled={!stagingTypes[doc.id]}
                                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                                        >
                                            <Check className="w-3 h-3" />
                                            <span>确认分类</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        )}

        {/* SECTION 2: Classified Groups */}
        {classifiedGroups.length > 0 && (
            <div className="space-y-4">
                <div className="flex items-center space-x-2 text-slate-500 px-1">
                    <Folder className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">已分类文档清单</h3>
                </div>
                
                {classifiedGroups.map(group => (
                    <div key={group.type} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <span className="font-bold text-sm text-slate-700 flex items-center">
                                {DocTypeCN[group.type]}
                                <span className="ml-2 bg-white border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">
                                    {group.docs.length}
                                </span>
                            </span>
                        </div>
                        <table className="w-full text-left text-sm">
                             <thead className="bg-white text-slate-400 font-medium text-[10px] uppercase border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-2 w-[30%]">文件名</th>
                                    <th className="px-6 py-2 w-[30%]">抽取进度 / 状态</th>
                                    <th className="px-6 py-2 w-[20%]">上传人</th>
                                    <th className="px-6 py-2 w-[20%] text-right">分类调整</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {group.docs.map(doc => {
                                    const uploader = getUser(doc.uploaderId);
                                    return (
                                        <tr key={doc.id} onClick={() => onSelectDoc(doc.id)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                            <td className="px-6 py-3">
                                                 <div className="flex items-center space-x-3">
                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-slate-700 group-hover:text-brand-600">{doc.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                {(() => {
                                                    const { percent, color, animate } = getProgressStyle(doc.status);
                                                    return (
                                                        <div className="w-full max-w-[160px]" onClick={(e) => { e.stopPropagation(); onSelectDoc(doc.id); }}>
                                                            <div className="flex justify-between items-center mb-1.5">
                                                                <div className="flex items-center text-[10px]">
                                                                    {doc.status === ProcessingStatus.CLASSIFYING && <Loader2 className="w-3 h-3 mr-1 animate-spin text-blue-500" />}
                                                                    {doc.status === ProcessingStatus.EXTRACTING && <Loader2 className="w-3 h-3 mr-1 animate-spin text-brand-500" />}
                                                                    {doc.status === ProcessingStatus.REVIEW && <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />}
                                                                    {doc.status === ProcessingStatus.COMPLETED && <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />}
                                                                    <span className={`font-medium ${
                                                                        doc.status === ProcessingStatus.REVIEW ? 'text-amber-600' : 
                                                                        doc.status === ProcessingStatus.COMPLETED ? 'text-green-600' : 
                                                                        doc.status === ProcessingStatus.EXTRACTING ? 'text-brand-600' : 'text-slate-500'
                                                                    }`}>
                                                                        {StatusCN[doc.status]}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 font-mono">{percent}%</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative group-hover:ring-1 group-hover:ring-slate-200 transition-all">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${color} ${animate ? 'animate-pulse' : ''}`}
                                                                    style={{ width: `${percent}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    )
                                                })()}
                                            </td>
                                            <td className="px-6 py-3">
                                                {uploader && (
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-medium ${uploader.color}`}>
                                                            {uploader.avatarInitial}
                                                        </div>
                                                        <span className="text-slate-400 text-xs">{uploader.name}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="inline-block relative w-32" onClick={(e) => e.stopPropagation()}>
                                                    <select
                                                        value={doc.type}
                                                        onChange={(e) => {
                                                            const newType = e.target.value as DocType;
                                                            if (newType !== doc.type) {
                                                                onUpdateDocument({ ...doc, type: newType });
                                                            }
                                                        }}
                                                        className="w-full pl-2 pr-6 py-1 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded text-xs text-slate-500 focus:ring-0 outline-none appearance-none cursor-pointer"
                                                    >
                                                        {Object.values(DocType)
                                                            .filter(t => t !== DocType.UNKNOWN)
                                                            .map(type => (
                                                                <option key={type} value={type}>{DocTypeCN[type]}</option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        )}
        
        {projectDocs.length === 0 && (
             <div className="p-16 text-center text-slate-400 flex flex-col items-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                   <Folder className="w-6 h-6 text-slate-300" />
                </div>
               <span>该项目暂无文档，请上传开始工作。</span>
             </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;