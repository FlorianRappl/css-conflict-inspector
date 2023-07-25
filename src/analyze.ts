import { transform } from 'lightningcss';
import { inspect } from './inspect';
import { stringify } from './stringify';
import type { CssConflict, CssInspectorOptions } from './types';

function sum(penalties: Array<number>) {
  return Math.ceil(penalties.reduce((s, p) => s + p, 0));
}

export function analyzeCss(content: string, options: CssInspectorOptions = {}) {
  const conflicts: Array<CssConflict> = [];
  const selectors: Array<string> = [];
  const result = transform({
    code: Buffer.from(content, 'utf8'),
    filename: 'style.css',
    analyzeDependencies: true,
    errorRecovery: true,
    visitor: {
      Selector(selector) {
        const violations: Array<CssConflict> = [];
        inspect(selector, violations, options);

        const conflict = violations
          .filter((v) => v.penalty)
          .reduce((p, c) => {
            if (p && p.penalty < c.penalty) {
              return {
                ...c,
                penalty: p.penalty,
              };
            }

            return c;
          }, undefined as CssConflict | undefined);

        if (conflict) {
          conflicts.push(conflict);
        }

        selectors.push(stringify(selector));
      },
    },
  });

  const penalties = conflicts.map((c) => c.penalty);
  const totalPenalty = sum(penalties);
  const topThree = penalties.sort((a, b) => b - a).filter((_, i) => i < 3);
  const maxPenalty = Math.ceil(conflicts.reduce((p, c) => Math.max(p, c.penalty), 0));
  const score = Math.max(0, 100 - sum(topThree));

  return {
    selectors,
    conflicts,
    warnings: result.warnings,
    dependencies: result.dependencies,
    totalPenalty,
    maxPenalty,
    score,
  };
}
