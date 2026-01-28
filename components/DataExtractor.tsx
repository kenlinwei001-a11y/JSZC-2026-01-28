import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Wand2, Download, Table, Import, Plus, X, Eye, Play, AlertTriangle } from 'lucide-react';
import { ExtractionField, ProcessingStatus, BadCase } from '../types';

interface DataExtractorProps {
  status: ProcessingStatus;
  data: Record<string, ExtractionField> | undefined;
  badCases?: BadCase[];
  onFieldChange: (key: string, newValue: string) => void;
  onFieldFocus: (value: string) => void;
  onImportFields: (fields: string[]) => void;
  onRunRefinement?: () => void;
}

const DataExtractor: React.FC<DataExtractorProps> = ({ 
  status, 
  data, 
  badCases = [],
  onFieldChange,
  onFieldFocus,
  onImportFields,
  onRunRefinement
}) => {
  const [showImport, setShowImport] = useState(false);
  const [showTablePreview, setShowTablePreview] = useState(false);
  const [importText, setImportText] = useState('');
  
  const handleDownload = (format: 'csv' | 'excel') => {
    if (!data) return;

    // Convert data to CSV string with Chinese Headers
    const headers = ['字段名称', '显示标签', '提取值', '置信度', '状态'];
    const rows = Object.values(data).map((field: ExtractionField) => [
      field.key,
      field.label,
      `"${(field.value || '').toString().replace(/"/g, '""')}"`, // Escape quotes
      field.confidence.toFixed(2),
      field.isEdited ? '人工修改' : '自动提取'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;';
    const extension = format === 'csv' ? '.csv' : '.xls';
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: mimeType }); // Add BOM for UTF-8
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `提取结果_${new Date().toISOString().slice(0,10)}${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSubmit = () => {
    if (!importText.trim()) return;
    const fields = importText.split(/[,;\n]+/).map(s => s.trim()).filter(s => s.length > 0);
    if (fields.length > 0) {
        onImportFields(fields);
        setImportText('');
        setShowImport(false);
    }
  };

  if (status === ProcessingStatus.EXTRACTING || status === ProcessingStatus.CLASSIFYING) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-brand-500" />
        <p className="text-sm font-medium text-slate-600">AI 正在处理...</p>
        <p className="text-xs">{status === ProcessingStatus.CLASSIFYING ? "正在分类文档类型" : "正在提取结构化数据"}</p>
      </div>
    );
  }

  if (!data && status === ProcessingStatus.READY_TO_EXTRACT) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 px-6 text-center">
        <Wand2 className="w-10 h-10 mb-3 text-brand-300" />
        <p className="text-sm font-medium text-slate-600">准备就绪</p>
        <p className="text-xs mt-1">请从右侧面板选择或确认提取规则，开始结构化处理。</p>
      </div>
     );
  }

  if (!data) {
    return <div className="p-8 text-center text-slate-400">暂无数据</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 relative">
      <div className="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50">
        <span className="font-semibold text-slate-700 text-sm">提取结果</span>
        <div className="flex items-center space-x-2">
           <button 
             onClick={() => setShowImport(true)}
             title="导入字段"
             className="flex items-center space-x-1 px-2 py-1 text-xs text-brand-600 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100 transition-colors"
           >
             <Import className="w-3 h-3" />
             <span>导入</span>
           </button>

           <button 
             onClick={() => setShowTablePreview(true)}
             title="在线预览表格"
             className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors"
           >
             <Eye className="w-3 h-3" />
             <span>预览</span>
           </button>

           <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>

           <button 
             onClick={() => handleDownload('csv')}
             title="导出 CSV"
             className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
           >
             <Table className="w-4 h-4" />
           </button>
           <button 
             onClick={() => handleDownload('excel')}
             title="导出 Excel"
             className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
           >
             <Download className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Import Modal Overlay */}
      {showImport && (
        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm p-4 flex flex-col animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> 批量添加提取字段 (定义表格列)
                </h3>
                <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="请输入需要提取的字段名称，用逗号或换行分隔。&#10;例如：&#10;违约金条款&#10;管辖法院&#10;签订日期"
                className="flex-1 w-full border border-slate-300 rounded p-2 text-sm focus:border-brand-500 outline-none resize-none mb-3"
            />
            <div className="flex justify-end space-x-2">
                <button 
                    onClick={() => setShowImport(false)} 
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                    取消
                </button>
                <button 
                    onClick={handleImportSubmit}
                    disabled={!importText.trim()}
                    className="px-3 py-1.5 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded disabled:opacity-50"
                >
                    确认添加
                </button>
            </div>
        </div>
      )}

      {/* Table Preview Modal */}
      {showTablePreview && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-3/4 flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6">
                      <h3 className="font-bold text-slate-800">提取结果预览 (Table View)</h3>
                      <button onClick={() => setShowTablePreview(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-slate-50">
                      <div className="bg-white border border-slate-300 rounded overflow-hidden">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                                  <tr>
                                      <th className="px-4 py-3 w-16 text-center">#</th>
                                      {Object.values(data).map((field: ExtractionField) => (
                                          <th key={field.key} className="px-4 py-3 min-w-[150px] border-r border-slate-200 last:border-0">
                                              {field.label}
                                          </th>
                                      ))}
                                  </tr>
                              </thead>
                              <tbody>
                                  {/* Showing single row for current doc, but implying table structure */}
                                  <tr className="hover:bg-slate-50">
                                      <td className="px-4 py-3 text-center text-slate-400 border-r border-slate-200">1</td>
                                      {Object.values(data).map((field: ExtractionField) => (
                                          <td key={field.key} className="px-4 py-3 border-r border-slate-200 last:border-0 align-top">
                                              {field.value?.toString() || <span className="text-slate-300 italic">null</span>}
                                          </td>
                                      ))}
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                      <p className="mt-4 text-xs text-slate-500 text-center">
                          预览展示了当前文档按照导入字段/提取规则生成的表格行数据。导出 Excel 时将保持此结构。
                      </p>
                  </div>
                  <div className="h-14 border-t border-slate-200 flex items-center justify-end px-6 bg-slate-50">
                      <button onClick={() => setShowTablePreview(false)} className="px-4 py-2 bg-slate-800 text-white rounded text-sm hover:bg-slate-900">
                          关闭预览
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-5 pb-6">
          {Object.values(data).map((field: ExtractionField) => (
            <div key={field.key} className="group">
              <div className="flex justify-between items-baseline mb-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {field.label}
                </label>
                <div className="flex space-x-1">
                    {/* Empty/Missing Indicator */}
                    {(field.value === null || field.value === '') && (
                         <span className="flex items-center text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded animate-pulse">
                            遗漏
                         </span>
                    )}
                    {field.confidence < 0.85 && !field.isEdited && field.value && (
                    <span className="flex items-center text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        低置信度
                    </span>
                    )}
                    {field.isEdited && (
                    <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded font-medium">
                        已修改
                    </span>
                    )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={field.value?.toString() || ''}
                  onFocus={() => onFieldFocus(field.value?.toString() || '')}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                  placeholder={field.value === null ? "点击原文'AI局部侦测'或手动填入..." : ""}
                  className={`w-full p-2.5 text-sm rounded-md border shadow-sm transition-colors focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none
                    ${field.isEdited ? 'border-brand-300 bg-brand-50/30' : 'border-slate-300 bg-white'}
                    ${field.confidence < 0.85 && !field.isEdited && field.value ? 'border-amber-300 bg-amber-50/30' : ''}
                    ${(field.value === null || field.value === '') ? 'border-red-200 bg-red-50/20 placeholder-slate-400' : ''}
                  `}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer: Refinement Section */}
      <div className="border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase">人工反馈与修正</h4>
              {badCases.length > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                      {badCases.length} 个标记
                  </span>
              )}
          </div>
          
          {badCases.length === 0 ? (
              <p className="text-xs text-slate-400 mb-3">
                  请在左侧原文中选中内容，标记“漏提”或“错提”以触发二次优化。
              </p>
          ) : (
              <div className="mb-3 space-y-1">
                  {badCases.slice(0, 2).map(bc => (
                      <div key={bc.id} className="text-[10px] flex items-center text-slate-600 truncate">
                          <AlertTriangle className="w-3 h-3 text-amber-500 mr-1 flex-shrink-0" />
                          <span className="truncate">"{bc.text}" ({bc.type === 'missed' ? '漏提' : '错提'})</span>
                      </div>
                  ))}
                  {badCases.length > 2 && <div className="text-[10px] text-slate-400 pl-4">... 等 {badCases.length} 项</div>}
              </div>
          )}

          <button 
            onClick={onRunRefinement}
            disabled={badCases.length === 0}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2 rounded-md text-xs font-medium transition-colors"
          >
             <Play className="w-3 h-3" />
             <span>基于反馈二次提取 (Secondary Extraction)</span>
          </button>
      </div>
    </div>
  );
};

export default DataExtractor;