import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DocumentFile, ProcessingStatus, DocType, ViewMode, ExtractionRule, AIModel, MCPTool, Project, User } from './types';
import Dashboard from './views/Dashboard';
import Workspace from './views/Workspace';
import RuleLibrary from './views/RuleLibrary';
import Settings from './views/Settings';
import { classifyDocumentContent } from './services/geminiService';

// MOCK USERS
const MOCK_USERS: User[] = [
    { id: 'u1', name: '王经理', role: '资产项目负责人', avatarInitial: '王', color: 'bg-blue-500' },
    { id: 'u2', name: '李法务', role: '法务专员', avatarInitial: '李', color: 'bg-indigo-500' },
    { id: 'u3', name: '张风控', role: '风控经理', avatarInitial: '张', color: 'bg-teal-500' },
];

// MOCK PROJECTS
const MOCK_PROJECTS: Project[] = [
    {
        id: 'p1',
        name: '湖北天诚实业不良贷款处置项目',
        debtorName: '湖北天诚实业有限公司',
        totalAmount: '¥5,320.00 万',
        status: 'Active',
        createdAt: '2023-11-15',
        memberIds: ['u1', 'u2'],
        progress: 65
    },
    {
        id: 'p2',
        name: '武汉江汉路商业广场抵押债权',
        debtorName: '武汉世纪置业',
        totalAmount: '¥12,800.00 万',
        status: 'Active',
        createdAt: '2024-01-10',
        memberIds: ['u1', 'u3'],
        progress: 20
    },
    {
        id: 'p3',
        name: '光谷科技园设备租赁违约案',
        debtorName: '光谷芯动能',
        totalAmount: '¥850.00 万',
        status: 'Archived',
        createdAt: '2023-08-05',
        memberIds: ['u2', 'u3'],
        progress: 100
    }
];

// MOCK CONTENT
const MOCK_CONTENT_LOAN = `流动资金借款合同
合同编号：JK-2023-HB-88901

借款人（甲方）：湖北天诚实业有限公司
贷款人（乙方）：汉江银行股份有限公司武汉分行

第一条 借款金额
甲方向乙方借款人民币（大写）伍仟万元整（¥50,000,000.00）。

第二条 借款期限
本合同项下的借款期限为12个月，自2023年1月10日起至2024年1月9日止。

第三条 借款利率
本合同项下借款年利率为固定利率 6.5%。逾期罚息利率在原借款利率基础上上浮 50%。

第四条 担保方式
本合同项下借款由 湖北天诚置业有限公司 提供连带责任保证担保，并由 张三 提供个人无限连带责任保证。

第五条 违约责任
...`;

const MOCK_CONTENT_RULING = `湖北省武汉市中级人民法院
民事判决书
(2024) 鄂01民初1024号

原告：汉江银行股份有限公司武汉分行，住所地：武汉市江汉区...
负责人：李四，行长。
被告：湖北天诚实业有限公司...
被告：张三...

原告向本院提出诉讼请求：
1. 判令被告湖北天诚实业有限公司偿还借款本金人民币50,000,000元及利息、罚息（暂计至2024年3月1日为3,200,000元）；
2. 判令被告张三承担连带清偿责任。

本院经审理认定事实如下：
...2023年1月10日，原被告签订《流动资金借款合同》...

判决如下：
一、被告湖北天诚实业有限公司于本判决生效之日起十日内向原告偿还借款本金50,000,000元及利息（截至2024年3月1日的利息3,200,000元，之后的利息按合同约定计算至实际清偿之日止）；
二、被告张三对上述债务承担连带清偿责任。

审判长：王五
二〇二四年五月二十日`;

const INITIAL_RULES: ExtractionRule[] = [
  {
    id: 'rule-loan-001',
    docType: DocType.LOAN_AGREEMENT,
    name: '借款合同核心要素提取',
    version: 1,
    skills: [
        { id: 'sk-1', name: '借款本金', category: 'Amount', description: '提取合同约定的借款本金金额，统一转换为纯数字格式。', example: '伍仟万元整', outputExample: '50000000' },
        { id: 'sk-2', name: '借款期限', category: 'Date', description: '提取借款起始日期和到期日期。', example: '自2023年1月10日起', outputExample: '2023-01-10' },
        { id: 'sk-3', name: '年利率', category: 'Amount', description: '提取借款的年化利率（%）。', example: '固定利率 6.5%', outputExample: '6.5%' },
        { id: 'sk-4', name: '担保措施', category: 'Text', description: '提取所有的担保方式及担保人/抵押人名称。', example: '湖北天诚置业有限公司 提供连带责任保证担保', outputExample: '连带责任保证: 湖北天诚置业有限公司' }
    ],
    // Fully localized Chinese keys
    schema: JSON.stringify({ "借款人名称": "string", "借款本金": "number", "年利率": "string", "起始日期": "string", "结束日期": "string", "担保人列表": "array" }, null, 2),
    systemInstruction: `分析借款合同，提取借款人、本金、利率、期限及担保信息。确保金额为数字，日期格式为YYYY-MM-DD。`
  },
  {
    id: 'rule-court-001',
    docType: DocType.COURT_RULING,
    name: '法院判决结果结构化',
    version: 1,
    skills: [],
    schema: JSON.stringify({ "案号": "string", "被告名称": "string", "判决本金": "number", "判决日期": "string", "责任类型": "string" }, null, 2),
    systemInstruction: `分析法院判决书。提取案号、被告名称、判决偿还的总金额（本金）、判决日期以及责任类型（如连带责任）。`
  },
  {
    id: 'rule-mort-001',
    docType: DocType.MORTGAGE_CONTRACT,
    name: '抵押物信息提取',
    version: 1,
    skills: [],
    schema: JSON.stringify({ "抵押人": "string", "抵押物名称": "string", "坐落位置": "string", "最高债权额": "number" }, null, 2),
    systemInstruction: `从抵押合同中提取抵押人、抵押物名称、坐落位置及最高债权额度。`
  },
  {
    id: 'rule-eval-001',
    docType: DocType.ASSET_EVALUATION,
    name: '资产评估价值提取',
    version: 1,
    skills: [],
    schema: JSON.stringify({ "资产名称": "string", "评估方法": "string", "市场价值": "number", "清算价值": "number", "评估基准日": "string" }, null, 2),
    systemInstruction: `分析资产评估报告，提取资产名称、使用的评估方法、市场评估价值、清算价值（如有）及评估基准日。`
  },
  {
    id: 'rule-transfer-001',
    docType: DocType.TRANSFER_AGREEMENT,
    name: '债权转让条款分析',
    version: 1,
    skills: [],
    schema: JSON.stringify({ "转让方": "string", "受让方": "string", "转让价格": "number", "债权基准日": "string" }, null, 2),
    systemInstruction: `提取债权转让协议中的转让方、受让方、转让对价金额及债权基准日。`
  }
];

