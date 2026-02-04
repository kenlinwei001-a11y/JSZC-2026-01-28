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

const MOCK_CONTENT_EVAL = `房地产估价报告
估价项目名称：湖北天诚实业有限公司抵押之位于武汉市江汉区...商业房地产
估价目的：为确定房地产抵押贷款额度提供参考依据而评估房地产抵押价值。
估价基准日：2023年10月1日
估价结果：
房地产评估总价：RMB 62,000,000 元
大写：人民币陆仟贰佰万元整
单价：18,500 元/平方米
`;

const MOCK_EXTRACTED_RULING = {
    "案号": { key: "案号", label: "案号", value: "(2024) 鄂01民初1024号", confidence: 0.98, isEdited: false },
    "被告名称": { key: "被告名称", label: "被告名称", value: "湖北天诚实业有限公司", confidence: 0.95, isEdited: false },
    "判决本金": { key: "判决本金", label: "判决本金", value: 50000000, confidence: 0.99, isEdited: false },
    "判决日期": { key: "判决日期", label: "判决日期", value: "2024-05-20", confidence: 0.96, isEdited: false },
    "责任类型": { key: "责任类型", label: "责任类型", value: "连带清偿责任", confidence: 0.92, isEdited: false }
};

// Initial Documents to demonstrate "Mostly Classified, Few Unknown"
const MOCK_DOCS: DocumentFile[] = [
    {
        id: 'd1',
        projectId: 'p1',
        uploaderId: 'u1',
        name: '湖北天诚实业_流动资金借款合同.pdf',
        size: '2.4 MB',
        uploadDate: '2023-11-15T10:00:00Z',
        type: DocType.LOAN_AGREEMENT,
        status: ProcessingStatus.READY_TO_EXTRACT,
        content: [MOCK_CONTENT_LOAN],
        extractedData: undefined
    },
    {
        id: 'd2',
        projectId: 'p1',
        uploaderId: 'u1',
        name: '保证合同_湖北天诚置业.pdf',
        size: '1.1 MB',
        uploadDate: '2023-11-15T10:05:00Z',
        type: DocType.LOAN_AGREEMENT,
        status: ProcessingStatus.READY_TO_EXTRACT,
        content: [MOCK_CONTENT_LOAN], // Simplified content
        extractedData: undefined
    },
    {
        id: 'd3',
        projectId: 'p1',
        uploaderId: 'u2',
        name: '(2024)鄂01民初1024号_民事判决书.pdf',
        size: '0.8 MB',
        uploadDate: '2024-05-22T09:30:00Z',
        type: DocType.COURT_RULING,
        status: ProcessingStatus.COMPLETED,
        content: [MOCK_CONTENT_RULING],
        extractedData: MOCK_EXTRACTED_RULING,
        appliedRuleId: 'rule-court-001'
    },
    {
        id: 'd4',
        projectId: 'p1',
        uploaderId: 'u3',
        name: '抵押物_资产评估报告_2023.pdf',
        size: '5.6 MB',
        uploadDate: '2023-10-01T14:20:00Z',
        type: DocType.ASSET_EVALUATION,
        status: ProcessingStatus.READY_TO_EXTRACT,
        content: [MOCK_CONTENT_EVAL],
        extractedData: undefined
    },
    {
        id: 'd5',
        projectId: 'p1',
        uploaderId: 'u1',
        name: '扫描件_20231115_001.pdf',
        size: '4.2 MB',
        uploadDate: '2023-11-15T10:10:00Z',
        type: DocType.UNKNOWN,
        status: ProcessingStatus.UPLOADED,
        content: ["无法识别的扫描件内容..."],
        extractedData: undefined
    },
    // Adding another Loan Agreement to emphasize the "Majority"
    {
        id: 'd6',
        projectId: 'p1',
        uploaderId: 'u2',
        name: '抵押合同_武汉世纪置业.pdf',
        size: '3.5 MB',
        uploadDate: '2023-11-16T11:00:00Z',
        type: DocType.MORTGAGE_CONTRACT,
        status: ProcessingStatus.EXTRACTING, // Show extracting state
        content: ["抵押合同内容..."],
        extractedData: undefined
    }
];

