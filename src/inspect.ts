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

function getDefaultTypePenalty(type: string) {
  switch (type) {
    case 'body':
      return 80;
    case 'img':
    case 'input':
    case 'a':
    case 'button':
      return 70;
    case 'textarea':
      return 60;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
    case 'figure':
    case 'article':
    case 'section':
      return 30;
    case 'span':
    case 'div':
    case 'td':
    case 'th':
    case 'tr':
      return 50;
    case 'p':
    case 'ol':
    case 'ul':
    case 'li':
    case 'table':
    case 'thead':
    case 'tfoot':
      return 40;
    default:
      return 20;
  }
}

export function inspect(
  selectors: Selector | Array<Selector>,
  violations: Array<CssConflict>,
  options: CssInspectorOptions,
  scale = 1,
) {
  let violation: CssConflict = undefined;

  selectors.forEach((sel) => {
    switch (sel.type) {
      case 'combinator': {
        switch (sel.value) {
          case 'descendant':
            // e.g., " "
            scale *= 0.4;
            break;
          case 'child':
            // e.g., ">"
            scale *= 0.2;
            break;
          case 'next-sibling':
            // e.g., "+"
            scale *= 0.08;
            break;
          case 'later-sibling':
            // e.g., "~"
            scale *= 0.16;
            break;
        }
        break;
      }
      case 'universal': {
        // e.g., "*"
        const penalty = getPenalty(options, 'universalPenalty', 90) * scale;

        if (penalty) {
          violation = {
            message: 'Detected use of an universal selector ("*")',
            penalty,
          };
        } else {
          violation = undefined;
        }

        break;
      }
      case 'type': {
        // e.g., "p"
        const defaultPenalty = getDefaultTypePenalty(sel.name);
        const elementPenalty = getPenalty(options, 'elementPenalty', defaultPenalty) * scale;
        const customElementPenalty = getPenalty(options, 'customElementPenalty', 10) * scale;
        const isCustomElement = sel.name.includes('-');

        if (isCustomElement && customElementPenalty) {
          violation = {
            message: `Detected use of a type selector (custom element "${sel.name}")`,
            penalty: customElementPenalty,
          };
        } else if (!isCustomElement && elementPenalty) {
          violation = {
            message: `Detected use of a type selector (element "${sel.name}")`,
            penalty: elementPenalty,
          };
        } else {
          violation = undefined;
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
          violation = undefined;
        } else if (numHyphens < 1 && sel.name.length < 8 && simplePenalty) {
          violation = {
            message: `Detected use of a simple class selector ("${sel.name}")`,
            penalty: simplePenalty,
          };
        } else if (numHyphens < 1 && sel.name.length < 20 && simplerPenalty) {
          violation = {
            message: `Detected use of an almost simple class selector ("${sel.name}")`,
            penalty: simplerPenalty,
          };
        } else if (numHyphens < 2 && sel.name.length < 10 && simplestPenalty) {
          violation = {
            message: `Detected use of an almost simple class selector ("${sel.name}")`,
            penalty: simplestPenalty,
          };
        } else {
          scale = 0;
          violation = undefined;
        }

        break;
      }
      case 'id': {
        // e.g., "#foo"
        const penalty = getPenalty(options, 'idPenalty', 0) * scale;

        if (penalty) {
          violation = {
            message: `Detected use of an ID selector ("${sel.name}")`,
            penalty,
          };
        } else {
          violation = undefined;
        }

        break;
      }
      case 'attribute': {
        // e.g., "hidden"
        const penalty = getPenalty(options, 'attributePenalty', 10) * scale;

        if (penalty) {
          violation = {
            message: `Detected use of an attribute selector ("${sel.name}")`,
            penalty,
          };
        } else {
          violation = undefined;
        }

        break;
      }
      case 'pseudo-class': {
        // e.g., ":where"
        if (sel.kind === 'not' || sel.kind === 'has') {
          // Does not change the outcome as we just don't know what else can be selected (like anything)
        } else if (sel.kind === 'where' || sel.kind === 'is') {
          violation = undefined;
          inspect(sel.selectors, violations, options, scale * 0.5);
        } else {
          // These don't matter for the outcome
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

  if (violation) {
    violations.push(violation);
  }
}
