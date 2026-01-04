import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPREHENSIVE LATEX COMMAND LIBRARY
// ============================================================================

interface LaTeXCommand {
  command: string;
  description: string;
  category: string;
  template?: string; // Template with | marking cursor position
}

const LATEX_COMMANDS: LaTeXCommand[] = [
  // ==================== GREEK LETTERS (LOWERCASE) ====================
  { command: '\\alpha', description: 'α', category: 'Greek' },
  { command: '\\beta', description: 'β', category: 'Greek' },
  { command: '\\gamma', description: 'γ', category: 'Greek' },
  { command: '\\delta', description: 'δ', category: 'Greek' },
  { command: '\\epsilon', description: 'ε', category: 'Greek' },
  { command: '\\varepsilon', description: 'ε (variant)', category: 'Greek' },
  { command: '\\zeta', description: 'ζ', category: 'Greek' },
  { command: '\\eta', description: 'η', category: 'Greek' },
  { command: '\\theta', description: 'θ', category: 'Greek' },
  { command: '\\vartheta', description: 'ϑ (variant)', category: 'Greek' },
  { command: '\\iota', description: 'ι', category: 'Greek' },
  { command: '\\kappa', description: 'κ', category: 'Greek' },
  { command: '\\lambda', description: 'λ', category: 'Greek' },
  { command: '\\mu', description: 'μ', category: 'Greek' },
  { command: '\\nu', description: 'ν', category: 'Greek' },
  { command: '\\xi', description: 'ξ', category: 'Greek' },
  { command: '\\omicron', description: 'ο', category: 'Greek' },
  { command: '\\pi', description: 'π', category: 'Greek' },
  { command: '\\varpi', description: 'ϖ (variant)', category: 'Greek' },
  { command: '\\rho', description: 'ρ', category: 'Greek' },
  { command: '\\varrho', description: 'ϱ (variant)', category: 'Greek' },
  { command: '\\sigma', description: 'σ', category: 'Greek' },
  { command: '\\varsigma', description: 'ς (final)', category: 'Greek' },
  { command: '\\tau', description: 'τ', category: 'Greek' },
  { command: '\\upsilon', description: 'υ', category: 'Greek' },
  { command: '\\phi', description: 'ϕ', category: 'Greek' },
  { command: '\\varphi', description: 'φ (variant)', category: 'Greek' },
  { command: '\\chi', description: 'χ', category: 'Greek' },
  { command: '\\psi', description: 'ψ', category: 'Greek' },
  { command: '\\omega', description: 'ω', category: 'Greek' },

  // ==================== GREEK LETTERS (UPPERCASE) ====================
  { command: '\\Gamma', description: 'Γ', category: 'Greek' },
  { command: '\\Delta', description: 'Δ', category: 'Greek' },
  { command: '\\Theta', description: 'Θ', category: 'Greek' },
  { command: '\\Lambda', description: 'Λ', category: 'Greek' },
  { command: '\\Xi', description: 'Ξ', category: 'Greek' },
  { command: '\\Pi', description: 'Π', category: 'Greek' },
  { command: '\\Sigma', description: 'Σ', category: 'Greek' },
  { command: '\\Upsilon', description: 'Υ', category: 'Greek' },
  { command: '\\Phi', description: 'Φ', category: 'Greek' },
  { command: '\\Psi', description: 'Ψ', category: 'Greek' },
  { command: '\\Omega', description: 'Ω', category: 'Greek' },

  // ==================== FRACTIONS & ROOTS ====================
  { command: '\\frac', description: '分数 a/b', category: 'Fraction', template: '\\frac{|}{}'  },
  { command: '\\dfrac', description: '大分数 (display)', category: 'Fraction', template: '\\dfrac{|}{}'  },
  { command: '\\tfrac', description: '小分数 (text)', category: 'Fraction', template: '\\tfrac{|}{}'  },
  { command: '\\cfrac', description: '连分数', category: 'Fraction', template: '\\cfrac{|}{}'  },
  { command: '\\sqrt', description: '平方根 √', category: 'Root', template: '\\sqrt{|}'  },
  { command: '\\sqrt[n]', description: 'n次根 ⁿ√', category: 'Root', template: '\\sqrt[|]{}'  },
  { command: '\\cbrt', description: '立方根 ∛', category: 'Root', template: '\\sqrt[3]{|}'  },

  // ==================== SUMMATION & PRODUCTS (with displaystyle) ====================
  { command: '\\sum', description: '求和 ∑', category: 'BigOp', template: '\\displaystyle\\sum |' },
  { command: '\\sum_{}^{}', description: '带上下限求和', category: 'BigOp', template: '\\displaystyle\\sum_{|}^{}'  },
  { command: '\\sum_{i=1}^{n}', description: '求和 i=1到n', category: 'BigOp', template: '\\displaystyle\\sum_{i=1}^{n} |'  },
  { command: '\\sum_{i=0}^{\\infty}', description: '无穷级数', category: 'BigOp', template: '\\displaystyle\\sum_{i=0}^{\\infty} |'  },
  { command: '\\prod', description: '求积 ∏', category: 'BigOp', template: '\\displaystyle\\prod |' },
  { command: '\\prod_{}^{}', description: '带上下限求积', category: 'BigOp', template: '\\displaystyle\\prod_{|}^{}'  },
  { command: '\\prod_{i=1}^{n}', description: '求积 i=1到n', category: 'BigOp', template: '\\displaystyle\\prod_{i=1}^{n} |'  },
  { command: '\\coprod', description: '余积 ∐', category: 'BigOp', template: '\\displaystyle\\coprod |' },

  // ==================== INTEGRALS (with displaystyle for proper rendering) ====================
  { command: '\\int', description: '积分 ∫', category: 'Integral', template: '\\displaystyle\\int |' },
  { command: '\\int_{}^{}', description: '定积分', category: 'Integral', template: '\\displaystyle\\int_{|}^{}'  },
  { command: '\\int_0^1', description: '0到1积分', category: 'Integral', template: '\\displaystyle\\int_0^1 |'  },
  { command: '\\int_0^\\infty', description: '0到∞积分', category: 'Integral', template: '\\displaystyle\\int_0^\\infty |'  },
  { command: '\\int_{-\\infty}^{\\infty}', description: '-∞到∞积分', category: 'Integral', template: '\\displaystyle\\int_{-\\infty}^{\\infty} |'  },
  { command: '\\int_a^b', description: 'a到b积分', category: 'Integral', template: '\\displaystyle\\int_a^b |'  },
  { command: '\\iint', description: '二重积分 ∬', category: 'Integral', template: '\\displaystyle\\iint |' },
  { command: '\\iiint', description: '三重积分 ∭', category: 'Integral', template: '\\displaystyle\\iiint |' },
  { command: '\\oint', description: '曲线积分 ∮', category: 'Integral', template: '\\displaystyle\\oint |' },
  { command: '\\oiint', description: '曲面积分 ∯', category: 'Integral', template: '\\displaystyle\\oiint |' },

  // ==================== LIMITS & CALCULUS ====================
  { command: '\\lim', description: '极限', category: 'Calculus' },
  { command: '\\lim_{}', description: '带下标极限', category: 'Calculus', template: '\\lim_{|}'  },
  { command: '\\lim_{x \\to }', description: 'x趋向于', category: 'Calculus', template: '\\lim_{x \\to |}'  },
  { command: '\\lim_{x \\to 0}', description: 'x→0', category: 'Calculus', template: '\\lim_{x \\to 0} |'  },
  { command: '\\lim_{x \\to \\infty}', description: 'x→∞', category: 'Calculus', template: '\\lim_{x \\to \\infty} |'  },
  { command: '\\lim_{n \\to \\infty}', description: 'n→∞', category: 'Calculus', template: '\\lim_{n \\to \\infty} |'  },
  { command: '\\infty', description: '无穷 ∞', category: 'Calculus' },
  { command: '\\partial', description: '偏导数 ∂', category: 'Calculus' },
  { command: '\\nabla', description: 'nabla ∇', category: 'Calculus' },
  { command: '\\mathrm{d}', description: '微分d', category: 'Calculus' },
  { command: "\\frac{\\mathrm{d}}{\\mathrm{d}x}", description: 'd/dx 导数', category: 'Calculus', template: "\\frac{\\mathrm{d}}{\\mathrm{d}x}|"  },
  { command: "\\frac{\\partial}{\\partial x}", description: '∂/∂x 偏导', category: 'Calculus', template: "\\frac{\\partial}{\\partial x}|"  },

  // ==================== TRIGONOMETRIC ====================
  { command: '\\sin', description: '正弦 sin', category: 'Trig' },
  { command: '\\cos', description: '余弦 cos', category: 'Trig' },
  { command: '\\tan', description: '正切 tan', category: 'Trig' },
  { command: '\\cot', description: '余切 cot', category: 'Trig' },
  { command: '\\sec', description: '正割 sec', category: 'Trig' },
  { command: '\\csc', description: '余割 csc', category: 'Trig' },
  { command: '\\arcsin', description: '反正弦', category: 'Trig' },
  { command: '\\arccos', description: '反余弦', category: 'Trig' },
  { command: '\\arctan', description: '反正切', category: 'Trig' },
  { command: '\\sinh', description: '双曲正弦', category: 'Trig' },
  { command: '\\cosh', description: '双曲余弦', category: 'Trig' },
  { command: '\\tanh', description: '双曲正切', category: 'Trig' },
  { command: '\\coth', description: '双曲余切', category: 'Trig' },

  // ==================== LOGARITHMS & EXPONENTIALS ====================
  { command: '\\ln', description: '自然对数 ln', category: 'Log' },
  { command: '\\log', description: '对数 log', category: 'Log' },
  { command: '\\log_{}', description: '带底对数', category: 'Log', template: '\\log_{|}' },
  { command: '\\log_{10}', description: '常用对数', category: 'Log' },
  { command: '\\lg', description: '常用对数 lg', category: 'Log' },
  { command: '\\exp', description: '指数 exp', category: 'Log' },
  { command: 'e^{}', description: 'e的幂', category: 'Log', template: 'e^{|}' },
  { command: 'e^{i\\pi}', description: '欧拉公式', category: 'Log' },

  // ==================== RELATIONS ====================
  { command: '\\leq', description: '小于等于 ≤', category: 'Relation' },
  { command: '\\geq', description: '大于等于 ≥', category: 'Relation' },
  { command: '\\neq', description: '不等于 ≠', category: 'Relation' },
  { command: '\\approx', description: '约等于 ≈', category: 'Relation' },
  { command: '\\equiv', description: '恒等于 ≡', category: 'Relation' },
  { command: '\\sim', description: '相似 ~', category: 'Relation' },
  { command: '\\simeq', description: '近似等于 ≃', category: 'Relation' },
  { command: '\\cong', description: '全等 ≅', category: 'Relation' },
  { command: '\\propto', description: '正比于 ∝', category: 'Relation' },
  { command: '\\ll', description: '远小于 ≪', category: 'Relation' },
  { command: '\\gg', description: '远大于 ≫', category: 'Relation' },
  { command: '\\prec', description: '先于 ≺', category: 'Relation' },
  { command: '\\succ', description: '后于 ≻', category: 'Relation' },
  { command: '\\preceq', description: '先于等于 ⪯', category: 'Relation' },
  { command: '\\succeq', description: '后于等于 ⪰', category: 'Relation' },
  { command: '\\perp', description: '垂直 ⊥', category: 'Relation' },
  { command: '\\parallel', description: '平行 ∥', category: 'Relation' },
  { command: '\\mid', description: '整除 ∣', category: 'Relation' },
  { command: '\\nmid', description: '不整除 ∤', category: 'Relation' },

  // ==================== SET THEORY ====================
  { command: '\\in', description: '属于 ∈', category: 'Set' },
  { command: '\\notin', description: '不属于 ∉', category: 'Set' },
  { command: '\\ni', description: '包含元素 ∋', category: 'Set' },
  { command: '\\subset', description: '真子集 ⊂', category: 'Set' },
  { command: '\\supset', description: '真超集 ⊃', category: 'Set' },
  { command: '\\subseteq', description: '子集 ⊆', category: 'Set' },
  { command: '\\supseteq', description: '超集 ⊇', category: 'Set' },
  { command: '\\subsetneq', description: '真子集 ⊊', category: 'Set' },
  { command: '\\supsetneq', description: '真超集 ⊋', category: 'Set' },
  { command: '\\cup', description: '并集 ∪', category: 'Set' },
  { command: '\\cap', description: '交集 ∩', category: 'Set' },
  { command: '\\bigcup', description: '大并集 ⋃', category: 'Set' },
  { command: '\\bigcap', description: '大交集 ⋂', category: 'Set' },
  { command: '\\setminus', description: '差集 ∖', category: 'Set' },
  { command: '\\emptyset', description: '空集 ∅', category: 'Set' },
  { command: '\\varnothing', description: '空集 ∅', category: 'Set' },

  // ==================== NUMBER SETS ====================
  { command: '\\mathbb{N}', description: '自然数 ℕ', category: 'Set' },
  { command: '\\mathbb{Z}', description: '整数 ℤ', category: 'Set' },
  { command: '\\mathbb{Q}', description: '有理数 ℚ', category: 'Set' },
  { command: '\\mathbb{R}', description: '实数 ℝ', category: 'Set' },
  { command: '\\mathbb{C}', description: '复数 ℂ', category: 'Set' },
  { command: '\\mathbb{P}', description: '素数 ℙ', category: 'Set' },

  // ==================== LOGIC ====================
  { command: '\\forall', description: '任意 ∀', category: 'Logic' },
  { command: '\\exists', description: '存在 ∃', category: 'Logic' },
  { command: '\\nexists', description: '不存在 ∄', category: 'Logic' },
  { command: '\\neg', description: '非 ¬', category: 'Logic' },
  { command: '\\lnot', description: '非 ¬', category: 'Logic' },
  { command: '\\land', description: '与 ∧', category: 'Logic' },
  { command: '\\lor', description: '或 ∨', category: 'Logic' },
  { command: '\\implies', description: '蕴含 ⟹', category: 'Logic' },
  { command: '\\iff', description: '当且仅当 ⟺', category: 'Logic' },
  { command: '\\therefore', description: '所以 ∴', category: 'Logic' },
  { command: '\\because', description: '因为 ∵', category: 'Logic' },

  // ==================== ARROWS ====================
  { command: '\\to', description: '→', category: 'Arrow' },
  { command: '\\rightarrow', description: '右箭头 →', category: 'Arrow' },
  { command: '\\leftarrow', description: '左箭头 ←', category: 'Arrow' },
  { command: '\\leftrightarrow', description: '双向箭头 ↔', category: 'Arrow' },
  { command: '\\Rightarrow', description: '双线右箭头 ⇒', category: 'Arrow' },
  { command: '\\Leftarrow', description: '双线左箭头 ⇐', category: 'Arrow' },
  { command: '\\Leftrightarrow', description: '双线双向 ⇔', category: 'Arrow' },
  { command: '\\mapsto', description: '映射 ↦', category: 'Arrow' },
  { command: '\\longmapsto', description: '长映射 ⟼', category: 'Arrow' },
  { command: '\\uparrow', description: '上箭头 ↑', category: 'Arrow' },
  { command: '\\downarrow', description: '下箭头 ↓', category: 'Arrow' },
  { command: '\\updownarrow', description: '上下箭头 ↕', category: 'Arrow' },
  { command: '\\nearrow', description: '右上箭头 ↗', category: 'Arrow' },
  { command: '\\searrow', description: '右下箭头 ↘', category: 'Arrow' },
  { command: '\\swarrow', description: '左下箭头 ↙', category: 'Arrow' },
  { command: '\\nwarrow', description: '左上箭头 ↖', category: 'Arrow' },
  { command: '\\hookrightarrow', description: '钩右箭头 ↪', category: 'Arrow' },
  { command: '\\hookleftarrow', description: '钩左箭头 ↩', category: 'Arrow' },
  { command: '\\rightharpoonup', description: '右半箭头上 ⇀', category: 'Arrow' },
  { command: '\\rightharpoondown', description: '右半箭头下 ⇁', category: 'Arrow' },
  { command: '\\xrightarrow{}', description: '带文字右箭头', category: 'Arrow', template: '\\xrightarrow{|}'  },
  { command: '\\xleftarrow{}', description: '带文字左箭头', category: 'Arrow', template: '\\xleftarrow{|}'  },

  // ==================== OPERATORS ====================
  { command: '\\times', description: '乘 ×', category: 'Operator' },
  { command: '\\div', description: '除 ÷', category: 'Operator' },
  { command: '\\cdot', description: '点乘 ·', category: 'Operator' },
  { command: '\\ast', description: '星号 ∗', category: 'Operator' },
  { command: '\\star', description: '五角星 ⋆', category: 'Operator' },
  { command: '\\circ', description: '圆圈 ∘', category: 'Operator' },
  { command: '\\bullet', description: '实心圆 •', category: 'Operator' },
  { command: '\\pm', description: '正负 ±', category: 'Operator' },
  { command: '\\mp', description: '负正 ∓', category: 'Operator' },
  { command: '\\oplus', description: '圆加 ⊕', category: 'Operator' },
  { command: '\\ominus', description: '圆减 ⊖', category: 'Operator' },
  { command: '\\otimes', description: '圆乘 ⊗', category: 'Operator' },
  { command: '\\odot', description: '圆点 ⊙', category: 'Operator' },
  { command: '\\oslash', description: '圆斜 ⊘', category: 'Operator' },

  // ==================== DOTS ====================
  { command: '\\cdots', description: '水平居中点 ⋯', category: 'Dots' },
  { command: '\\ldots', description: '水平底部点 …', category: 'Dots' },
  { command: '\\vdots', description: '垂直点 ⋮', category: 'Dots' },
  { command: '\\ddots', description: '对角点 ⋱', category: 'Dots' },

  // ==================== ACCENTS & DECORATIONS ====================
  { command: '\\hat{}', description: '帽子 ^', category: 'Accent', template: '\\hat{|}'  },
  { command: '\\widehat{}', description: '宽帽子', category: 'Accent', template: '\\widehat{|}'  },
  { command: '\\bar{}', description: '横线', category: 'Accent', template: '\\bar{|}'  },
  { command: '\\overline{}', description: '上划线', category: 'Accent', template: '\\overline{|}'  },
  { command: '\\underline{}', description: '下划线', category: 'Accent', template: '\\underline{|}'  },
  { command: '\\vec{}', description: '向量箭头', category: 'Accent', template: '\\vec{|}'  },
  { command: '\\overrightarrow{}', description: '长向量箭头', category: 'Accent', template: '\\overrightarrow{|}'  },
  { command: '\\overleftarrow{}', description: '左向量箭头', category: 'Accent', template: '\\overleftarrow{|}'  },
  { command: '\\dot{}', description: '一点', category: 'Accent', template: '\\dot{|}'  },
  { command: '\\ddot{}', description: '两点', category: 'Accent', template: '\\ddot{|}'  },
  { command: '\\dddot{}', description: '三点', category: 'Accent', template: '\\dddot{|}'  },
  { command: '\\tilde{}', description: '波浪', category: 'Accent', template: '\\tilde{|}'  },
  { command: '\\widetilde{}', description: '宽波浪', category: 'Accent', template: '\\widetilde{|}'  },
  { command: '\\check{}', description: '勾', category: 'Accent', template: '\\check{|}'  },
  { command: '\\breve{}', description: '短音符', category: 'Accent', template: '\\breve{|}'  },
  { command: '\\acute{}', description: '锐音符', category: 'Accent', template: '\\acute{|}'  },
  { command: '\\grave{}', description: '重音符', category: 'Accent', template: '\\grave{|}'  },
  { command: '\\overbrace{}', description: '上括号', category: 'Accent', template: '\\overbrace{|}'  },
  { command: '\\underbrace{}', description: '下括号', category: 'Accent', template: '\\underbrace{|}'  },
  { command: '\\boxed{}', description: '方框', category: 'Accent', template: '\\boxed{|}'  },
  { command: '\\cancel{}', description: '删除线', category: 'Accent', template: '\\cancel{|}'  },

  // ==================== BRACKETS ====================
  { command: '\\left(\\right)', description: '自适应圆括号', category: 'Bracket', template: '\\left(|\\right)'  },
  { command: '\\left[\\right]', description: '自适应方括号', category: 'Bracket', template: '\\left[|\\right]'  },
  { command: '\\left\\{\\right\\}', description: '自适应花括号', category: 'Bracket', template: '\\left\\{|\\right\\}'  },
  { command: '\\left|\\right|', description: '自适应绝对值', category: 'Bracket', template: '\\left||\\right|'  },
  { command: '\\left\\|\\right\\|', description: '自适应范数', category: 'Bracket', template: '\\left\\||\\right\\|'  },
  { command: '\\langle\\rangle', description: '尖括号 ⟨⟩', category: 'Bracket', template: '\\langle |\\rangle'  },
  { command: '\\lceil\\rceil', description: '上取整 ⌈⌉', category: 'Bracket', template: '\\lceil |\\rceil'  },
  { command: '\\lfloor\\rfloor', description: '下取整 ⌊⌋', category: 'Bracket', template: '\\lfloor |\\rfloor'  },
  { command: '\\binom{}{}', description: '二项式系数', category: 'Bracket', template: '\\binom{|}{}'  },
  { command: '\\dbinom{}{}', description: '大二项式系数', category: 'Bracket', template: '\\dbinom{|}{}'  },

  // ==================== FONT STYLES ====================
  { command: '\\text{}', description: '普通文本', category: 'Font', template: '\\text{|}'  },
  { command: '\\textbf{}', description: '粗体文本', category: 'Font', template: '\\textbf{|}'  },
  { command: '\\textit{}', description: '斜体文本', category: 'Font', template: '\\textit{|}'  },
  { command: '\\mathbf{}', description: '粗体数学', category: 'Font', template: '\\mathbf{|}'  },
  { command: '\\mathit{}', description: '斜体数学', category: 'Font', template: '\\mathit{|}'  },
  { command: '\\mathrm{}', description: '正体数学', category: 'Font', template: '\\mathrm{|}'  },
  { command: '\\mathsf{}', description: '无衬线数学', category: 'Font', template: '\\mathsf{|}'  },
  { command: '\\mathtt{}', description: '打字机数学', category: 'Font', template: '\\mathtt{|}'  },
  { command: '\\mathcal{}', description: '花体 𝒜', category: 'Font', template: '\\mathcal{|}'  },
  { command: '\\mathfrak{}', description: '哥特体 𝔄', category: 'Font', template: '\\mathfrak{|}'  },
  { command: '\\mathbb{}', description: '黑板粗体 𝔸', category: 'Font', template: '\\mathbb{|}'  },
  { command: '\\mathscr{}', description: '手写体', category: 'Font', template: '\\mathscr{|}'  },
  { command: '\\boldsymbol{}', description: '粗斜体', category: 'Font', template: '\\boldsymbol{|}'  },

  // ==================== MATRICES ====================
  { command: '\\begin{matrix}', description: '无边框矩阵', category: 'Matrix', template: '\\begin{matrix}\n|\n\\end{matrix}'  },
  { command: '\\begin{pmatrix}', description: '圆括号矩阵', category: 'Matrix', template: '\\begin{pmatrix}\n|\n\\end{pmatrix}'  },
  { command: '\\begin{bmatrix}', description: '方括号矩阵', category: 'Matrix', template: '\\begin{bmatrix}\n|\n\\end{bmatrix}'  },
  { command: '\\begin{vmatrix}', description: '行列式矩阵', category: 'Matrix', template: '\\begin{vmatrix}\n|\n\\end{vmatrix}'  },
  { command: '\\begin{Vmatrix}', description: '双竖线矩阵', category: 'Matrix', template: '\\begin{Vmatrix}\n|\n\\end{Vmatrix}'  },
  { command: '\\begin{Bmatrix}', description: '花括号矩阵', category: 'Matrix', template: '\\begin{Bmatrix}\n|\n\\end{Bmatrix}'  },
  { command: '\\begin{cases}', description: '分段函数', category: 'Matrix', template: '\\begin{cases}\n| & \\text{if } \\\\\n & \\text{otherwise}\n\\end{cases}'  },
  { command: '\\begin{aligned}', description: '对齐环境', category: 'Matrix', template: '\\begin{aligned}\n|\n\\end{aligned}'  },
  { command: '\\begin{array}', description: '数组环境', category: 'Matrix', template: '\\begin{array}{|}\n\n\\end{array}'  },

  // ==================== FUNCTIONS ====================
  { command: '\\max', description: '最大值', category: 'Function' },
  { command: '\\min', description: '最小值', category: 'Function' },
  { command: '\\sup', description: '上确界', category: 'Function' },
  { command: '\\inf', description: '下确界', category: 'Function' },
  { command: '\\arg', description: '幅角', category: 'Function' },
  { command: '\\det', description: '行列式', category: 'Function' },
  { command: '\\dim', description: '维数', category: 'Function' },
  { command: '\\ker', description: '核', category: 'Function' },
  { command: '\\hom', description: '同态', category: 'Function' },
  { command: '\\deg', description: '次数', category: 'Function' },
  { command: '\\gcd', description: '最大公约数', category: 'Function' },
  { command: '\\lcm', description: '最小公倍数', category: 'Function' },
  { command: '\\mod', description: '取模', category: 'Function' },
  { command: '\\bmod', description: '取模(二元)', category: 'Function' },
  { command: '\\pmod{}', description: '模运算', category: 'Function', template: '\\pmod{|}'  },
  { command: '\\Pr', description: '概率', category: 'Function' },

  // ==================== SUPERSCRIPT & SUBSCRIPT ====================
  { command: '^{}', description: '上标', category: 'Script', template: '^{|}'  },
  { command: '_{}', description: '下标', category: 'Script', template: '_{|}'  },
  { command: '^{}_{}', description: '上下标', category: 'Script', template: '^{|}_{}'  },
  { command: "x'", description: '导数符号 x′', category: 'Script' },
  { command: "x''", description: '二阶导数 x″', category: 'Script' },
  { command: 'x^2', description: 'x平方', category: 'Script' },
  { command: 'x^3', description: 'x立方', category: 'Script' },
  { command: 'x^n', description: 'x的n次方', category: 'Script' },
  { command: 'x_i', description: 'x下标i', category: 'Script' },
  { command: 'x_{ij}', description: 'x下标ij', category: 'Script' },
  { command: 'a_1, a_2, \\ldots, a_n', description: '数列', category: 'Script' },

  // ==================== MISC SYMBOLS ====================
  { command: '\\angle', description: '角 ∠', category: 'Misc' },
  { command: '\\measuredangle', description: '测量角 ∡', category: 'Misc' },
  { command: '\\triangle', description: '三角形 △', category: 'Misc' },
  { command: '\\square', description: '正方形 □', category: 'Misc' },
  { command: '\\diamond', description: '菱形 ◇', category: 'Misc' },
  { command: '\\aleph', description: '阿列夫 ℵ', category: 'Misc' },
  { command: '\\hbar', description: '约化普朗克 ℏ', category: 'Misc' },
  { command: '\\ell', description: '手写l ℓ', category: 'Misc' },
  { command: '\\wp', description: 'Weierstrass ℘', category: 'Misc' },
  { command: '\\Re', description: '实部 ℜ', category: 'Misc' },
  { command: '\\Im', description: '虚部 ℑ', category: 'Misc' },
  { command: '\\imath', description: '无点i ı', category: 'Misc' },
  { command: '\\jmath', description: '无点j ȷ', category: 'Misc' },
  { command: '\\dagger', description: '剑号 †', category: 'Misc' },
  { command: '\\ddagger', description: '双剑号 ‡', category: 'Misc' },
  { command: '\\S', description: '节号 §', category: 'Misc' },
  { command: '\\P', description: '段落号 ¶', category: 'Misc' },
  { command: '\\copyright', description: '版权 ©', category: 'Misc' },
  { command: '\\checkmark', description: '勾 ✓', category: 'Misc' },
  { command: '\\maltese', description: '马耳他十字 ✠', category: 'Misc' },

  // ==================== SPACING ====================
  { command: '\\,', description: '小空格', category: 'Space' },
  { command: '\\:', description: '中空格', category: 'Space' },
  { command: '\\;', description: '大空格', category: 'Space' },
  { command: '\\!', description: '负空格', category: 'Space' },
  { command: '\\ ', description: '空格', category: 'Space' },
  { command: '\\quad', description: '1em空格', category: 'Space' },
  { command: '\\qquad', description: '2em空格', category: 'Space' },
  { command: '\\hspace{}', description: '水平空格', category: 'Space', template: '\\hspace{|}'  },
  { command: '\\vspace{}', description: '垂直空格', category: 'Space', template: '\\vspace{|}'  },
  { command: '\\phantom{}', description: '占位空白', category: 'Space', template: '\\phantom{|}'  },

  // ==================== COLORS ====================
  { command: '\\color{}', description: '颜色', category: 'Color', template: '\\color{|}'  },
  { command: '\\textcolor{}{}', description: '文字颜色', category: 'Color', template: '\\textcolor{|}{}'  },
  { command: '\\colorbox{}{}', description: '背景颜色', category: 'Color', template: '\\colorbox{|}{}'  },
  { command: '\\boxed{}', description: '方框', category: 'Color', template: '\\boxed{|}'  },
];

