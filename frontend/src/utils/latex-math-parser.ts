import { evaluate, pi } from 'mathjs';

/**
 * LaTeX 数学表达式解析器
 * 将 LaTeX 数学表达式转换为数值
 *
 * 支持的 LaTeX 语法:
 * - 分数: \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b}
 * - 根号: \sqrt{x}, \sqrt[n]{x}
 * - 三角函数: \sin, \cos, \tan, \cot, \sec, \csc
 * - 反三角函数: \arcsin, \arccos, \arctan
 * - 双曲函数: \sinh, \cosh, \tanh
 * - 对数: \ln, \log, \log_{base}
 * - 指数: e^{x}, 2^{3}
 * - 常量: \pi, \e
 * - 绝对值: |x|, \left|x\right|
 * - 阶乘: n!
 * - 运算符: +, -, \times, \cdot, \div, \pm
 * - 括号: (), {}, []
 */

interface ParseResult {
  success: boolean;
  value?: number;
  error?: string;
  expression?: string; // 转换后的表达式（用于调试）
}

// 提取匹配的花括号内容（支持嵌套）
function extractBracedContent(str: string, startIdx: number): { content: string; endIdx: number } | null {
  if (str[startIdx] !== '{') {
    return null;
  }

  let depth = 0;
  let i = startIdx;

  for (; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: str.slice(startIdx + 1, i),
          endIdx: i,
        };
      }
    }
  }

  return null;
}

// 查找下一个 { 的位置，跳过空白
function findNextBrace(str: string, startIdx: number): number {
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === '{') return i;
    if (!/\s/.test(str[i])) return -1; // 遇到非空白非 { 字符
  }
  return -1;
}

