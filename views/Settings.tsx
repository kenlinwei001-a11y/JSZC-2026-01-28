import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Server, Cpu } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AIModel, MCPTool } from '../types';

interface SettingsProps {
  models: AIModel[];
  tools: MCPTool[];
  onUpdateModels: (models: AIModel[]) => void;
  onUpdateTools: (tools: MCPTool[]) => void;
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ models, tools, onUpdateModels, onUpdateTools, onBack }) => {
  const [activeTab, setActiveTab] = useState<'models' | 'tools'>('models');
  
  // Model State
  const [newModelName, setNewModelName] = useState('');
  const [newModelId, setNewModelId] = useState('');

  // Tool State
  const [newToolName, setNewToolName] = useState('');
  const [newToolDesc, setNewToolDesc] = useState('');
  const [newToolEndpoint, setNewToolEndpoint] = useState('');

  const addModel = () => {
    if (!newModelName || !newModelId) return;
    onUpdateModels([...models, { id: uuidv4(), name: newModelName, apiModelName: newModelId }]);
    setNewModelName('');
    setNewModelId('');
  };

  const deleteModel = (id: string) => {
    onUpdateModels(models.filter(m => m.id !== id));
  };

  const addTool = () => {
    if (!newToolName || !newToolDesc) return;
    onUpdateTools([...tools, { id: uuidv4(), name: newToolName, description: newToolDesc, endpoint: newToolEndpoint }]);
    setNewToolName('');
    setNewToolDesc('');
    setNewToolEndpoint('');
  };

  const deleteTool = (id: string) => {
    onUpdateTools(tools.filter(t => t.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">系统配置</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="flex space-x-1 border-b border-slate-200 mb-6">
             <button 
                onClick={() => setActiveTab('models')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'models' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
             >
                <Cpu className="w-4 h-4" />
                <span>大模型管理</span>
             </button>
             <button 
                onClick={() => setActiveTab('tools')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'tools' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
             >
                <Server className="w-4 h-4" />
                <span>MCP 工具管理</span>
             </button>
          </div>

          {activeTab === 'models' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">注册新模型</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <input 
                            placeholder="显示名称 (例如: DeepSeek-V3)" 
                            className="p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-500"
                            value={newModelName}
                            onChange={e => setNewModelName(e.target.value)}
                        />
                        <input 
                            placeholder="API 模型 ID (例如: deepseek-v3)" 
                            className="p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-500"
                            value={newModelId}
                            onChange={e => setNewModelId(e.target.value)}
                        />
                        <button 
                            onClick={addModel}
                            disabled={!newModelName || !newModelId}
                            className="bg-brand-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                        >
                            添加模型
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">显示名称</th>
                                <th className="px-6 py-3">API 模型 ID</th>
                                <th className="px-6 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {models.map(model => (
                                <tr key={model.id}>
                                    <td className="px-6 py-4 font-medium text-slate-700">{model.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{model.apiModelName}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => deleteModel(model.id)} className="text-slate-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">添加 MCP 工具</h2>
                    <div className="grid grid-cols-1 gap-4 mb-4">
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                placeholder="工具名称 (例如: 天眼查企业查询)" 
                                className="p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-500"
                                value={newToolName}
                                onChange={e => setNewToolName(e.target.value)}
                            />
                            <input 
                                placeholder="服务端点 URL (可选)" 
                                className="p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-500"
                                value={newToolEndpoint}
                                onChange={e => setNewToolEndpoint(e.target.value)}
                            />
                        </div>
                        <textarea 
                            placeholder="功能描述..." 
                            className="p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-500 h-20 resize-none"
                            value={newToolDesc}
                            onChange={e => setNewToolDesc(e.target.value)}
                        />
                        <button 
                            onClick={addTool}
                            disabled={!newToolName || !newToolDesc}
                            className="bg-brand-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-50 justify-self-end w-32"
                        >
                            添加工具
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">工具名称</th>
                                <th className="px-6 py-3">描述</th>
                                <th className="px-6 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tools.map(tool => (
                                <tr key={tool.id}>
                                    <td className="px-6 py-4 font-medium text-slate-700">{tool.name}</td>
                                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{tool.description}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => deleteTool(tool.id)} className="text-slate-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {tools.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">暂无配置工具</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;