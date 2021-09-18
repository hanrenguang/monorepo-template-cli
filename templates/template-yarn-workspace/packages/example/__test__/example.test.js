const { example } = require('../src/index')

test('example return', () => {
  expect(example()).toBe('This is a example package.')
})
