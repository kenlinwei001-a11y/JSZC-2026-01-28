import { GoogleGenAI, Type } from "@google/genai";
import { DocType, ExtractionRule, ExtractionField, SkillCategoryCN, BadCase } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in process.env.API_KEY. AI features will fail.");
  }
  return new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
};

// Internal mapping to ensure the app works with Gemini API while displaying Chinese model names
const resolveModel = (uiModelName: string): string => {
  const map: Record<string, string> = {
    'deepseek-v3': 'gemini-3-pro-preview', // Map DeepSeek to Gemini Pro
    'kimi-moonshot': 'gemini-3-pro-preview', // Map Kimi to Gemini Pro (Long Context)
    'qwen-max': 'gemini-3-flash-preview', // Map Qwen to Gemini Flash
    'yi-large': 'gemini-3-flash-preview', // Map Yi to Gemini Flash
  };
  return map[uiModelName] || uiModelName;
};

// --- AI PROMPT LIBRARY (Backend Optimization) ---
// 针对结构化提取优化的提示词库，包含思维链(CoT)和格式化要求
const PROMPT_LIBRARY: Record<string, string> = {
  DEFAULT: `
    你是一个专业的文档结构化提取专家。你的目标是精准、客观地从非结构化文本中提取关键信息。
    请遵循以下原则：
    1. 保持原文数据的真实性，对于金额、日期、人名不要进行模糊处理。
    2. 金额统一转换为纯数字形式（如 "五万元" -> 50000）。
    3. 日期统一格式为 "YYYY-MM-DD"。
    4. 如果原文中未提及某字段，请返回 null，不要编造数据。
  `,
  [DocType.LOAN_AGREEMENT]: `
    你是一个金融法律专家，专门处理信贷与担保合同。
    任务：提取借款合同的关键要素。
    注意事项：
    - 精准区分"借款人"与"担保人"。
    - 利率提取需区分"年利率"与"罚息利率"，并保留百分号（如 6.5%）。
    - 借款期限需精确提取起始日和到期日。
    - 担保方式可能包含：抵押、质押、保证。请提取具体的担保人名称。
  `,
  [DocType.COURT_RULING]: `
    你是一个法律文书分析专家，专门处理法院判决书与裁定书。
    任务：提取司法判决结果。
    注意事项：
    - 准确提取"案号"（通常在文首）。
    - 区分"原告"与"被告"，如果有多个被告，请列出列表。
    - 重点提取"判决主文"中的金额信息，区分"本金"、"利息"、"案件受理费"。
    - 判决日期以文末落款日期为准。
  `
};

// Classification
export const classifyDocumentContent = async (textSample: string): Promise<DocType> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `分析以下文档片段并将其分类为以下不良资产业务文档类型之一：
      Loan Agreement (借款合同), 
      Mortgage Contract (抵押担保合同), 
      Court Ruling (法院判决/裁定书), 
      Asset Evaluation (资产评估报告), 
      Transfer Agreement (债权转让协议)。
      
      仅返回类别英文名称（如 Loan Agreement）。如果不确定，返回 Unknown。
      
      片段： "${textSample.substring(0, 1000)}..."`,
    });
    
    const text = response.text?.trim();
    if (text?.includes('Loan')) return DocType.LOAN_AGREEMENT;
    if (text?.includes('Mortgage')) return DocType.MORTGAGE_CONTRACT;
    if (text?.includes('Court') || text?.includes('Ruling') || text?.includes('Judgment')) return DocType.COURT_RULING;
    if (text?.includes('Evaluation') || text?.includes('Asset')) return DocType.ASSET_EVALUATION;
    if (text?.includes('Transfer')) return DocType.TRANSFER_AGREEMENT;
    
    return DocType.UNKNOWN;
  } catch (error) {
    console.error("Classification error:", error);
    return DocType.UNKNOWN;
  }
};