const INITIAL_RULES: ExtractionRule[] = [
  {
    id: 'rule-loan-001',
    docType: DocType.LOAN_AGREEMENT,
    name: '借款合同核心要素提取',
    version: 1,
    isActive: true,
    creatorName: '王经理',
    creationMethod: 'Preset',
    lastRunDate: '2023-11-20',
    skills: [
        { id: 'sk-1', name: '借款本金', category: 'Amount', description: '提取合同约定的借款本金金额，统一转换为纯数字格式。', example: '伍仟万元整', outputExample: '50000000' },
        { id: 'sk-2', name: '借款期限', category: 'Date', description: '提取借款起始日期和到期日期。', example: '自2023年1月10日起', outputExample: '2023-01-10' },
        { id: 'sk-3', name: '年利率', category: 'Amount', description: '提取借款的年化利率（%）。', example: '固定利率 6.5%', outputExample: '6.5%' },
        { id: 'sk-4', name: '担保措施', category: 'Text', description: '提取所有的担保方式及担保人/抵押人名称。', example: '湖北天诚置业有限公司 提供连带责任保证担保', outputExample: '连带责任保证: 湖北天诚置业有限公司' }
    ],
    schema: JSON.stringify({ "借款人名称": "string", "借款本金": "number", "年利率": "string", "起始日期": "string", "结束日期": "string", "担保人列表": "array" }, null, 2),
    systemInstruction: `分析借款合同，提取借款人、本金、利率、期限及担保信息。确保金额为数字，日期格式为YYYY-MM-DD。`
  },
  {
    id: 'rule-court-001',
    docType: DocType.COURT_RULING,
    name: '法院判决结果结构化',
    version: 1,
    isActive: true,
    creatorName: '李法务',
    creationMethod: 'Manual',
    lastRunDate: '2024-02-15',
    skills: [],
    schema: JSON.stringify({ "案号": "string", "被告名称": "string", "判决本金": "number", "判决日期": "string", "责任类型": "string" }, null, 2),
    systemInstruction: `分析法院判决书。提取案号、被告名称、判决偿还的总金额（本金）、判决日期以及责任类型（如连带责任）。`
  },
  {
    id: 'rule-npl-check-001',
    docType: DocType.UNKNOWN,
    name: '不良资产尽调报告关键点 (NPL Checklist)',
    version: 1,
    isActive: true,
    creatorName: 'AI Assistant',
    creationMethod: 'AI_Generated',
    lastRunDate: 'Never',
    skills: [
        { id: 'npl-1', name: '借款人企业名称', category: 'Entity', description: '提取借款企业的全称。', outputExample: '湖北天诚实业有限公司' },
        { id: 'npl-2', name: '注册资本', category: 'Amount', description: '提取企业的注册资本金额。', outputExample: '5000万元' },
        { id: 'npl-3', name: '注册日期', category: 'Date', description: '提取企业工商注册成立的日期。', outputExample: '2010-05-20' },
        { id: 'npl-4', name: '法定代表人', category: 'Entity', description: '提取企业法定代表人姓名。', outputExample: '张三' },
        { id: 'npl-5', name: '股东/投资方', category: 'Text', description: '提取股东名称及其持股比例或投资额。', outputExample: '李四 (40%), 王五 (60%)' },
        { id: 'npl-6', name: '贷款合同编号', category: 'Text', description: '提取主债权合同的编号。', outputExample: 'JK-2023-001' },
        { id: 'npl-7', name: '贷款合同本金', category: 'Amount', description: '提取原始借款本金数额。', outputExample: '10000000' },
        { id: 'npl-8', name: '本金余额', category: 'Amount', description: '提取当前剩余未还本金余额。', outputExample: '8000000' },
        { id: 'npl-9', name: '利息余额', category: 'Amount', description: '提取截至基准日的欠息总额。', outputExample: '500000' },
        { id: 'npl-10', name: '担保人', category: 'Entity', description: '提取所有保证担保人的名称。', outputExample: '武汉世纪置业' },
        { id: 'npl-11', name: '抵质押物类型', category: 'Text', description: '提取抵押物或质押物的种类（如：房产、土地、股权）。', outputExample: '商业房产' },
        { id: 'npl-12', name: '权利价值', category: 'Amount', description: '提取抵押物的评估价值或权利价值。', outputExample: '12000000' }
    ],
    schema: JSON.stringify({
        "借款人企业名称": "string", "注册资本": "string", "注册日期": "string", "法定代表人": "string", "注册地址": "string",
        "投资方": "string", "实际控制人": "string", "经营范围": "string",
        "贷款合同编号": "string", "融资类型": "string", "起始时间": "string", "到期日期": "string",
        "贷款合同本金": "number", "本金余额": "number", "利息余额": "number", "费用": "number", "债权合计": "number", "利率": "string",
        "保证人": "string", "保证金额": "number", "保证方式": "string",
        "抵质押人": "string", "抵质押物类型": "string", "性质/用途": "string", "座落": "string", "权利价值": "number"
    }, null, 2),
    systemInstruction: `作为不良资产尽职调查助手，请从文档中提取借款人基本工商信息（如注册资本、法人、股东）、主债权信息（合同编号、本金、利息余额、利率）、以及担保信息（保证人、抵押物详情）。请确保金额字段为纯数字。`
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
  const [documents, setDocuments] = useState<DocumentFile[]>(MOCK_DOCS);
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
      if (file.name.includes('评估')) content = [MOCK_CONTENT_EVAL];
      
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
          onUpdateDocument={handleUpdateDocument}
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