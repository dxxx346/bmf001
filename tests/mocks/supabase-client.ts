export class MockSupabaseClient {
  private static instance: MockSupabaseClient
  private data: Map<string, any[]> = new Map()
  private _storage: Map<string, Map<string, any>> = new Map()

  static getInstance(): MockSupabaseClient {
    if (!MockSupabaseClient.instance) {
      MockSupabaseClient.instance = new MockSupabaseClient()
    }
    return MockSupabaseClient.instance
  }

  reset(): void {
    this.data.clear()
    this._storage.forEach(bucket => bucket.clear())
  }

  // Mock table operations
  from(table: string) {
    if (!this.data.has(table)) {
      this.data.set(table, [])
    }

    return {
      select: (columns = '*') => ({
        data: this.data.get(table) || [],
        error: null,
        eq: (column: string, value: any) => ({
          data: (this.data.get(table) || []).filter(item => item[column] === value),
          error: null,
          single: () => {
            const filtered = (this.data.get(table) || []).filter(item => item[column] === value)
            return {
              data: filtered[0] || null,
              error: filtered.length === 0 ? new Error('Not found') : null,
            }
          },
        }),
        order: (column: string, options?: any) => ({
          data: [...(this.data.get(table) || [])].sort((a, b) => {
            if (options?.ascending === false) {
              return b[column] > a[column] ? 1 : -1
            }
            return a[column] > b[column] ? 1 : -1
          }),
          error: null,
        }),
        limit: (count: number) => ({
          data: (this.data.get(table) || []).slice(0, count),
          error: null,
        }),
        range: (from: number, to: number) => ({
          data: (this.data.get(table) || []).slice(from, to + 1),
          error: null,
        }),
      }),

      insert: (values: any | any[]) => {
        const tableData = this.data.get(table) || []
        const records = Array.isArray(values) ? values : [values]
        
        records.forEach(record => {
          if (!record.id) {
            record.id = `mock_${Date.now()}_${Math.random()}`
          }
          if (!record.created_at) {
            record.created_at = new Date().toISOString()
          }
          tableData.push(record)
        })
        
        this.data.set(table, tableData)
        
        return {
          data: records,
          error: null,
          select: () => ({
            data: records,
            error: null,
          }),
        }
      },

      update: (values: any) => ({
        eq: (column: string, value: any) => {
          const tableData = this.data.get(table) || []
          const updatedData = tableData.map(item => {
            if (item[column] === value) {
              return { ...item, ...values, updated_at: new Date().toISOString() }
            }
            return item
          })
          this.data.set(table, updatedData)
          
          return {
            data: updatedData.filter(item => item[column] === value),
            error: null,
          }
        },
      }),

      delete: () => ({
        eq: (column: string, value: any) => {
          const tableData = this.data.get(table) || []
          const filteredData = tableData.filter(item => item[column] !== value)
          this.data.set(table, filteredData)
          
          return {
            data: null,
            error: null,
          }
        },
        neq: (column: string, value: any) => {
          const tableData = this.data.get(table) || []
          const filteredData = tableData.filter(item => item[column] === value)
          this.data.set(table, filteredData)
          
          return {
            data: null,
            error: null,
          }
        },
      }),

      upsert: (values: any | any[]) => {
        const tableData = this.data.get(table) || []
        const records = Array.isArray(values) ? values : [values]
        
        records.forEach(record => {
          const existingIndex = tableData.findIndex(item => item.id === record.id)
          
          if (existingIndex >= 0) {
            tableData[existingIndex] = { ...tableData[existingIndex], ...record, updated_at: new Date().toISOString() }
          } else {
            if (!record.id) {
              record.id = `mock_${Date.now()}_${Math.random()}`
            }
            if (!record.created_at) {
              record.created_at = new Date().toISOString()
            }
            tableData.push(record)
          }
        })
        
        this.data.set(table, tableData)
        
        return {
          data: records,
          error: null,
        }
      },
    }
  }

  // Mock auth operations
  auth = {
    signUp: jest.fn().mockImplementation(async ({ email, password, options }) => {
      const user = {
        id: `mock_user_${Date.now()}`,
        email,
        user_metadata: options?.data || {},
        created_at: new Date().toISOString(),
      }
      
      // Add user to users table
      const usersData = this.data.get('users') || []
      usersData.push({
        id: user.id,
        email: user.email,
        name: options?.data?.name || null,
        role: options?.data?.role || 'buyer',
        created_at: user.created_at,
      })
      this.data.set('users', usersData)
      
      return {
        data: { user },
        error: null,
      }
    }),

    signInWithPassword: jest.fn().mockImplementation(async ({ email, password }) => {
      const usersData = this.data.get('users') || []
      const user = usersData.find(u => u.email === email)
      
      if (!user) {
        return {
          data: null,
          error: new Error('Invalid credentials'),
        }
      }
      
      return {
        data: { user },
        error: null,
      }
    }),

    signOut: jest.fn().mockImplementation(async () => ({
      error: null,
    })),

    getUser: jest.fn().mockImplementation(async () => ({
      data: {
        user: {
          id: 'mock_current_user',
          email: 'test@example.com',
        },
      },
      error: null,
    })),
  }

  // Mock storage operations
  storage = {
    from: (bucket: string) => {
      if (!this._storage.has(bucket)) {
        this._storage.set(bucket, new Map())
      }
      
      const bucketData = this._storage.get(bucket)!
      
      return {
        upload: jest.fn().mockImplementation(async (path: string, file: any, options?: any) => {
          bucketData.set(path, {
            name: path,
            size: file.size || 1024,
            mimetype: file.type || 'application/octet-stream',
            lastModified: new Date(),
          })
          
          return {
            data: { path },
            error: null,
          }
        }),

        download: jest.fn().mockImplementation(async (path: string) => {
          const file = bucketData.get(path)
          
          if (!file) {
            return {
              data: null,
              error: new Error('File not found'),
            }
          }
          
          return {
            data: new Blob(['mock file content'], { type: file.mimetype }),
            error: null,
          }
        }),

        remove: jest.fn().mockImplementation(async (paths: string[]) => {
          paths.forEach(path => bucketData.delete(path))
          
          return {
            data: null,
            error: null,
          }
        }),

        createSignedUrl: jest.fn().mockImplementation(async (path: string, expiresIn: number) => {
          const file = bucketData.get(path)
          
          if (!file) {
            return {
              data: null,
              error: new Error('File not found'),
            }
          }
          
          return {
            data: {
              signedUrl: `https://mock-supabase.co/storage/v1/object/sign/${bucket}/${path}?token=mock_token`,
            },
            error: null,
          }
        }),

        list: jest.fn().mockImplementation(async (path?: string) => {
          const files = Array.from(bucketData.entries())
            .filter(([filePath]) => !path || filePath.startsWith(path))
            .map(([filePath, file]) => ({
              name: filePath,
              id: filePath,
              ...file,
            }))
          
          return {
            data: files,
            error: null,
          }
        }),
      }
    },
  }

  // Mock RPC calls
  rpc = jest.fn().mockImplementation(async (functionName: string, params?: any) => {
    // Mock common RPC functions
    switch (functionName) {
      case 'get_user_stats':
        return {
          data: {
            total_purchases: 5,
            total_spent: 250.00,
            favorite_count: 3,
          },
          error: null,
        }
      
      case 'get_product_recommendations':
        return {
          data: [
            { id: 'product1', title: 'Recommended Product 1', price: 19.99 },
            { id: 'product2', title: 'Recommended Product 2', price: 29.99 },
          ],
          error: null,
        }
      
      default:
        return {
          data: null,
          error: new Error(`RPC function '${functionName}' not mocked`),
        }
    }
  })
}

export function createMockSupabaseClient() {
  return MockSupabaseClient.getInstance()
}
