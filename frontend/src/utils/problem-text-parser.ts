/**
 * Problem Text Parser
 * Parses formatted text into problem fields
 * Supports both Chinese and English formats
 */

/**
 * Add \displaystyle to integral expressions that don't have it
 * Handles both inline $...$ and block $$...$$ math expressions
 */
export function addDisplayStyleToIntegrals(text: string): string {
  if (!text) return text;

  // Pattern to match \int that is NOT preceded by \displaystyle
  // We need to handle this carefully to avoid double-adding

  // Process the text by finding all math expressions and modifying them
  let result = text;

  // First, handle block math $$...$$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_match, mathContent) => {
    const processed = addDisplayStyleToMathContent(mathContent);
    return `$$${processed}$$`;
  });

  // Then, handle inline math $...$ (but not $$)
  // Use a more careful approach to avoid matching $$ as two $
  result = result.replace(/(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, (_match, mathContent) => {
    const processed = addDisplayStyleToMathContent(mathContent);
    return `$${processed}$`;
  });

  return result;
}

/**
 * Add \displaystyle to integral expressions within math content
 */
function addDisplayStyleToMathContent(mathContent: string): string {
  if (!mathContent.includes('\\int')) {
    return mathContent;
  }

  // Check if \displaystyle is already present before \int
  // Pattern: \int not preceded by \displaystyle (with optional whitespace)
  // We need to add \displaystyle before \int if it's not already there

  // Split by \int and process each part
  const parts = mathContent.split(/(\\int)/g);
  let result = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '\\int') {
      // Check if the previous content ends with \displaystyle (with optional whitespace)
      const prevContent = result.trimEnd();
      if (prevContent.endsWith('\\displaystyle')) {
        // Already has \displaystyle, just add the \int
        result += part;
      } else {
        // Need to add \displaystyle before \int
        result += '\\displaystyle ' + part;
      }
    } else {
      result += part;
    }
  }

  return result;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type ProblemType = 'choice' | 'fill-blank';

export interface ParsedOption {
  id: string;
  label: string;
  content: string;
}

export interface ParsedProblem {
  difficulty?: Difficulty;
  type: ProblemType;
  content: string;
  options: ParsedOption[];
  correctAnswers: string[];
  fillBlankAnswer: string;
  explanation: string;
  source: string;
}

// Difficulty keyword mappings (Chinese and English)
const DIFFICULTY_MAPPINGS: Record<string, Difficulty> = {
  // Chinese - Easy
  '简单': 'easy',
  '较易': 'easy',
  '容易': 'easy',
  '易': 'easy',
  '基础': 'easy',
  // Chinese - Medium
  '中等': 'medium',
  '一般': 'medium',
  '普通': 'medium',
  '适中': 'medium',
  // Chinese - Hard
  '困难': 'hard',
  '较难': 'hard',
  '难': 'hard',
  '高难': 'hard',
  '挑战': 'hard',
  // English - Easy
  'easy': 'easy',
  'simple': 'easy',
  'basic': 'easy',
  'beginner': 'easy',
  // English - Medium
  'medium': 'medium',
  'moderate': 'medium',
  'intermediate': 'medium',
  'normal': 'medium',
  // English - Hard
  'hard': 'hard',
  'difficult': 'hard',
  'challenging': 'hard',
  'advanced': 'hard',
};

// Answer keyword patterns (Chinese and English)
const ANSWER_PATTERNS = [
  /^答案[：:]\s*/i,
  /^正确答案[：:]\s*/i,
  /^answer[：:]\s*/i,
  /^correct answer[：:]\s*/i,
  /^ans[：:]\s*/i,
];

// Explanation keyword patterns (Chinese and English)
const EXPLANATION_PATTERNS = [
  /^解析[：:]\s*/i,
  /^答案解析[：:]\s*/i,
  /^解答[：:]\s*/i,
  /^分析[：:]\s*/i,
  /^explanation[：:]\s*/i,
  /^analysis[：:]\s*/i,
  /^solution[：:]\s*/i,
];

// Source keyword patterns
const SOURCE_PATTERNS = [
  /^来源[：:]\s*/i,
  /^出处[：:]\s*/i,
  /^source[：:]\s*/i,
  /^from[：:]\s*/i,
];

