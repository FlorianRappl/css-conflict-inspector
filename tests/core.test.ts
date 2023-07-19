import { assert, test } from 'vitest';
import { analyzeCss } from '../src';

test('Analyze CSS with Universal Selector', () => {
  const result = analyzeCss(`* { color: black; }`);
  
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.score, 50);
});

test('Analyze CSS with Element Selector', () => {
  const result = analyzeCss(`p { color: black; }`);
  
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.score, 80);
});

test('Analyze CSS with Good Selector from Styled Components', () => {
  const result = analyzeCss(`.sc-f67bc57e-3 { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test('Analyze CSS with Good Selector as Hash', () => {
  const result = analyzeCss(`.bUQMLr { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test.skip('Analyze CSS with Good Selector as Hash Inside Bad Selector', () => {
  const result = analyzeCss(`p.bUQMLr { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test('Analyze Empty CSS', () => {
  const result = analyzeCss(``);

  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});
