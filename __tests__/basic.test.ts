/**
 * Basic test to verify Jest configuration
 */

describe('Basic Jest Configuration', () => {
  it('should run TypeScript tests', () => {
    const sum = (a: number, b: number): number => a + b
    expect(sum(2, 3)).toBe(5)
  })

  it('should have access to Jest matchers', () => {
    expect(true).toBeTruthy()
    expect(false).toBeFalsy()
    expect('hello').toContain('ell')
  })

  it('should handle async operations', async () => {
    const asyncFunction = async (): Promise<string> => {
      return new Promise(resolve => {
        setTimeout(() => resolve('done'), 10)
      })
    }

    const result = await asyncFunction()
    expect(result).toBe('done')
  })
})