// Option patterns: A. A、A: A) (A) A．
const OPTION_PATTERN = /^([A-Ha-h])[.、:)）．]\s*/;

/**
 * Parse difficulty from a line of text
 */
function parseDifficulty(line: string): Difficulty | null {
  const trimmed = line.trim().toLowerCase();

  // Check for exact match first
  if (DIFFICULTY_MAPPINGS[trimmed]) {
    return DIFFICULTY_MAPPINGS[trimmed];
  }

  // Check for partial match (e.g., "难度：中等" or "Difficulty: Medium")
  for (const [keyword, difficulty] of Object.entries(DIFFICULTY_MAPPINGS)) {
    if (trimmed.includes(keyword.toLowerCase())) {
      return difficulty;
    }
  }

  return null;
}

/**
 * Check if a line matches any of the given patterns
 */
function matchesPattern(line: string, patterns: RegExp[]): { matched: boolean; content: string } {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return { matched: true, content: line.slice(match[0].length).trim() };
    }
  }
  return { matched: false, content: line };
}

/**
 * Parse option from a line
 */
function parseOption(line: string): { label: string; content: string } | null {
  const match = line.match(OPTION_PATTERN);
  if (match) {
    const label = match[1].toUpperCase();
    const content = line.slice(match[0].length).trim();
    return { label, content };
  }
  return null;
}

/**
 * Parse answer string to extract correct answer(s)
 */
function parseAnswerString(answerStr: string): string[] {
  const cleaned = answerStr.trim().toUpperCase();

  // Handle multiple answers like "A, B" or "AB" or "A、B" or "A B"
  const answers: string[] = [];

  // Split by common separators
  const parts = cleaned.split(/[,，、\s]+/).filter(Boolean);

  for (const part of parts) {
    // Handle cases like "AB" or "ABC"
    if (/^[A-H]+$/.test(part)) {
      for (const char of part) {
        if (!answers.includes(char)) {
          answers.push(char);
        }
      }
    }
  }

  return answers.sort();
}

/**
 * Main parser function
 */
export function parseProblemText(text: string): ParsedProblem {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  const result: ParsedProblem = {
    type: 'choice',
    content: '',
    options: [],
    correctAnswers: [],
    fillBlankAnswer: '',
    explanation: '',
    source: '',
  };

  let currentSection: 'content' | 'options' | 'answer' | 'explanation' | 'source' = 'content';
  let contentLines: string[] = [];
  let explanationLines: string[] = [];
  let lineIndex = 0;

  // Check first line for difficulty
  if (lines.length > 0) {
    const difficulty = parseDifficulty(lines[0]);
    if (difficulty) {
      result.difficulty = difficulty;
      lineIndex = 1;
    }
  }

  // Process remaining lines
  while (lineIndex < lines.length) {
    const line = lines[lineIndex];

    // Check for answer section
    const answerMatch = matchesPattern(line, ANSWER_PATTERNS);
    if (answerMatch.matched) {
      currentSection = 'answer';
      if (answerMatch.content) {
        result.correctAnswers = parseAnswerString(answerMatch.content);
        // If no valid letter answers, treat as fill-blank answer
        if (result.correctAnswers.length === 0) {
          result.fillBlankAnswer = answerMatch.content;
          result.type = 'fill-blank';
        }
      }
      lineIndex++;
      continue;
    }

    // Check for explanation section
    const explanationMatch = matchesPattern(line, EXPLANATION_PATTERNS);
    if (explanationMatch.matched) {
      currentSection = 'explanation';
      if (explanationMatch.content) {
        explanationLines.push(explanationMatch.content);
      }
      lineIndex++;
      continue;
    }

    // Check for source section
    const sourceMatch = matchesPattern(line, SOURCE_PATTERNS);
    if (sourceMatch.matched) {
      currentSection = 'source';
      if (sourceMatch.content) {
        result.source = sourceMatch.content;
      }
      lineIndex++;
      continue;
    }

    // Check for option
    const optionMatch = parseOption(line);
    if (optionMatch) {
      currentSection = 'options';
      result.options.push({
        id: optionMatch.label,
        label: optionMatch.label,
        content: optionMatch.content,
      });
      lineIndex++;
      continue;
    }

    // Add to current section
    switch (currentSection) {
      case 'content':
        contentLines.push(line);
        break;
      case 'explanation':
        explanationLines.push(line);
        break;
      case 'answer':
        // If we're in answer section and find more text, treat as explanation
        if (result.correctAnswers.length === 0 && !result.fillBlankAnswer) {
          // This might be a continuation of fill-blank answer
          result.fillBlankAnswer = line;
          result.type = 'fill-blank';
        }
        break;
    }

    lineIndex++;
  }

  // Set content and apply displaystyle to integrals
  result.content = addDisplayStyleToIntegrals(contentLines.join('\n'));

  // Set explanation and apply displaystyle to integrals
  result.explanation = addDisplayStyleToIntegrals(explanationLines.join('\n'));

  // Also apply to options
  result.options = result.options.map(opt => ({
    ...opt,
    content: addDisplayStyleToIntegrals(opt.content),
  }));

  // Determine type based on options
  if (result.options.length === 0 && result.correctAnswers.length === 0) {
    result.type = 'fill-blank';
  }

  // If we have options but no correct answers, default to choice type
  if (result.options.length > 0) {
    result.type = 'choice';
  }

  // Ensure we have at least 2 options for choice type if options exist
  if (result.type === 'choice' && result.options.length > 0 && result.options.length < 2) {
    // Add empty options up to 4
    const labels = 'ABCDEFGH';
    while (result.options.length < 4) {
      const nextLabel = labels[result.options.length];
      result.options.push({ id: nextLabel, label: nextLabel, content: '' });
    }
  }

  return result;
}