// ============================================================================
// SYNTAX HIGHLIGHTING
// ============================================================================

function highlightLaTeX(text: string): string {
  if (!text) return '';

  let result = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight display math $$...$$
  result = result.replace(
    /(\$\$)([\s\S]*?)(\$\$)/g,
    '<span class="latex-display-delim">$1</span><span class="latex-math">$2</span><span class="latex-display-delim">$3</span>'
  );

  // Highlight inline math $...$
  result = result.replace(
    /(\$)([^$\n]+?)(\$)/g,
    '<span class="latex-inline-delim">$1</span><span class="latex-math">$2</span><span class="latex-inline-delim">$3</span>'
  );

  // Highlight commands inside math (after math highlighting)
  result = result.replace(
    /(\\[a-zA-Z]+)/g,
    '<span class="latex-command">$1</span>'
  );

  // Highlight braces
  result = result.replace(
    /([{}])/g,
    '<span class="latex-brace">$1</span>'
  );

  // Highlight subscript/superscript
  result = result.replace(
    /([_^])/g,
    '<span class="latex-script">$1</span>'
  );

  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

interface LaTeXEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function LaTeXEditor({
  value,
  onChange,
  placeholder,
  rows = 6,
  className,
}: LaTeXEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<LaTeXCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [searchStart, setSearchStart] = useState(-1);

  // Highlighted HTML content
  const highlightedContent = useMemo(() => highlightLaTeX(value), [value]);

  // Sync scroll between textarea and highlight div
  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Calculate cursor position in pixels
  const getCursorCoordinates = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    const { selectionStart } = textarea;
    const textBeforeCursor = value.slice(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLineText = lines[currentLineIndex];

    // Create a hidden span to measure text width
    const span = document.createElement('span');
    span.style.cssText = `
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      white-space: pre;
      visibility: hidden;
      position: absolute;
    `;
    span.textContent = currentLineText;
    document.body.appendChild(span);
    const textWidth = span.offsetWidth;
    document.body.removeChild(span);

    const lineHeight = 24;
    const paddingTop = 12;
    const paddingLeft = 16;

    const top = currentLineIndex * lineHeight + paddingTop - textarea.scrollTop + lineHeight;
    const left = Math.min(textWidth + paddingLeft - textarea.scrollLeft, textarea.offsetWidth - 320);

    return { top: Math.max(top, 0), left: Math.max(left, 0) };
  }, [value]);

  // Math mode quick suggestions (triggered by $)
  const MATH_MODE_SUGGESTIONS: LaTeXCommand[] = [
    { command: '$...$', description: '行内公式 (inline math)', category: 'Math', template: '$|$' },
    { command: '$$...$$', description: '块级公式 (display math)', category: 'Math', template: '$$\n|\n$$' },
    { command: '$\\displaystyle ...$', description: '大号行内公式 (displaystyle)', category: 'Math', template: '$\\displaystyle |$' },
  ];

  // Check if cursor is inside a math block
  const isInsideMathBlock = useCallback((text: string, cursorPos: number): boolean => {
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);

    // Check for inline math $...$
    // Count unescaped $ before cursor
    let dollarCount = 0;
    for (let i = 0; i < textBefore.length; i++) {
      if (textBefore[i] === '$' && (i === 0 || textBefore[i-1] !== '\\')) {
        dollarCount++;
      }
    }

    // If odd number of $ before cursor, we're inside inline math
    if (dollarCount % 2 === 1) {
      return true;
    }

    // Check for display math $$...$$
    const displayMathStart = textBefore.lastIndexOf('$$');
    if (displayMathStart !== -1) {
      const afterStart = textBefore.slice(displayMathStart + 2);
      const closingInBefore = afterStart.includes('$$');
      if (!closingInBefore) {
        // Check if there's a closing $$ after cursor
        const closingAfter = textAfter.indexOf('$$');
        if (closingAfter !== -1) {
          return true;
        }
      }
    }

    return false;
  }, []);

  // Update suggestions based on current input
  const updateSuggestions = useCallback((overrideValue?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentValue = overrideValue ?? value;
    const { selectionStart } = textarea;
    const textBeforeCursor = currentValue.slice(0, selectionStart);

    // Check if user just typed a single $ (for math mode completion)
    if (textBeforeCursor.endsWith('$')) {
      // Don't show $ suggestions if we're already inside a math block
      // Check the text BEFORE the $ we just typed
      const textBeforeDollar = textBeforeCursor.slice(0, -1);
      if (isInsideMathBlock(currentValue, selectionStart - 1)) {
        // We're inside math, this $ is likely closing it, don't suggest
        setShowSuggestions(false);
        return;
      }

      // Check if this is starting $$ (user typed second $)
      if (textBeforeDollar.endsWith('$')) {
        // User is typing $$, let them continue
        setShowSuggestions(false);
        return;
      }

      // Show math mode suggestions for new math block
      setSearchStart(selectionStart - 1);
      setSuggestions(MATH_MODE_SUGGESTIONS);
      setSelectedIndex(0);
      setShowSuggestions(true);
      setDropdownPosition(getCursorCoordinates());
      return;
    }

    // Find the start of the current command (look for \)
    let start = textBeforeCursor.length - 1;
    while (start >= 0) {
      const char = textBeforeCursor[start];
      if (char === '\\') break;
      if (char === ' ' || char === '\n' || char === '$' || char === '{' || char === '}') {
        start = -1;
        break;
      }
      start--;
    }

    if (start >= 0) {
      const searchText = textBeforeCursor.slice(start).toLowerCase();
      const searchWithoutBackslash = searchText.slice(1);

      let filtered: LaTeXCommand[];

      if (searchWithoutBackslash.length === 0) {
        // Just typed \, show common commands
        filtered = LATEX_COMMANDS.slice(0, 12);
      } else {
        // Filter based on search text
        filtered = LATEX_COMMANDS.filter(cmd => {
          const cmdLower = cmd.command.toLowerCase();
          const descLower = cmd.description.toLowerCase();
          return cmdLower.startsWith(searchText) ||
                 cmdLower.includes(searchWithoutBackslash) ||
                 descLower.includes(searchWithoutBackslash);
        }).slice(0, 12);
      }

      if (filtered.length > 0) {
        setSearchStart(start);
        setSuggestions(filtered);
        setSelectedIndex(0);
        setShowSuggestions(true);
        setDropdownPosition(getCursorCoordinates());
        return;
      }
    }

    setShowSuggestions(false);
  }, [value, getCursorCoordinates, isInsideMathBlock]);

  // Handle text change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Trigger suggestions immediately with the new value
    // Use requestAnimationFrame to ensure cursor position is updated
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        updateSuggestions(newValue);
      }
    });
  };

  // Track if textarea is focused
  const [isFocused, setIsFocused] = useState(false);

  // Trigger suggestions update when value changes
  useEffect(() => {
    // Small delay to ensure cursor position is updated
    const timer = setTimeout(() => {
      if (textareaRef.current && isFocused) {
        updateSuggestions();
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [value, updateSuggestions, isFocused]);

  // Insert selected suggestion
  const insertSuggestion = useCallback((suggestion: LaTeXCommand) => {
    const textarea = textareaRef.current;
    if (!textarea || searchStart < 0) return;

    const cursorPos = textarea.selectionStart;
    const before = value.slice(0, searchStart);
    const after = value.slice(cursorPos);

    // Use template if available, otherwise use command
    let insertText = suggestion.template || suggestion.command;

    // Check if \displaystyle already exists before cursor
    // Avoid double \displaystyle
    if (insertText.includes('\\displaystyle') && before.trimEnd().endsWith('\\displaystyle')) {
      // Remove \displaystyle from the template
      insertText = insertText.replace('\\displaystyle', '');
    }

    // Find cursor position (marked by |)
    const cursorMarker = insertText.indexOf('|');
    const finalText = insertText.replace('|', '');

    const newValue = before + finalText + after;
    onChange(newValue);
    setShowSuggestions(false);

    // Set cursor position
    setTimeout(() => {
      const newCursorPos = cursorMarker >= 0
        ? before.length + cursorMarker
        : before.length + finalText.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange, searchStart]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        if (suggestions.length > 0) {
          e.preventDefault();
          insertSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (showSuggestions && dropdownRef.current) {
      const selectedItem = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Syntax highlighting layer */}
      <div
        ref={highlightRef}
        className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-transparent px-4 py-3 font-mono text-sm',
          className
        )}
        style={{
          color: 'transparent',
          lineHeight: '24px',
        }}
        dangerouslySetInnerHTML={{ __html: highlightedContent || '<span class="text-transparent">.</span>' }}
      />

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // Delay blur to allow clicking on suggestions
          setTimeout(() => setIsFocused(false), 150);
        }}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        className={cn(
          'relative w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 py-3 font-mono text-sm caret-[var(--color-primary)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none',
          'latex-editor-textarea',
          className
        )}
        style={{
          lineHeight: '24px',
          resize: 'vertical',
        }}
      />

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 max-h-80 w-96 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.command}-${index}`}
              type="button"
              onClick={() => insertSuggestion(suggestion)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                index === selectedIndex
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'hover:bg-[var(--color-primary-light)]'
              )}
            >
              <code className={cn(
                'shrink-0 rounded px-2 py-0.5 font-mono text-xs',
                index === selectedIndex
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--color-secondary)] text-[var(--color-foreground)]'
              )}>
                {suggestion.command.length > 25
                  ? suggestion.command.slice(0, 25) + '...'
                  : suggestion.command}
              </code>
              <span className={cn(
                'truncate text-sm',
                index === selectedIndex ? 'text-white/90' : 'text-[var(--color-muted)]'
              )}>
                {suggestion.description}
              </span>
              <span className={cn(
                'ml-auto shrink-0 rounded px-1.5 py-0.5 text-xs',
                index === selectedIndex
                  ? 'bg-white/10 text-white/70'
                  : 'bg-[var(--color-secondary)] text-[var(--color-muted)]'
              )}>
                {suggestion.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* CSS for syntax highlighting */}
      <style>{`
        .latex-editor-textarea {
          color: var(--color-foreground);
          background: var(--color-card);
        }
        .latex-editor-textarea::selection {
          background: rgba(79, 70, 229, 0.3);
        }
        .latex-command {
          color: #8b5cf6;
        }
        .latex-brace {
          color: #f59e0b;
          font-weight: 600;
        }
        .latex-script {
          color: #10b981;
          font-weight: 600;
        }
        .latex-display-delim {
          color: #ec4899;
          font-weight: 600;
        }
        .latex-inline-delim {
          color: #06b6d4;
          font-weight: 600;
        }
        .latex-math {
          color: #3b82f6;
        }
        .dark .latex-command {
          color: #a78bfa;
        }
        .dark .latex-brace {
          color: #fbbf24;
        }
        .dark .latex-script {
          color: #34d399;
        }
        .dark .latex-display-delim {
          color: #f472b6;
        }
        .dark .latex-inline-delim {
          color: #22d3ee;
        }
        .dark .latex-math {
          color: #60a5fa;
        }
      `}</style>
    </div>
  );
}
