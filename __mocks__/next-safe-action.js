// Jest用のnext-safe-actionモック
// next-safe-actionのcreateSafeActionClientをモック

const createChainableClient = () => {
  const client = {
    action: (fn) => fn,
    use: () => client,
    inputSchema: () => client,
    metadata: () => client,
    outputSchema: () => client,
    schema: () => client,
    bindArgsSchemas: () => client,
  }
  return client
}

module.exports = {
  createSafeActionClient: () => createChainableClient(),
}
