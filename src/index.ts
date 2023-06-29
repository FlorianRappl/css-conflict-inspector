import { transform, Selector, AttrOperation, NamespaceConstraint } from 'lightningcss';

export interface CssInspectorOptions {
  universalPenalty?: number;
  elementPenalty?: number;
  customElementPenalty?: number;
  simpleClassPenalty?: number;
  simplerClassPenalty?: number;
  simplestClassPenalty?: number;
  idPenalty?: number;
  attributePenalty?: number;
}

export interface CssConflict {
  penalty: number;
  message: string;
}

function getPenalty(options: CssInspectorOptions, name: keyof CssInspectorOptions, defaultValue: number) {
  if (name in options) {
    const value = options[name];

    if (typeof value === 'number') {
      return value;
    }
  }

  return defaultValue;
}

function inspect(selectors: Selector | Array<Selector>, violations: Array<CssConflict>, options: CssInspectorOptions, scale = 1) {
  selectors.forEach((sel) => {
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
        const simplePenalty = getPenalty(options, 'simpleClassPenalty', 5) * scale;
        const simplerPenalty = getPenalty(options, 'simplerClassPenalty', 3) * scale;
        const simplestPenalty = getPenalty(options, 'simplestClassPenalty', 2) * scale;

        if (numHyphens < 1 && sel.name.length < 8 && simplePenalty) {
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

function serializeOperation(op: AttrOperation | undefined) {
  if (op) {
    const mapping = {
      equal: '=',
      includes: '~=',
      'dash-match': '|=',
      prefix: '^=',
      substring: '*=',
      suffix: '$=',
    };
    const o = mapping[op.operator];
    return `${o}${op.value}`;
  }

  return '';
}

function serializeNamespace(ns: NamespaceConstraint | undefined) {
  if (ns) {
    if (ns.type === 'specific') {
      return `${ns.prefix}\\:`;
    } else if (ns.type === 'any') {
      return '*\\:';
    }
  }

  return '';
}

function stringify(selectors: Selector | Array<Selector>) {
  return selectors
    .map((sel) => {
      switch (sel.type) {
        case 'combinator':
          // e.g., ">"
          switch (sel.value) {
            case 'descendant':
              return ' ';
            case 'child':
              return '>';
            case 'next-sibling':
              return '+';
            case 'later-sibling':
              return '~';
          }
          return '';
        case 'universal':
          // e.g., "*"
          return '*';
        case 'type':
          // e.g., "p"
          return sel.name;
        case 'class':
          // e.g., ".foo"
          return `.${sel.name}`;
        case 'id':
          // e.g., "#foo"
          return `#${sel.name}`;
        case 'attribute':
          // e.g., "hidden"
          return `[${serializeNamespace(sel.namespace)}${sel.name}${serializeOperation(sel.operation)}]`;
        case 'pseudo-class':
          // e.g., ":where"
          if (Array.isArray(sel.selectors)) {
            const inner = stringify(sel.selectors);
            return `:${sel.kind}(${inner})`;
          }

          return `:${sel.kind}`;
        case 'pseudo-element':
          return `::${sel.kind}`;
        default: {
          if (Array.isArray(sel)) {
            return stringify(sel);
          }

          return '';
        }
      }
    })
    .join('');
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

  return {
    selectors,
    conflicts,
    warnings: result.warnings,
    dependencies: result.dependencies,
    totalPenalty: Math.ceil(conflicts.reduce((p, c) => p + c.penalty, 0)),
    score: 100 - Math.ceil(conflicts.reduce((p, c) => Math.max(p, c.penalty), 0)),
  };
}
