/**
 * Math Answer Verification Service
 * 数学答案验证服务
 *
 * Supports:
 * 1. Numerical comparison (with tolerance)
 * 2. Mathematical expression equivalence (a/2 = 1/2*a = 0.5a)
 * 3. AI-based verification for indefinite integrals (verify by differentiation)
 */

import { create, all, type MathNode } from 'mathjs';
import { api } from './api';

// Create mathjs instance with all functions
const math = create(all);

// Verification result interface
export interface VerificationResult {
  isCorrect: boolean;
  method: 'exact' | 'numeric' | 'symbolic' | 'ai_derivative';
  message?: string;
  details?: {
    userAnswer: string;
    expectedAnswer: string;
    normalizedUser?: string;
    normalizedExpected?: string;
    derivative?: string;
  };
}

// Question type for verification
export type QuestionType = 'choice' | 'blank' | 'answer' | 'integral';

/**
 * Main verification function
 * 主验证函数
 */
export async function verifyAnswer(
  userAnswer: string,
  correctAnswer: string,
  questionType: QuestionType,
  originalExpression?: string // For integrals: the integrand
): Promise<VerificationResult> {
  // Clean up answers
  const cleanUser = cleanAnswer(userAnswer);
  const cleanCorrect = cleanAnswer(correctAnswer);

  // Empty answer
  if (!cleanUser) {
    return {
      isCorrect: false,
      method: 'exact',
      message: 'empty_answer',
    };
  }

  // Choice questions: exact match
  if (questionType === 'choice') {
    return verifyChoiceAnswer(cleanUser, cleanCorrect);
  }

  // Integral questions: verify by differentiation
  if (questionType === 'integral' && originalExpression) {
    return await verifyIntegralAnswer(cleanUser, originalExpression);
  }

  // Try different verification methods in order
  // 1. Exact match
  const exactResult = verifyExactMatch(cleanUser, cleanCorrect);
  if (exactResult.isCorrect) return exactResult;

  // 2. Numeric comparison (for pure numbers)
  const numericResult = verifyNumericEquivalence(cleanUser, cleanCorrect);
  if (numericResult.isCorrect) return numericResult;

  // 3. Symbolic comparison (for expressions like a/2 vs 1/2*a)
  const symbolicResult = verifySymbolicEquivalence(cleanUser, cleanCorrect);
  if (symbolicResult.isCorrect) return symbolicResult;

  // All methods failed
  return {
    isCorrect: false,
    method: 'symbolic',
    message: 'incorrect',
    details: {
      userAnswer: cleanUser,
      expectedAnswer: cleanCorrect,
    },
  };
}

/**
 * Clean and normalize answer string
 */
function cleanAnswer(answer: string): string {
  if (!answer) return '';

  return answer
    .trim()
    .toLowerCase()
    // Remove LaTeX delimiters
    .replace(/^\$+|\$+$/g, '')
    .replace(/\\displaystyle/g, '')
    // Normalize whitespace
    .replace(/\s+/g, '')
    // Convert common LaTeX to mathjs format
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\pi/g, 'pi')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\^/g, '^')
    // Remove + C for integrals (we handle this separately)
    .replace(/\+?\s*c\s*$/i, '')
    .trim();
}

/**
 * Verify choice question (exact match)
 */
function verifyChoiceAnswer(userAnswer: string, correctAnswer: string): VerificationResult {
  const normalizedUser = userAnswer.toUpperCase().replace(/[^A-Z]/g, '');
  const normalizedCorrect = correctAnswer.toUpperCase().replace(/[^A-Z]/g, '');

  // Sort for multiple choice
  const sortedUser = normalizedUser.split('').sort().join('');
  const sortedCorrect = normalizedCorrect.split('').sort().join('');

  return {
    isCorrect: sortedUser === sortedCorrect,
    method: 'exact',
    details: {
      userAnswer,
      expectedAnswer: correctAnswer,
      normalizedUser: sortedUser,
      normalizedExpected: sortedCorrect,
    },
  };
}

/**
 * Verify exact string match (after normalization)
 */
function verifyExactMatch(userAnswer: string, correctAnswer: string): VerificationResult {
  const isCorrect = userAnswer === correctAnswer;
  return {
    isCorrect,
    method: 'exact',
    details: {
      userAnswer,
      expectedAnswer: correctAnswer,
    },
  };
}

/**
 * Verify numeric equivalence
 * e.g., "0.5" == "1/2" == ".5"
 */