/**
 * Generate example text for the user (choice question)
 */
export function getExampleText(language: 'zh' | 'en'): string {
  if (language === 'zh') {
    return `中等
已知函数 $f(x) = x^2 + 2x + 1$，求 $f(2)$ 的值。

A. 5
B. 7
C. 9
D. 11

答案：C
解析：$f(2) = 2^2 + 2 \\times 2 + 1 = 4 + 4 + 1 = 9$`;
  }

  return `Medium
Given the function $f(x) = x^2 + 2x + 1$, find the value of $f(2)$.

A. 5
B. 7
C. 9
D. 11

Answer: C
Explanation: $f(2) = 2^2 + 2 \\times 2 + 1 = 4 + 4 + 1 = 9$`;
}

/**
 * Generate example text for fill-in-the-blank question
 */
export function getFillBlankExampleText(language: 'zh' | 'en'): string {
  if (language === 'zh') {
    return `困难
计算积分 $\\int_0^1 x^2 dx$ 的值。

答案：1/3
解析：$\\int_0^1 x^2 dx = \\frac{x^3}{3} \\Big|_0^1 = \\frac{1}{3}$`;
  }

  return `Hard
Calculate the integral $\\int_0^1 x^2 dx$.

Answer: 1/3
Explanation: $\\int_0^1 x^2 dx = \\frac{x^3}{3} \\Big|_0^1 = \\frac{1}{3}$`;
}

/**
 * Separator patterns for multiple problems
 */
const SEPARATOR_PATTERNS = [
  /^-{3,}$/,           // --- or more dashes
  /^={3,}$/,           // === or more equals
  /^#{3,}$/,           // ### or more hashes
  /^题目\s*\d+/,       // 题目 1, 题目 2, etc.
  /^第\s*\d+\s*题/,    // 第 1 题, 第 2 题, etc.
  /^Problem\s*\d+/i,   // Problem 1, Problem 2, etc.
  /^Question\s*\d+/i,  // Question 1, Question 2, etc.
  /^Q\s*\d+[.:]/i,     // Q1. or Q1:
];

/**
 * Number prefix pattern for detecting numbered problems
 */
const NUMBER_PREFIX_PATTERN = /^\d+[.、)\]]\s*/;

/**
 * Check if a line is a problem separator
 */
