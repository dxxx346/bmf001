export function useToast() {
  return {
    toast: (_opts: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => undefined,
  };
}

export default useToast;

