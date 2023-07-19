import type { Selector, AttrOperation, NamespaceConstraint } from 'lightningcss';

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

export function stringify(selectors: Selector | Array<Selector>) {
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