const INITIAL_MODELS: AIModel[] = [
    { id: 'mod-1', name: 'DeepSeek-V3 (深度求索)', apiModelName: 'deepseek-v3' },
    { id: 'mod-2', name: 'Kimi (月之暗面)', apiModelName: 'kimi-moonshot' },
    { id: 'mod-3', name: 'Qwen-Max (通义千问)', apiModelName: 'qwen-max' },
    { id: 'mod-4', name: 'Yi-Large (零一万物)', apiModelName: 'yi-large' },
];

const INITIAL_TOOLS: MCPTool[] = [
    { id: 'tool-1', name: '天眼查/企查查', description: '查询借款企业工商状态、涉诉、股权穿透图。' },
    { id: 'tool-2', name: '阿里拍卖/京东法拍', description: '查询抵押物周边房产近期法拍成交价格，辅助估值。' },
    { id: 'tool-3', name: '中国裁判文书网', description: '检索借款人或担保人的历史涉诉案件记录。' },
];

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [rules, setRules] = useState<ExtractionRule[]>(INITIAL_RULES);
  const [models, setModels] = useState<AIModel[]>(INITIAL_MODELS);
  const [tools, setTools] = useState<MCPTool[]>(INITIAL_TOOLS);
  
  // Settings Selection State
  const [selectedModelId, setSelectedModelId] = useState<string>(INITIAL_MODELS[0].id);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);

  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('dashboard');

  const handleUpload = async (files: FileList) => {
    if (!currentProjectId) return; 

    const newDocs: DocumentFile[] = Array.from(files).map((file, idx) => {
      let content = [MOCK_CONTENT_LOAN];
      if (file.name.includes('判决') || file.name.includes('裁定')) content = [MOCK_CONTENT_RULING];
      const uploader = MOCK_USERS[idx % MOCK_USERS.length];

      return {
        id: uuidv4(),
        projectId: currentProjectId,
        uploaderId: uploader.id,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        uploadDate: new Date().toISOString(),
        type: DocType.UNKNOWN,
        status: ProcessingStatus.UPLOADED,
        content: content
      };
    });

    setDocuments(prev => [...prev, ...newDocs]);

    newDocs.forEach(async (doc) => {
      updateDocStatus(doc.id, ProcessingStatus.CLASSIFYING);
      const type = await classifyDocumentContent(doc.content[0]);
      setDocuments(prev => prev.map(d => 
        d.id === doc.id 
          ? { ...d, type, status: ProcessingStatus.READY_TO_EXTRACT } 
          : d
      ));
    });
  };

  const updateDocStatus = (id: string, status: ProcessingStatus) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const handleUpdateDocument = (updatedDoc: DocumentFile) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  const handleSelectDocument = (id: string) => {
    setCurrentDocId(id);
    setView('workspace');
  };

  const handleBackToDashboard = () => {
    setCurrentDocId(null);
    setView('dashboard');
  };

  const toggleTool = (id: string) => {
    setSelectedToolIds(prev => 
        prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const activeModel = models.find(m => m.id === selectedModelId);
  const currentDocument = documents.find(d => d.id === currentDocId);
  const currentProject = projects.find(p => p.id === currentProjectId) || null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {view === 'dashboard' && (
        <Dashboard 
          currentProject={currentProject}
          projects={projects}
          documents={documents} 
          users={MOCK_USERS}
          models={models}
          tools={tools}
          selectedModelId={selectedModelId}
          selectedToolIds={selectedToolIds}
          onModelSelect={setSelectedModelId}
          onToolToggle={toggleTool}
          onUpload={handleUpload}
          onSelectDoc={handleSelectDocument}
          onSelectProject={setCurrentProjectId}
          onManageRules={() => setView('rules')}
          onOpenSettings={() => setView('settings')}
        />
      )}

      {view === 'workspace' && currentDocument && activeModel && (
        <Workspace 
          document={currentDocument}
          allRules={rules}
          activeModelId={activeModel.apiModelName}
          onBack={handleBackToDashboard}
          onUpdateDocument={handleUpdateDocument}
          onUpdateRules={setRules}
          onManageRules={() => setView('rules')}
        />
      )}

      {view === 'rules' && (
        <RuleLibrary 
          rules={rules} 
          onUpdateRules={setRules}
          onBack={handleBackToDashboard} 
        />
      )}

      {view === 'settings' && (
        <Settings 
          models={models}
          tools={tools}
          onUpdateModels={setModels}
          onUpdateTools={setTools}
          onBack={handleBackToDashboard}
        />
      )}
    </div>
  );
};

export default App;