function verifyNumericEquivalence(userAnswer: string, correctAnswer: string): VerificationResult {
  try {
    const userValue = math.evaluate(userAnswer);
    const correctValue = math.evaluate(correctAnswer);

    // Check if both are numbers
    if (typeof userValue !== 'number' || typeof correctValue !== 'number') {
      return { isCorrect: false, method: 'numeric' };
    }

    // Check for NaN or Infinity
    if (!isFinite(userValue) || !isFinite(correctValue)) {
      return { isCorrect: false, method: 'numeric' };
    }

    // Compare with tolerance (for floating point)
    const tolerance = 1e-9;
    const isCorrect = Math.abs(userValue - correctValue) < tolerance ||
      Math.abs(userValue - correctValue) / Math.max(Math.abs(correctValue), 1) < tolerance;

    return {
      isCorrect,
      method: 'numeric',
      details: {
        userAnswer,
        expectedAnswer: correctAnswer,
        normalizedUser: String(userValue),
        normalizedExpected: String(correctValue),
      },
    };
  } catch {
    return { isCorrect: false, method: 'numeric' };
  }
}

/**
 * Verify symbolic equivalence
 * e.g., "a/2" == "1/2*a" == "0.5*a" == "a*0.5"
 */
function verifySymbolicEquivalence(userAnswer: string, correctAnswer: string): VerificationResult {
  try {
    // Parse expressions
    const userExpr = math.parse(userAnswer);
    const correctExpr = math.parse(correctAnswer);

    // Simplify both expressions
    const userSimplified = math.simplify(userExpr);
    const correctSimplified = math.simplify(correctExpr);

    // Compare simplified string representations
    const userStr = userSimplified.toString();
    const correctStr = correctSimplified.toString();

    if (userStr === correctStr) {
      return {
        isCorrect: true,
        method: 'symbolic',
        details: {
          userAnswer,
          expectedAnswer: correctAnswer,
          normalizedUser: userStr,
          normalizedExpected: correctStr,
        },
      };
    }

    // Try evaluating with test values for variables
    const variables = extractVariables(userExpr).concat(extractVariables(correctExpr));
    const uniqueVars = [...new Set(variables)];

    if (uniqueVars.length > 0) {
      // Test with multiple random values
      const testValues = [
        generateTestScope(uniqueVars, 1),
        generateTestScope(uniqueVars, 2),
        generateTestScope(uniqueVars, 0.5),
        generateTestScope(uniqueVars, -1),
        generateTestScope(uniqueVars, 3.14159),
      ];

      let allMatch = true;
      for (const scope of testValues) {
        try {
          const userVal = userExpr.evaluate(scope);
          const correctVal = correctExpr.evaluate(scope);

          if (typeof userVal !== 'number' || typeof correctVal !== 'number') {
            continue;
          }

          const tolerance = 1e-6;
          if (Math.abs(userVal - correctVal) > tolerance * Math.max(Math.abs(correctVal), 1)) {
            allMatch = false;
            break;
          }
        } catch {
          // Skip this test value
        }
      }

      if (allMatch) {
        return {
          isCorrect: true,
          method: 'symbolic',
          details: {
            userAnswer,
            expectedAnswer: correctAnswer,
            normalizedUser: userStr,
            normalizedExpected: correctStr,
          },
        };
      }
    }

    return { isCorrect: false, method: 'symbolic' };
  } catch {
    return { isCorrect: false, method: 'symbolic' };
  }
}

/**
 * Extract variable names from expression
 */
function extractVariables(expr: MathNode): string[] {
  const variables: string[] = [];

  expr.traverse((node) => {
    if (node.type === 'SymbolNode') {
      // Cast to access name property (safe because we checked type)
      const symbolNode = node as unknown as { name: string };
      const name = symbolNode.name;
      // Exclude common constants
      const constants = ['pi', 'e', 'i', 'true', 'false'];
      if (!constants.includes(name.toLowerCase())) {
        variables.push(name);
      }
    }
  });

  return variables;
}

/**
 * Generate test scope with values for variables
 */
function generateTestScope(variables: string[], baseValue: number): Record<string, number> {
  const scope: Record<string, number> = {};
  variables.forEach((v, i) => {
    scope[v] = baseValue * (i + 1);
  });
  return scope;
}

/**
 * Verify indefinite integral answer by differentiation (AI-based)
 * 通过求导验证不定积分答案
 */
