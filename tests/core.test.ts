import { assert, test } from 'vitest';
import { analyzeCss } from '../src';

test('Analyze CSS with Universal Selector', () => {
  const result = analyzeCss(`* { color: black; }`);
  
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.score, 10);
});

test('Analyze CSS with Element Selector', () => {
  const result = analyzeCss(`p { color: black; }`);
  
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.score, 60);
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

test('Analyze CSS with Good Selector as Hash Inside Bad Selector', () => {
  const result = analyzeCss(`p.bUQMLr { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test('Analyze CSS with Good Selector as Hash Inside Bad Selector Child', () => {
  const result = analyzeCss(`* > .bUQMLr { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test('Analyze CSS with Bad Selector Inside Good Selector as Hash Child', () => {
  const result = analyzeCss(`.bUQMLr > * { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test('Analyze CSS with Good Selector as Hash Inside Bad Selector Descendent', () => {
  const result = analyzeCss(`p .bUQMLr { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test('Analyze CSS with :hover Selector of Tag', () => {
  const result = analyzeCss(`p:hover { color: black; }`);
  
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.score, 60);
});

test('Analyze CSS with :hover Selector of Simple Class', () => {
  const result = analyzeCss(`.foo:hover { color: black; }`);
  
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.score, 95);
});

test('Analyze CSS with :hover Selector of Attribute', () => {
  const result = analyzeCss(`[data-foo]:hover { color: black; }`);
  
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.score, 90);
});

test('Analyze CSS with :hover Selector of Attribute in Hashed class', () => {
  const result = analyzeCss(`.bQmQmAbCX[data-foo]:hover { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test('Analyze CSS with :not Selector of Hashed class', () => {
  const result = analyzeCss(`.bQmQmAbCX:not(foo) { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test('Analyze CSS with :has Selector of Hashed class', () => {
  const result = analyzeCss(`.bQmQmAbCX:has(foo) { color: black; }`);
  
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});

test('Analyze Empty CSS', () => {
  const result = analyzeCss(``);

  assert.equal(result.conflicts.length, 0);
  assert.equal(result.score, 100);
});