function isSeparator(line: string): boolean {
  const trimmed = line.trim();
  return SEPARATOR_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if text contains multiple problems
 */
export function hasMultipleProblems(text: string): boolean {
  const lines = text.split('\n');
  let separatorCount = 0;
  let numberPrefixCount = 0;
  let lastNumberPrefix = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for explicit separators
    if (isSeparator(trimmed)) {
      separatorCount++;
      continue;
    }

    // Check for numbered prefixes (1. 2. 3.)
    const numberMatch = trimmed.match(NUMBER_PREFIX_PATTERN);
    if (numberMatch) {
      const num = parseInt(trimmed);
      if (!isNaN(num) && num > lastNumberPrefix) {
        numberPrefixCount++;
        lastNumberPrefix = num;
      }
    }

    // Check for difficulty keyword at start of a "section" (after empty line)
    const prevLineIndex = lines.indexOf(line) - 1;
    if (prevLineIndex >= 0 && !lines[prevLineIndex].trim()) {
      const difficulty = parseDifficulty(trimmed);
      if (difficulty) {
        separatorCount++;
      }
    }
  }

  // Multiple problems if we have separators or multiple numbered items
  return separatorCount >= 1 || numberPrefixCount >= 2;
}

/**
 * Split text into multiple problem blocks
 */
function splitIntoBlocks(text: string): string[] {
  const lines = text.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this line is a separator
    if (isSeparator(trimmed)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
      }
      continue;
    }

    // Check for numbered problem start (only if it's 1, or follows previous number)
    const numberMatch = trimmed.match(NUMBER_PREFIX_PATTERN);
    if (numberMatch) {
      const num = parseInt(trimmed);
      // If this is problem 2+ and we have content, start new block
      if (num > 1 && currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
      }
      // Remove the number prefix from the line
      const lineWithoutNumber = trimmed.replace(NUMBER_PREFIX_PATTERN, '');
      currentBlock.push(lineWithoutNumber);
      continue;
    }

    // Check for difficulty keyword after empty line (new problem)
    if (i > 0 && !lines[i - 1].trim() && parseDifficulty(trimmed)) {
      if (currentBlock.length > 0 && currentBlock.some(l => l.trim())) {
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
      }
    }

    currentBlock.push(line);
  }

  // Don't forget the last block
  if (currentBlock.length > 0 && currentBlock.some(l => l.trim())) {
    blocks.push(currentBlock.join('\n'));
  }

  return blocks.filter(block => block.trim());
}

/**
 * Parse multiple problems from text
 */
export function parseMultipleProblems(text: string): ParsedProblem[] {
  // First check if this is a single problem
  if (!hasMultipleProblems(text)) {
    return [parseProblemText(text)];
  }

  // Split into blocks and parse each
  const blocks = splitIntoBlocks(text);
  return blocks.map(block => parseProblemText(block));
}

/**
 * Generate example text for multiple problems
 */
export function getMultipleProblemExampleText(language: 'zh' | 'en'): string {
  if (language === 'zh') {
    return `---
中等
已知函数 $f(x) = x^2 + 2x + 1$，求 $f(2)$ 的值。

A. 5
B. 7
C. 9
D. 11

答案：C
解析：$f(2) = 2^2 + 2 \\times 2 + 1 = 4 + 4 + 1 = 9$

---
困难
计算积分 $\\int_0^1 x^2 dx$ 的值。

答案：1/3
解析：$\\int_0^1 x^2 dx = \\frac{x^3}{3} \\Big|_0^1 = \\frac{1}{3}$

---
简单
求方程 $x^2 - 5x + 6 = 0$ 的解。

A. $x = 1, 6$
B. $x = 2, 3$
C. $x = -2, -3$
D. $x = 1, 5$

答案：B
解析：$x^2 - 5x + 6 = (x-2)(x-3) = 0$，所以 $x = 2$ 或 $x = 3$`;
  }

  return `---
Medium
Given the function $f(x) = x^2 + 2x + 1$, find the value of $f(2)$.

A. 5
B. 7
C. 9
D. 11

Answer: C
Explanation: $f(2) = 2^2 + 2 \\times 2 + 1 = 4 + 4 + 1 = 9$

---
Hard
Calculate the integral $\\int_0^1 x^2 dx$.

Answer: 1/3
Explanation: $\\int_0^1 x^2 dx = \\frac{x^3}{3} \\Big|_0^1 = \\frac{1}{3}$

---
Easy
Solve the equation $x^2 - 5x + 6 = 0$.

A. $x = 1, 6$
B. $x = 2, 3$
C. $x = -2, -3$
D. $x = 1, 5$

Answer: B
Explanation: $x^2 - 5x + 6 = (x-2)(x-3) = 0$, so $x = 2$ or $x = 3$`;
}