// Optimization for a single skill description
export const optimizeSkillDescription = async (userInput: string, exampleText?: string): Promise<string> => {
  const ai = getAiClient();
  const prompt = `
    你是一位精通大型语言模型提示词（Prompt）编写的专家，专注于金融与法律文档处理。
    
    用户输入的描述： "${userInput}"
    ${exampleText ? `上下文（文档中的示例文本）： "${exampleText}"` : ''}
    
    任务：将用户的输入重写为一条精确、高质量的指令，用于让 AI 从不良资产相关文档中提取这些特定信息。
    保持简洁但稳健。直接输出优化后的指令，不要包含引号。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text?.trim() || userInput;
  } catch (error) {
    console.error("Skill optimization error", error);
    return userInput;
  }
};

// --- AI Rule Generation ---
export const generateRuleStructure = async (
    userDescription: string
): Promise<{ systemInstruction: string; skills: any[]; schema: string }> => {
    const ai = getAiClient();
    
    const prompt = `
      你是一个不良资产文档处理系统的架构师。
      
      用户需求：
      "${userDescription}"
      
      任务：
      基于用户的需求（可能是一个字段列表，或者一段描述），生成一个完整的提取规则配置。
      包含以下三个部分：
      1. systemInstruction: 系统提示词，指导AI如何处理此类文档。
      2. skills: 一个技能数组，每个技能包含 { name, category, description, outputExample }。Category 只能是: 'Date' | 'Amount' | 'Entity' | 'Text' | 'Boolean' | 'Other'。
      3. schema: 对应的 JSON Schema 字符串。

      请返回纯 JSON 格式：
      {
        "systemInstruction": "...",
        "skills": [ ... ],
        "schema": { ... } // 直接返回对象，不要 stringify
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text || '{}');
        
        return {
            systemInstruction: result.systemInstruction || '',
            skills: result.skills || [],
            schema: JSON.stringify(result.schema || {}, null, 2)
        };
    } catch (e) {
        console.error("Rule generation error", e);
        throw e;
    }
};


// Extraction
export const extractDataWithRule = async (
  documentText: string, 
  rule: ExtractionRule,
  modelName: string = 'gemini-3-pro-preview'
): Promise<Record<string, ExtractionField>> => {
  const ai = getAiClient();
  const actualModel = resolveModel(modelName);

  // 1. Get Base Prompt from Library
  const basePrompt = PROMPT_LIBRARY[rule.docType] || PROMPT_LIBRARY.DEFAULT;

  // 2. Compile Skills with Categories and Examples (Few-Shot)
  let compiledInstruction = `${basePrompt}\n\n用户自定义指令：\n${rule.systemInstruction}\n\n特定提取技能 (Specific Extraction Skills):\n`;
  if (rule.skills && rule.skills.length > 0) {
    rule.skills.forEach((skill, index) => {
      const categoryLabel = SkillCategoryCN[skill.category] || '通用';
      compiledInstruction += `${index + 1}. [${categoryLabel}] ${skill.name}: ${skill.description}\n`;
      if (skill.example || skill.outputExample) {
        compiledInstruction += `   参考样例: 遇到类似 "${skill.example || '...'}" 的表述，应提取为 -> "${skill.outputExample || '...'}"\n`;
      }
    });
  } else {
    compiledInstruction += "根据输出 Schema 提取所有相关字段。\n";
  }

  const prompt = `
    文档内容：
    ${documentText}
    
    任务：
    根据下面提供的 Schema 提取数据，严格遵循系统指令。
    
    输出 Schema:
    ${rule.schema}

    输出格式：
    返回一个严格合法的 JSON 对象。
    对于每个字段，提供一个对象结构：{ "value": string | number, "confidence": number }。
    若未找到，value 设为 null。
  `;

  try {
    const response = await ai.models.generateContent({
      model: actualModel, 
      contents: prompt,
      config: {
        systemInstruction: compiledInstruction,
        responseMimeType: "application/json",
      }
    });

    const jsonRaw = response.text;
    if (!jsonRaw) throw new Error("No data returned");

    const parsed = JSON.parse(jsonRaw);
    
    const result: Record<string, ExtractionField> = {};
    Object.keys(parsed).forEach(key => {
      const item = parsed[key];
      
      const isAscii = /^[\x00-\x7F]*$/.test(key);
      const label = isAscii 
        ? key.replace(/([A-Z])/g, ' $1').trim()
        : key;

      result[key] = {
        key,
        label,
        value: typeof item === 'object' && item?.value !== undefined ? item.value : item,
        confidence: typeof item === 'object' && item?.confidence ? item.confidence : 0.8,
        sourcePage: 1
      };
    });

    return result;

  } catch (error) {
    console.error("Extraction error:", error);
    throw error;
  }
};

