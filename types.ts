export enum DocType {
  LOAN_AGREEMENT = 'Loan Agreement',
  MORTGAGE_CONTRACT = 'Mortgage Contract',
  COURT_RULING = 'Court Ruling',
  ASSET_EVALUATION = 'Asset Evaluation',
  TRANSFER_AGREEMENT = 'Transfer Agreement',
  UNKNOWN = 'Unknown'
}

export const DocTypeCN: Record<DocType, string> = {
  [DocType.LOAN_AGREEMENT]: '借款合同',
  [DocType.MORTGAGE_CONTRACT]: '抵押担保合同',
  [DocType.COURT_RULING]: '法院判决/裁定书',
  [DocType.ASSET_EVALUATION]: '资产评估报告',
  [DocType.TRANSFER_AGREEMENT]: '债权转让协议',
  [DocType.UNKNOWN]: '未知类型'
};

export enum ProcessingStatus {
  UPLOADED = 'Uploaded',
  CLASSIFYING = 'Classifying',
  READY_TO_EXTRACT = 'Ready',
  EXTRACTING = 'Extracting',
  REVIEW = 'Review Needed',
  COMPLETED = 'Completed'
}

export const StatusCN: Record<ProcessingStatus, string> = {
  [ProcessingStatus.UPLOADED]: '已上传',
  [ProcessingStatus.CLASSIFYING]: '分类中...',
  [ProcessingStatus.READY_TO_EXTRACT]: '待提取',
  [ProcessingStatus.EXTRACTING]: '提取中...',
  [ProcessingStatus.REVIEW]: '待人工确认',
  [ProcessingStatus.COMPLETED]: '已完成'
};

export interface ExtractionField {
  key: string;
  label: string;
  value: string | number | null;
  confidence: number; // 0-1
  sourcePage?: number;
  isEdited?: boolean;
}

export type SkillCategory = 'Date' | 'Amount' | 'Entity' | 'Text' | 'Boolean' | 'Other';

export const SkillCategoryCN: Record<SkillCategory, string> = {
    'Date': '日期',
    'Amount': '金额',
    'Entity': '主体/公司',
    'Text': '文本',
    'Boolean': '是非判断',
    'Other': '其他'
};

export interface ExtractionSkill {
  id: string;
  name: string; // e.g., "Invoice Date"
  category: SkillCategory;
  description: string; // e.g., "Find the date labeled 'Date' or 'Invoice Date'"
  example?: string; // The text selected from the doc (Input)
  outputExample?: string; // The expected formatted output
}

export interface ExtractionRule {
  id: string;
  docType: DocType;
  name: string;
  systemInstruction: string; // General overview
  skills: ExtractionSkill[]; // Specific modular rules
  schema: string; // JSON string representation of expected schema
  version: number;
}

export interface AIModel {
  id: string;
  name: string;
  apiModelName: string; // e.g. 'gemini-3-flash-preview'
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  endpoint?: string;
}

export interface User {
  id: string;
  name: string;
  role: string; // e.g. 'Asset Manager', 'Legal Counsel'
  avatarInitial: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  debtorName: string; // 核心债务人
  totalAmount: string; // 债权总额
  status: 'Active' | 'Archived' | 'Completed';
  createdAt: string;
  memberIds: string[];
  progress: number; // 0-100
}

export interface ComparableTransaction {
  id: string;
  projectName: string;
  similarity: number; // 0-100
  transactionDate: string;
  transactionPrice: string;
  source: '阿里拍卖' | '京东法拍' | '公拍网';
  status: '已成交' | '流拍';
}

export type BadCaseType = 'missed' | 'incorrect';

export interface BadCase {
  id: string;
  text: string;
  type: BadCaseType;
  note?: string;
}

export interface DocumentFile {
  id: string;
  projectId: string; // Linked Project
  uploaderId: string; // Who uploaded it
  name: string;
  size: string;
  uploadDate: string;
  type: DocType;
  status: ProcessingStatus;
  content: string[]; // Simulating pages as text blocks
  extractedData?: Record<string, ExtractionField>;
  appliedRuleId?: string;
}

export type ViewMode = 'dashboard' | 'workspace' | 'rules' | 'settings';