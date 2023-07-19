import type { Selector } from 'lightningcss';
import type { CssConflict, CssInspectorOptions } from './types';

function getPenalty(options: CssInspectorOptions, name: keyof CssInspectorOptions, defaultValue: number) {
  if (name in options) {
    const value = options[name];

    if (typeof value === 'number') {
      return value;
    }
  }

  return defaultValue;
}

export function inspect(
  selectors: Selector | Array<Selector>,
  violations: Array<CssConflict>,
  options: CssInspectorOptions,
  scale = 1,
) {
  const startIndex = selectors.findLastIndex(m => m.type === 'combinator');

  selectors.slice(startIndex + 1).forEach((sel) => {
    switch (sel.type) {
      case 'combinator': {
        // e.g., ">"
        switch (sel.value) {
          case 'descendant':
            scale *= 0.4;
            break;
          case 'child':
            scale *= 0.2;
            break;
          case 'next-sibling':
          case 'later-sibling':
            scale *= 0.1;
            break;
        }
        break;
      }
      case 'universal': {
        // e.g., "*"
        const penalty = getPenalty(options, 'universalPenalty', 50) * scale;

        if (penalty) {
          violations.push({
            message: 'Detected use of an universal selector ("*")',
            penalty,
          });
        }

        break;
      }
      case 'type': {
        // e.g., "p"
        const elementPenalty = getPenalty(options, 'elementPenalty', 20) * scale;
        const customElementPenalty = getPenalty(options, 'customElementPenalty', 10) * scale;
        const isCustomElement = sel.name.includes('-');

        if (isCustomElement && customElementPenalty) {
          violations.push({
            message: `Detected use of a type selector (custom element "${sel.name}")`,
            penalty: customElementPenalty,
          });
        } else if (!isCustomElement && elementPenalty) {
          violations.push({
            message: `Detected use of a type selector (element "${sel.name}")`,
            penalty: elementPenalty,
          });
        }

        break;
      }
      case 'class': {
        // e.g., ".foo"
        const numHyphens = sel.name.replace(/[^\_\-]/g, '').length;
        const isHashed = /[A-Z]+/.test(sel.name) && /[a-z]+/.test(sel.name) && sel.name.length > 5;
        const simplePenalty = getPenalty(options, 'simpleClassPenalty', 5) * scale;
        const simplerPenalty = getPenalty(options, 'simplerClassPenalty', 3) * scale;
        const simplestPenalty = getPenalty(options, 'simplestClassPenalty', 2) * scale;

        if (isHashed) {
          // e.g., ".bUQMLr"
          scale = 0;
        } else if (numHyphens < 1 && sel.name.length < 8 && simplePenalty) {
          violations.push({
            message: `Detected use of a simple class selector ("${sel.name}")`,
            penalty: simplePenalty,
          });
        } else if (numHyphens < 1 && sel.name.length < 20 && simplerPenalty) {
          violations.push({
            message: `Detected use of an almost simple class selector ("${sel.name}")`,
            penalty: simplerPenalty,
          });
        } else if (numHyphens < 2 && sel.name.length < 10 && simplestPenalty) {
          violations.push({
            message: `Detected use of an almost simple class selector ("${sel.name}")`,
            penalty: simplestPenalty,
          });
        } else {
          scale = 0;
        }

        break;
      }
      case 'id': {
        // e.g., "#foo"
        const penalty = getPenalty(options, 'idPenalty', 0) * scale;

        if (penalty) {
          violations.push({
            message: `Detected use of an ID selector ("${sel.name}")`,
            penalty,
          });
        }

        break;
      }
      case 'attribute': {
        // e.g., "hidden"
        const penalty = getPenalty(options, 'attributePenalty', 0) * scale;

        if (penalty) {
          violations.push({
            message: `Detected use of an attribute selector ("${sel.name}")`,
            penalty,
          });
        }

        break;
      }
      case 'pseudo-class': {
        // e.g., ":where"
        if (sel.kind === 'not') {
          inspect(sel.selectors, violations, options, 0.5);
        } else if (sel.kind === 'where') {
          inspect(sel.selectors, violations, options, 0.5);
        } else if (sel.kind === 'has') {
          inspect(sel.selectors, violations, options, 0.2);
        } else if (sel.kind === 'is') {
          inspect(sel.selectors, violations, options, 0.1);
        } else {
          //
        }

        break;
      }
      case 'pseudo-element': {
        break;
      }
      default: {
        if (Array.isArray(sel)) {
          inspect(sel, violations, options);
        } else {
          console.log('Got unknown type', sel.type, sel);
        }

        break;
      }
    }
  });
}