// --- NEW: Refine Extraction with Bad Cases ---
export const refineExtractionWithFeedback = async (
    documentText: string,
    currentData: Record<string, ExtractionField>,
    badCases: BadCase[],
    docType: DocType
): Promise<Record<string, ExtractionField>> => {
    const ai = getAiClient();
    const basePrompt = PROMPT_LIBRARY[docType] || PROMPT_LIBRARY.DEFAULT;

    // Filter relevant current data to context window if needed, but for now send all
    const currentValues = JSON.stringify(
        Object.keys(currentData).reduce((acc, key) => {
            acc[key] = currentData[key].value;
            return acc;
        }, {} as Record<string, any>), 
        null, 2
    );

    const feedbackList = badCases.map((bc, idx) => 
        `${idx+1}. 类型：${bc.type === 'missed' ? '漏提 (Missed)' : '错提 (Incorrect)'}。相关原文："${bc.text}"。备注：${bc.note || '无'}`
    ).join('\n');

    const prompt = `
        ${basePrompt}

        任务：二次提取与修正 (Secondary Extraction Refinement)。
        
        背景：
        用户对初步提取结果进行了审核，并标记了“漏提”或“错提”的原文片段（Bad Cases）。
        请基于用户的反馈和原文，修正并补全提取结果。

        文档内容：
        ${documentText}

        当前提取结果 (JSON):
        ${currentValues}

        用户反馈 (Bad Cases):
        ${feedbackList}

        要求：
        1. 对于“错提”项，请根据原文修正对应字段的值。
        2. 对于“漏提”项，请判断该信息属于哪个现有字段（若为null）或是否需要提取到合适字段。
        3. 保持未受影响的字段不变。
        
        输出格式：
        返回完整的、修正后的 JSON 对象。格式与“当前提取结果”一致。
        不要改变字段 Key。
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const refinedRaw = JSON.parse(response.text || '{}');
        
        // Merge refined values back into ExtractionField structure
        const refinedResult: Record<string, ExtractionField> = { ...currentData };
        
        Object.keys(refinedRaw).forEach(key => {
            if (refinedResult[key]) {
                const oldVal = refinedResult[key].value;
                const newVal = refinedRaw[key];
                
                // If value changed, mark as high confidence / refined
                if (oldVal !== newVal) {
                    refinedResult[key] = {
                        ...refinedResult[key],
                        value: newVal,
                        confidence: 0.99, // High confidence after refinement
                        isEdited: false // System refined, not manual edit yet
                    };
                }
            }
        });

        return refinedResult;

    } catch (e) {
        console.error("Refinement error", e);
        throw e;
    }
};

// --- NEW: Localized Analysis / Targeted Re-check ---
export const analyzeSpecificRegion = async (
    textRegion: string,
    targetFields: string[],
    docType: DocType
): Promise<Record<string, any>> => {
    const ai = getAiClient();
    const basePrompt = PROMPT_LIBRARY[docType] || PROMPT_LIBRARY.DEFAULT;

    const prompt = `
      ${basePrompt}
      
      当前任务：局部侦测与补全。
      
      背景：
      用户认为之前的提取过程遗漏或错误提取了以下字段：${targetFields.join(', ')}。
      用户框选了以下原文段落，认为其中包含正确答案。
      
      选定原文段落：
      "${textRegion}"
      
      请分析上述段落，尝试提取以下字段的值：${targetFields.join(', ')}。
      
      返回格式 (JSON):
      {
        "found": boolean,
        "data": {
           "字段名": "提取值"
        }
      }
      如果某个字段在段落中未找到，请在 data 中省略或设为 null。
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Local analysis error", e);
        return { found: false, data: {} };
    }
};


// Rule Optimization
export const optimizeRuleFromFeedback = async (
  currentRule: ExtractionRule,
  originalText: string,
  incorrectExtraction: Record<string, any>,
  correctedExtraction: Record<string, any>
): Promise<string> => {
  const ai = getAiClient();

  const prompt = `
    我有一条针对不良资产文档的提取规则未能正确提取数据。
    
    原始文档片段：
    "${originalText.substring(0, 2000)}..."
    
    当前系统指令：
    "${currentRule.systemInstruction}"
    
    错误结果：
    模型提取了：${JSON.stringify(incorrectExtraction)}
    
    修正结果（人工核实）：
    用户手动修正为：${JSON.stringify(correctedExtraction)}
    
    任务：
    重写系统指令（总体概述），使其更加稳健以避免此类错误，特别注意金融数字、日期和法律条款的准确性。
    仅返回新的系统指令文本。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: prompt,
    });
    
    return response.text || currentRule.systemInstruction;
  } catch (error) {
    console.error("Rule optimization error:", error);
    return currentRule.systemInstruction;
  }
};