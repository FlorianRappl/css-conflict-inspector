import { transform } from 'lightningcss';
import { inspect } from './inspect';
import { stringify } from './stringify';
import type { CssConflict, CssInspectorOptions } from './types';

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

  return {
    selectors,
    conflicts,
    warnings: result.warnings,
    dependencies: result.dependencies,
    totalPenalty: Math.ceil(conflicts.reduce((p, c) => p + c.penalty, 0)),
    score: 100 - Math.ceil(conflicts.reduce((p, c) => Math.max(p, c.penalty), 0)),
  };
}