export async function verifyIntegralAnswer(
  userAnswer: string,
  integrand: string
): Promise<VerificationResult> {
  try {
    // First, try local symbolic differentiation with mathjs
    const localResult = verifyIntegralLocally(userAnswer, integrand);
    if (localResult.isCorrect) {
      return localResult;
    }

    // If local verification fails or is inconclusive, use AI
    const aiResult = await verifyIntegralWithAI(userAnswer, integrand);
    return aiResult;
  } catch (error) {
    console.error('Integral verification error:', error);
    return {
      isCorrect: false,
      method: 'ai_derivative',
      message: 'verification_error',
      details: {
        userAnswer,
        expectedAnswer: integrand,
      },
    };
  }
}

/**
 * Try to verify integral locally using mathjs differentiation
 */
function verifyIntegralLocally(userAnswer: string, integrand: string): VerificationResult {
  try {
    // Clean the answers
    const cleanedAnswer = cleanAnswer(userAnswer);
    const cleanedIntegrand = cleanAnswer(integrand);

    // Parse user's antiderivative
    const antiderivative = math.parse(cleanedAnswer);

    // Find the variable (assume single variable, typically x)
    const variables = extractVariables(antiderivative);
    const variable = variables.includes('x') ? 'x' : variables[0] || 'x';

    // Differentiate
    const derivative = math.derivative(antiderivative, variable);
    const simplifiedDerivative = math.simplify(derivative);

    // Compare with integrand
    const integrandExpr = math.parse(cleanedIntegrand);
    const simplifiedIntegrand = math.simplify(integrandExpr);

    // String comparison after simplification
    if (simplifiedDerivative.toString() === simplifiedIntegrand.toString()) {
      return {
        isCorrect: true,
        method: 'symbolic',
        details: {
          userAnswer: cleanedAnswer,
          expectedAnswer: cleanedIntegrand,
          derivative: simplifiedDerivative.toString(),
        },
      };
    }

    // Test with values
    const testValues = [1, 2, 0.5, -1, 3.14159];
    let allMatch = true;

    for (const val of testValues) {
      try {
        const scope = { [variable]: val };
        const derivativeVal = derivative.evaluate(scope);
        const integrandVal = integrandExpr.evaluate(scope);

        if (typeof derivativeVal !== 'number' || typeof integrandVal !== 'number') {
          continue;
        }

        const tolerance = 1e-6;
        if (Math.abs(derivativeVal - integrandVal) > tolerance * Math.max(Math.abs(integrandVal), 1)) {
          allMatch = false;
          break;
        }
      } catch {
        // Skip this test value
      }
    }

    return {
      isCorrect: allMatch,
      method: 'symbolic',
      details: {
        userAnswer: cleanedAnswer,
        expectedAnswer: cleanedIntegrand,
        derivative: simplifiedDerivative.toString(),
      },
    };
  } catch {
    // Local verification failed, return inconclusive
    return {
      isCorrect: false,
      method: 'symbolic',
    };
  }
}

/**
 * Verify integral using AI (backend API)
 * AI会对用户答案求导，检查是否等于被积函数
 */
async function verifyIntegralWithAI(
  userAnswer: string,
  integrand: string
): Promise<VerificationResult> {
  try {
    const response = await api.post('/math/verify-integral', {
      userAnswer,
      integrand,
    });

    if (response.data.success) {
      return {
        isCorrect: response.data.data.isCorrect,
        method: 'ai_derivative',
        message: response.data.data.message,
        details: {
          userAnswer,
          expectedAnswer: integrand,
          derivative: response.data.data.derivative,
        },
      };
    }

    throw new Error('AI verification failed');
  } catch (error) {
    // If AI is not available, fall back to a simpler check
    console.warn('AI verification not available, using fallback');
    return {
      isCorrect: false,
      method: 'ai_derivative',
      message: 'ai_unavailable',
      details: {
        userAnswer,
        expectedAnswer: integrand,
      },
    };
  }
}

/**
 * Quick check for special values (pi, e, etc.)
 */
export function normalizeSpecialValues(answer: string): string {
  return answer
    .replace(/\\pi/g, 'pi')
    .replace(/π/g, 'pi')
    .replace(/\\infty/g, 'Infinity')
    .replace(/∞/g, 'Infinity')
    .replace(/\\sqrt\{(\d+)\}/g, 'sqrt($1)')
    .replace(/√(\d+)/g, 'sqrt($1)');
}

/**
 * Parse fraction from string
 * e.g., "pi^2/6" -> { numerator: "pi^2", denominator: "6" }
 */
export function parseFraction(expr: string): { numerator: string; denominator: string } | null {
  // Simple fraction pattern
  const match = expr.match(/^(.+)\/(.+)$/);
  if (match) {
    return { numerator: match[1], denominator: match[2] };
  }
  return null;
}
