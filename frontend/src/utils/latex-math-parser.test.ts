/**
 * LaTeX 数学表达式解析器测试
 * 运行: npx ts-node src/utils/latex-math-parser.test.ts
 */

import { parseLatexToNumber, formatNumericResult } from './latex-math-parser';

interface TestCase {
  latex: string;
  expected: number;
  description: string;
  tolerance?: number; // 允许的误差范围
}

const testCases: TestCase[] = [
  // ==================== 基础数字 ====================
  { latex: '42', expected: 42, description: '整数' },
  { latex: '-17', expected: -17, description: '负整数' },
  { latex: '3.14159', expected: 3.14159, description: '小数' },
  { latex: '-2.5', expected: -2.5, description: '负小数' },
  { latex: '1e10', expected: 1e10, description: '科学计数法' },
  { latex: '2.5e-3', expected: 0.0025, description: '科学计数法(负指数)' },

  // ==================== 简单分数 ====================
  { latex: '1/2', expected: 0.5, description: '简单分数 1/2' },
  { latex: '3/4', expected: 0.75, description: '简单分数 3/4' },
  { latex: '-1/3', expected: -1/3, description: '负分数', tolerance: 1e-10 },

  // ==================== LaTeX 分数 ====================
  { latex: '\\frac{1}{2}', expected: 0.5, description: '\\frac{1}{2}' },
  { latex: '\\dfrac{3}{4}', expected: 0.75, description: '\\dfrac{3}{4}' },
  { latex: '\\tfrac{2}{5}', expected: 0.4, description: '\\tfrac{2}{5}' },
  { latex: '\\frac{-1}{4}', expected: -0.25, description: '\\frac{-1}{4}' },
  { latex: '\\frac{7}{3}', expected: 7/3, description: '\\frac{7}{3}', tolerance: 1e-10 },
  { latex: '\\frac{22}{7}', expected: 22/7, description: '\\frac{22}{7} (π近似)', tolerance: 1e-10 },

  // ==================== 嵌套分数 ====================
  { latex: '\\frac{1}{\\frac{1}{2}}', expected: 2, description: '嵌套分数 1/(1/2)' },
  { latex: '\\frac{\\frac{1}{2}}{\\frac{1}{4}}', expected: 2, description: '嵌套分数 (1/2)/(1/4)' },
  { latex: '\\frac{1+1}{2}', expected: 1, description: '分子带运算' },
  { latex: '\\frac{6}{2+1}', expected: 2, description: '分母带运算' },

  // ==================== 根号 ====================
  { latex: '\\sqrt{4}', expected: 2, description: '\\sqrt{4}' },
  { latex: '\\sqrt{9}', expected: 3, description: '\\sqrt{9}' },
  { latex: '\\sqrt{2}', expected: Math.sqrt(2), description: '\\sqrt{2}', tolerance: 1e-10 },
  { latex: '\\sqrt{16}', expected: 4, description: '\\sqrt{16}' },
  { latex: '\\sqrt{0.25}', expected: 0.5, description: '\\sqrt{0.25}' },

  // ==================== n次根 ====================
  { latex: '\\sqrt[3]{8}', expected: 2, description: '\\sqrt[3]{8} 立方根' },
  { latex: '\\sqrt[3]{27}', expected: 3, description: '\\sqrt[3]{27}' },
  { latex: '\\sqrt[4]{16}', expected: 2, description: '\\sqrt[4]{16} 四次根' },
  { latex: '\\sqrt[5]{32}', expected: 2, description: '\\sqrt[5]{32} 五次根' },

  // ==================== 指数 ====================
  { latex: '2^{3}', expected: 8, description: '2^3' },
  { latex: '2^{10}', expected: 1024, description: '2^{10}' },
  { latex: '3^{4}', expected: 81, description: '3^4' },
  { latex: '10^{-2}', expected: 0.01, description: '10^{-2}' },
  { latex: '2^{0}', expected: 1, description: '2^0' },
  { latex: '(-2)^{3}', expected: -8, description: '(-2)^3' },
  { latex: '4^{0.5}', expected: 2, description: '4^{0.5} = √4' },

  // ==================== 常量 ====================
  { latex: '\\pi', expected: Math.PI, description: '\\pi', tolerance: 1e-10 },
  { latex: '2\\pi', expected: 2 * Math.PI, description: '2π', tolerance: 1e-10 },
  { latex: '\\frac{\\pi}{2}', expected: Math.PI / 2, description: 'π/2', tolerance: 1e-10 },
  { latex: '\\frac{\\pi}{4}', expected: Math.PI / 4, description: 'π/4', tolerance: 1e-10 },

  // ==================== 三角函数 ====================
  { latex: '\\sin{0}', expected: 0, description: 'sin(0)' },
  { latex: '\\cos{0}', expected: 1, description: 'cos(0)' },
  { latex: '\\sin{\\frac{\\pi}{6}}', expected: 0.5, description: 'sin(π/6) = 1/2', tolerance: 1e-10 },
  { latex: '\\sin{\\frac{\\pi}{4}}', expected: Math.sqrt(2)/2, description: 'sin(π/4) = √2/2', tolerance: 1e-10 },
  { latex: '\\sin{\\frac{\\pi}{3}}', expected: Math.sqrt(3)/2, description: 'sin(π/3) = √3/2', tolerance: 1e-10 },
  { latex: '\\sin{\\frac{\\pi}{2}}', expected: 1, description: 'sin(π/2) = 1', tolerance: 1e-10 },
  { latex: '\\cos{\\pi}', expected: -1, description: 'cos(π) = -1', tolerance: 1e-10 },
  { latex: '\\cos{\\frac{\\pi}{3}}', expected: 0.5, description: 'cos(π/3) = 1/2', tolerance: 1e-10 },
  { latex: '\\tan{\\frac{\\pi}{4}}', expected: 1, description: 'tan(π/4) = 1', tolerance: 1e-10 },

  // ==================== 反三角函数 ====================
  { latex: '\\arcsin{0.5}', expected: Math.PI/6, description: 'arcsin(0.5) = π/6', tolerance: 1e-10 },
  { latex: '\\arccos{0.5}', expected: Math.PI/3, description: 'arccos(0.5) = π/3', tolerance: 1e-10 },
  { latex: '\\arctan{1}', expected: Math.PI/4, description: 'arctan(1) = π/4', tolerance: 1e-10 },

  // ==================== 对数 ====================
  { latex: '\\ln{1}', expected: 0, description: 'ln(1) = 0' },
  { latex: '\\log{10}', expected: 1, description: 'log10(10) = 1' },
  { latex: '\\log{100}', expected: 2, description: 'log10(100) = 2' },
  { latex: '\\log_{2}{8}', expected: 3, description: 'log2(8) = 3' },
  { latex: '\\log_{2}{16}', expected: 4, description: 'log2(16) = 4' },
  { latex: '\\log_{3}{27}', expected: 3, description: 'log3(27) = 3' },

  // ==================== 绝对值 ====================
  { latex: '|-5|', expected: 5, description: '|-5|' },
  { latex: '|3.14|', expected: 3.14, description: '|3.14|' },
  { latex: '|-\\frac{1}{2}|', expected: 0.5, description: '|-1/2|' },

  // ==================== 复合运算 ====================
  { latex: '1+1', expected: 2, description: '1+1' },
  { latex: '10-3', expected: 7, description: '10-3' },
  { latex: '4 \\times 5', expected: 20, description: '4×5' },
  { latex: '20 \\div 4', expected: 5, description: '20÷4' },
  { latex: '2 \\cdot 3', expected: 6, description: '2·3' },
  { latex: '\\frac{1}{2}+\\frac{1}{3}', expected: 5/6, description: '1/2 + 1/3', tolerance: 1e-10 },
  { latex: '\\frac{1}{2}+\\frac{1}{4}', expected: 0.75, description: '1/2 + 1/4' },
  { latex: '\\frac{3}{4}-\\frac{1}{4}', expected: 0.5, description: '3/4 - 1/4' },
  { latex: '\\frac{1}{2} \\times \\frac{2}{3}', expected: 1/3, description: '1/2 × 2/3', tolerance: 1e-10 },
  { latex: '\\frac{1}{2} \\div \\frac{1}{4}', expected: 2, description: '1/2 ÷ 1/4' },

  // ==================== 复杂嵌套表达式 ====================
  { latex: '\\sqrt{\\frac{1}{4}}', expected: 0.5, description: '√(1/4)' },
  { latex: '\\frac{\\sqrt{2}}{2}', expected: Math.sqrt(2)/2, description: '√2/2', tolerance: 1e-10 },
  { latex: '\\sqrt{2} \\times \\sqrt{2}', expected: 2, description: '√2 × √2', tolerance: 1e-10 },
  { latex: '\\sqrt{3}^{2}', expected: 3, description: '(√3)²', tolerance: 1e-10 },
  { latex: '2^{\\frac{1}{2}}', expected: Math.sqrt(2), description: '2^(1/2) = √2', tolerance: 1e-10 },
  { latex: '8^{\\frac{1}{3}}', expected: 2, description: '8^(1/3) = ∛8', tolerance: 1e-10 },
  { latex: '\\sin{\\frac{\\pi}{6}}^{2}', expected: 0.25, description: 'sin²(π/6) = 1/4', tolerance: 1e-10 },
  { latex: '\\sin^{2}{\\frac{\\pi}{6}}+\\cos^{2}{\\frac{\\pi}{6}}', expected: 1, description: 'sin²+cos²=1', tolerance: 1e-10 },

  // ==================== 积分/微分相关常见结果 ====================
  { latex: '\\frac{1}{\\sqrt{2}}', expected: 1/Math.sqrt(2), description: '1/√2', tolerance: 1e-10 },
  { latex: '\\frac{\\sqrt{3}}{2}', expected: Math.sqrt(3)/2, description: '√3/2', tolerance: 1e-10 },
  { latex: '\\frac{\\sqrt{2}}{2}', expected: Math.sqrt(2)/2, description: '√2/2', tolerance: 1e-10 },
  { latex: '\\frac{1}{\\sqrt{3}}', expected: 1/Math.sqrt(3), description: '1/√3', tolerance: 1e-10 },

  // ==================== 带 displaystyle 的表达式 ====================
  { latex: '$\\displaystyle\\frac{1}{2}$', expected: 0.5, description: 'displaystyle 1/2' },
  // 注意：积分和求和需要符号计算，暂不支持
  // { latex: '$\\displaystyle\\int_0^1 x dx$', expected: 0.5, description: '积分公式结果' },
  // { latex: '\\displaystyle\\sum_{i=1}^{10} i', expected: 55, description: '求和 1+2+...+10' },

  // ==================== 实际比赛题目答案 ====================
  { latex: '\\frac{1+\\sqrt{5}}{2}', expected: (1+Math.sqrt(5))/2, description: '黄金比例 φ', tolerance: 1e-10 },
  { latex: '\\sqrt{2+\\sqrt{3}}', expected: Math.sqrt(2+Math.sqrt(3)), description: '嵌套根号', tolerance: 1e-10 },
  { latex: '\\frac{\\pi^{2}}{6}', expected: Math.PI*Math.PI/6, description: 'π²/6 (Basel问题)', tolerance: 1e-10 },
  { latex: '\\ln{2}', expected: Math.log(2), description: 'ln(2)', tolerance: 1e-10 },
  { latex: '\\frac{1}{1+\\frac{1}{2}}', expected: 2/3, description: '连分数 1/(1+1/2)', tolerance: 1e-10 },

  // ==================== 边界情况 ====================
  { latex: '0', expected: 0, description: '零' },
  { latex: '1', expected: 1, description: '一' },
  { latex: '-1', expected: -1, description: '负一' },
  { latex: '\\frac{0}{5}', expected: 0, description: '0/5 = 0' },
  { latex: '\\sqrt{0}', expected: 0, description: '√0 = 0' },
  { latex: '0^{5}', expected: 0, description: '0^5 = 0' },
  { latex: '1^{100}', expected: 1, description: '1^100 = 1' },
];