// 将 LaTeX 转换为可计算的数学表达式
function latexToExpression(latex: string): string {
  let expr = latex.trim();

  // 移除 $ 符号
  expr = expr.replace(/^\$+|\$+$/g, '');
  expr = expr.replace(/\\\[|\\\]/g, '');

  // 移除 \displaystyle, \textstyle 等
  expr = expr.replace(/\\(displaystyle|textstyle|scriptstyle|scriptscriptstyle)\s*/g, '');

  // 移除积分、求和等符号（暂不支持计算）
  expr = expr.replace(/\\int(_[^{]*)?(\^[^{]*)?\s*/g, '');
  expr = expr.replace(/\\sum(_[^{]*)?(\^[^{]*)?\s*/g, '');

  // 移除 \left 和 \right
  expr = expr.replace(/\\left/g, '');
  expr = expr.replace(/\\right/g, '');

  // 处理空格命令
  expr = expr.replace(/\\[,;:!]\s*/g, ' ');
  expr = expr.replace(/\\quad\s*/g, ' ');
  expr = expr.replace(/\\qquad\s*/g, ' ');

  // 处理文本命令（移除）
  expr = expr.replace(/\\text\{[^}]*\}/g, '');
  expr = expr.replace(/\\mathrm\{([^}]*)\}/g, '$1');

  // 常量替换
  expr = expr.replace(/\\pi\b/g, '(pi)');
  expr = expr.replace(/\\e\b/g, '(e)');
  expr = expr.replace(/\\infty/g, 'Infinity');

  // 处理分数 \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b}, \cfrac{a}{b}
  // 需要递归处理嵌套分数
  let maxIterations = 50;
  while (maxIterations-- > 0) {
    const fracMatch = expr.match(/\\[dtc]?frac\s*\{/);
    if (!fracMatch || fracMatch.index === undefined) break;

    const startIdx = fracMatch.index;
    const braceStart = startIdx + fracMatch[0].length - 1; // 指向 {

    // 提取分子
    const numerator = extractBracedContent(expr, braceStart);
    if (!numerator) break;

    // 找到分母的 {
    const denomBraceStart = findNextBrace(expr, numerator.endIdx + 1);
    if (denomBraceStart === -1) break;

    // 提取分母
    const denominator = extractBracedContent(expr, denomBraceStart);
    if (!denominator) break;

    // 替换分数
    expr = expr.slice(0, startIdx) +
           `((${numerator.content})/(${denominator.content}))` +
           expr.slice(denominator.endIdx + 1);
  }

  // 处理根号 \sqrt[n]{x}
  maxIterations = 50;
  while (maxIterations-- > 0) {
    const sqrtNMatch = expr.match(/\\sqrt\s*\[([^\]]+)\]\s*\{/);
    if (!sqrtNMatch || sqrtNMatch.index === undefined) break;

    const n = sqrtNMatch[1];
    const startIdx = sqrtNMatch.index;
    const braceStart = startIdx + sqrtNMatch[0].length - 1;

    const content = extractBracedContent(expr, braceStart);
    if (!content) break;

    expr = expr.slice(0, startIdx) +
           `nthRoot(${content.content}, ${n})` +
           expr.slice(content.endIdx + 1);
  }

  // 处理根号 \sqrt{x}
  maxIterations = 50;
  while (maxIterations-- > 0) {
    const sqrtMatch = expr.match(/\\sqrt\s*\{/);
    if (!sqrtMatch || sqrtMatch.index === undefined) break;

    const startIdx = sqrtMatch.index;
    const braceStart = startIdx + sqrtMatch[0].length - 1;

    const content = extractBracedContent(expr, braceStart);
    if (!content) break;

    expr = expr.slice(0, startIdx) +
           `sqrt(${content.content})` +
           expr.slice(content.endIdx + 1);
  }

  // 处理对数 \log_{base}{x}
  maxIterations = 50;
  while (maxIterations-- > 0) {
    const logBaseMatch = expr.match(/\\log\s*_\s*\{([^}]+)\}\s*\{/);
    if (!logBaseMatch || logBaseMatch.index === undefined) break;

    const base = logBaseMatch[1];
    const startIdx = logBaseMatch.index;
    const braceStart = startIdx + logBaseMatch[0].length - 1;

    const content = extractBracedContent(expr, braceStart);
    if (!content) break;

    expr = expr.slice(0, startIdx) +
           `log(${content.content}, ${base})` +
           expr.slice(content.endIdx + 1);
  }

  // 处理对数 \log_{base} x (无括号)
  expr = expr.replace(/\\log\s*_\s*\{([^}]+)\}\s*([a-zA-Z0-9.]+)/g, 'log($2, $1)');
  expr = expr.replace(/\\log\s*_\s*([0-9]+)\s*([a-zA-Z0-9.]+)/g, 'log($2, $1)');

  // 处理带括号参数的函数 - 需要递归处理嵌套内容
  const functionsWithBraces = [
    { latex: '\\sin', fn: 'sin' },
    { latex: '\\cos', fn: 'cos' },
    { latex: '\\tan', fn: 'tan' },
    { latex: '\\cot', fn: 'cot' },
    { latex: '\\sec', fn: 'sec' },
    { latex: '\\csc', fn: 'csc' },
    { latex: '\\arcsin', fn: 'asin' },
    { latex: '\\arccos', fn: 'acos' },
    { latex: '\\arctan', fn: 'atan' },
    { latex: '\\arccot', fn: 'acot' },
    { latex: '\\sinh', fn: 'sinh' },
    { latex: '\\cosh', fn: 'cosh' },
    { latex: '\\tanh', fn: 'tanh' },
    { latex: '\\ln', fn: 'log' },
    { latex: '\\exp', fn: 'exp' },
  ];

  // 处理 \sin^{n}{x} 格式 (指数在参数前面) -> (sin(x))^n
  for (const { latex: latexFn, fn } of functionsWithBraces) {
    const escapedFn = latexFn.replace(/\\/g, '\\\\');
    const regexWithExp = new RegExp(escapedFn + '\\s*\\^\\s*\\{([^}]+)\\}\\s*\\{');

    maxIterations = 50;
    while (maxIterations-- > 0) {
      const match = expr.match(regexWithExp);
      if (!match || match.index === undefined) break;

      const exponent = match[1];
      const startIdx = match.index;
      const braceStart = startIdx + match[0].length - 1;

      const content = extractBracedContent(expr, braceStart);
      if (!content) break;

      expr = expr.slice(0, startIdx) +
             `(${fn}(${content.content}))^(${exponent})` +
             expr.slice(content.endIdx + 1);
    }
  }

  // 处理标准 \sin{x} 格式
  for (const { latex: latexFn, fn } of functionsWithBraces) {
    const escapedFn = latexFn.replace(/\\/g, '\\\\');
    const regex = new RegExp(escapedFn + '\\s*\\{');

    maxIterations = 50;
    while (maxIterations-- > 0) {
      const match = expr.match(regex);
      if (!match || match.index === undefined) break;

      const startIdx = match.index;
      const braceStart = startIdx + match[0].length - 1;

      const content = extractBracedContent(expr, braceStart);
      if (!content) break;

      expr = expr.slice(0, startIdx) +
             `${fn}(${content.content})` +
             expr.slice(content.endIdx + 1);
    }
  }

  // 处理 \log{x} -> log10(x)
  maxIterations = 50;
  while (maxIterations-- > 0) {
    const match = expr.match(/\\log\s*\{/);
    if (!match || match.index === undefined) break;

    const startIdx = match.index;
    const braceStart = startIdx + match[0].length - 1;

    const content = extractBracedContent(expr, braceStart);
    if (!content) break;

    expr = expr.slice(0, startIdx) +
           `(log(${content.content})/log(10))` +
           expr.slice(content.endIdx + 1);
  }

  // 处理指数 ^{...} - 需要递归处理嵌套内容
  maxIterations = 50;
  while (maxIterations-- > 0) {
    const match = expr.match(/\^\s*\{/);
    if (!match || match.index === undefined) break;

    const startIdx = match.index;
    const braceStart = startIdx + match[0].length - 1;

    const content = extractBracedContent(expr, braceStart);
    if (!content) break;

    expr = expr.slice(0, startIdx) +
           `^(${content.content})` +
           expr.slice(content.endIdx + 1);
  }

  // 无括号的三角函数
  expr = expr.replace(/\\sin\b/g, 'sin');
  expr = expr.replace(/\\cos\b/g, 'cos');
  expr = expr.replace(/\\tan\b/g, 'tan');
  expr = expr.replace(/\\cot\b/g, 'cot');
  expr = expr.replace(/\\sec\b/g, 'sec');
  expr = expr.replace(/\\csc\b/g, 'csc');
  expr = expr.replace(/\\arcsin\b/g, 'asin');
  expr = expr.replace(/\\arccos\b/g, 'acos');
  expr = expr.replace(/\\arctan\b/g, 'atan');
  expr = expr.replace(/\\sinh\b/g, 'sinh');
  expr = expr.replace(/\\cosh\b/g, 'cosh');
  expr = expr.replace(/\\tanh\b/g, 'tanh');
  expr = expr.replace(/\\ln\b/g, 'log');
  expr = expr.replace(/\\log\b/g, '(log/log(10))'); // This handles bare \log
  expr = expr.replace(/\\exp\b/g, 'exp');

  // 绝对值
  // 处理 |...| 形式，支持嵌套内容
  maxIterations = 50;
  while (maxIterations-- > 0) {
    const match = expr.match(/\|([^|]*)\|/);
    if (!match || match.index === undefined) break;

    expr = expr.slice(0, match.index) +
           `abs(${match[1]})` +
           expr.slice(match.index + match[0].length);
  }

  expr = expr.replace(/\\lvert\s*([^\\]+)\s*\\rvert/g, 'abs($1)');
  expr = expr.replace(/\\vert\s*([^\\]+)\s*\\vert/g, 'abs($1)');

  // 移除下标（通常是装饰性的）
  expr = expr.replace(/_\{[^}]*\}/g, '');
  expr = expr.replace(/_[a-zA-Z0-9]/g, '');

  // 运算符
  expr = expr.replace(/\\times/g, '*');
  expr = expr.replace(/\\cdot/g, '*');
  expr = expr.replace(/\\div/g, '/');
  expr = expr.replace(/\\pm/g, '+'); // 简化处理，取 +
  expr = expr.replace(/\\mp/g, '-'); // 简化处理，取 -

  // 移除剩余的 LaTeX 命令（如 \, \! 等）
  expr = expr.replace(/\\[a-zA-Z]+/g, '');

  // 移除剩余的花括号
  maxIterations = 50;
  while (maxIterations-- > 0 && expr.includes('{')) {
    const match = expr.match(/\{([^{}]*)\}/);
    if (!match) break;
    expr = expr.replace(/\{([^{}]*)\}/g, '($1)');
  }

  // 处理隐式乘法
  // 数字后跟 ( 或字母
  expr = expr.replace(/(\d)\s*\(/g, '$1*(');
  expr = expr.replace(/\)\s*(\d)/g, ')*$1');
  expr = expr.replace(/\)\s*\(/g, ')*(');
  // pi 后跟 (
  expr = expr.replace(/\(pi\)\s*\(/g, '(pi)*(');
  expr = expr.replace(/\)\s*\(pi\)/g, ')*(pi)');

  // 清理多余空格
  expr = expr.replace(/\s+/g, ' ').trim();

  return expr;
}

/**
 * 解析 LaTeX 表达式为数值
 * @param latex LaTeX 数学表达式
 * @returns 解析结果
 */
export function parseLatexToNumber(latex: string): ParseResult {
  if (!latex || !latex.trim()) {
    return { success: false, error: 'Empty expression' };
  }

  try {
    // 先尝试直接解析为数字（纯数字或简单分数）
    const trimmed = latex.trim().replace(/^\$+|\$+$/g, '');

    // 简单数字
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      return { success: true, value: num, expression: trimmed };
    }

    // 简单分数 a/b
    const simpleFracMatch = trimmed.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (simpleFracMatch) {
      const num = parseInt(simpleFracMatch[1]) / parseInt(simpleFracMatch[2]);
      return { success: true, value: num, expression: trimmed };
    }

    // 转换 LaTeX 为表达式
    const expression = latexToExpression(latex);

    // 使用 mathjs 计算
    const result = evaluate(expression);

    // 检查结果是否为有效数字
    if (typeof result === 'number' && isFinite(result)) {
      return { success: true, value: result, expression };
    }

    // 如果结果是复数或其他类型
    if (result && typeof result.re === 'number' && result.im === 0) {
      return { success: true, value: result.re, expression };
    }

    return { success: false, error: 'Result is not a real number', expression };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Parse error',
    };
  }
}

/**
 * 检查 LaTeX 表达式是否可以解析为数值
 */
export function canParseLatex(latex: string): boolean {
  const result = parseLatexToNumber(latex);
  return result.success;
}

/**
 * 格式化数值结果（保留合理精度）
 */
export function formatNumericResult(value: number): string {
  // 检查是否接近整数
  if (Math.abs(value - Math.round(value)) < 1e-10) {
    return Math.round(value).toString();
  }

  // 检查是否是简单分数
  const fractions = [
    [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5],
    [1, 6], [5, 6], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
    [1, 8], [3, 8], [5, 8], [7, 8], [1, 9], [2, 9], [4, 9], [5, 9], [7, 9], [8, 9],
    [1, 10], [3, 10], [7, 10], [9, 10],
  ];

  for (const [num, den] of fractions) {
    if (Math.abs(value - num / den) < 1e-10) {
      return `${num}/${den}`;
    }
    if (Math.abs(value + num / den) < 1e-10) {
      return `-${num}/${den}`;
    }
  }

  // 检查是否是 π 的倍数
  const piMultiple = value / pi;
  if (Math.abs(piMultiple - Math.round(piMultiple)) < 1e-10) {
    const mult = Math.round(piMultiple);
    if (mult === 1) return 'π';
    if (mult === -1) return '-π';
    return `${mult}π`;
  }

  // 检查是否是 e 的幂
  const lnValue = Math.log(Math.abs(value));
  if (Math.abs(lnValue - Math.round(lnValue)) < 1e-10) {
    const exp = Math.round(lnValue);
    if (exp === 1 && value > 0) return 'e';
    if (exp === 1 && value < 0) return '-e';
  }

  // 保留合理精度
  const precision = 10;
  const formatted = value.toPrecision(precision);
  // 移除尾部的 0
  return parseFloat(formatted).toString();
}

// 示例测试
export const LATEX_PARSE_EXAMPLES = [
  { latex: '\\frac{1}{2}', expected: 0.5 },
  { latex: '\\dfrac{3}{4}', expected: 0.75 },
  { latex: '\\sqrt{4}', expected: 2 },
  { latex: '\\sqrt[3]{8}', expected: 2 },
  { latex: '2^{10}', expected: 1024 },
  { latex: '\\sin{\\frac{\\pi}{6}}', expected: 0.5 },
  { latex: '\\cos{\\pi}', expected: -1 },
  { latex: '\\ln{e}', expected: 1 },
  { latex: '\\log_{10}{100}', expected: 2 },
  { latex: '|{-5}|', expected: 5 },
  { latex: '\\frac{1}{2} + \\frac{1}{3}', expected: 5/6 },
  { latex: '\\sqrt{2} \\times \\sqrt{2}', expected: 2 },
];
