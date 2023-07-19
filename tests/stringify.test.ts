import { assert, test } from 'vitest';
import { analyzeCss } from '../src';

test('Stringify CSS with Universal Selector', () => {
  const result = analyzeCss(`* { color: black; }`);
  
  assert.equal(result.selectors.length, 1);
  assert.equal(result.selectors[0], '*');
});

test('Stringify CSS with Element Selector', () => {
  const result = analyzeCss(`p { color: black; }`);
  
  assert.equal(result.selectors.length, 1);
  assert.equal(result.selectors[0], 'p');
});

test('Stringify CSS with Good Selector from Styled Components', () => {
  const result = analyzeCss(`.sc-f67bc57e-3 { color: black; }`);
  
  assert.equal(result.selectors.length, 1);
  assert.equal(result.selectors[0], '.sc-f67bc57e-3');
});

test('Stringify CSS with Good Selector as Hash Inside Bad Selector', () => {
  const result = analyzeCss(`p.bUQMLr { color: black; }`);
  
  assert.equal(result.selectors.length, 1);
  assert.equal(result.selectors[0], 'p.bUQMLr');
});

test('Stringify Element Selector with Descendent Class and Universal Attribute', () => {
  const result = analyzeCss(`span > .foo ~ *[data-bar] { color: black; }`);
  
  assert.equal(result.selectors.length, 1);
  assert.equal(result.selectors[0], 'span>.foo~*[data-bar]');
});