// 运行测试
function runTests() {
  console.log('='.repeat(70));
  console.log('LaTeX 数学表达式解析器测试');
  console.log('='.repeat(70));
  console.log('');

  let passed = 0;
  let failed = 0;
  const failures: { test: TestCase; result: ReturnType<typeof parseLatexToNumber> }[] = [];

  for (const test of testCases) {
    const result = parseLatexToNumber(test.latex);
    const tolerance = test.tolerance || 1e-9;

    let isPass = false;
    if (result.success && result.value !== undefined) {
      isPass = Math.abs(result.value - test.expected) < tolerance;
    }

    if (isPass) {
      passed++;
      console.log(`✓ ${test.description}`);
      console.log(`  输入: ${test.latex}`);
      console.log(`  结果: ${result.value} (期望: ${test.expected})`);
      if (result.value !== undefined) {
        console.log(`  格式化: ${formatNumericResult(result.value)}`);
      }
    } else {
      failed++;
      failures.push({ test, result });
      console.log(`✗ ${test.description}`);
      console.log(`  输入: ${test.latex}`);
      if (result.success) {
        console.log(`  结果: ${result.value} (期望: ${test.expected})`);
      } else {
        console.log(`  错误: ${result.error}`);
        if (result.expression) {
          console.log(`  转换表达式: ${result.expression}`);
        }
      }
    }
    console.log('');
  }

  console.log('='.repeat(70));
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
  console.log('='.repeat(70));

  if (failures.length > 0) {
    console.log('\n失败的测试:');
    for (const { test, result } of failures) {
      console.log(`  - ${test.description}: ${test.latex}`);
      if (result.expression) {
        console.log(`    转换: ${result.expression}`);
      }
      console.log(`    错误: ${result.error || '结果不匹配'}`);
    }
  }

  return { passed, failed, total: testCases.length };
}

// 如果直接运行此文件
runTests();
