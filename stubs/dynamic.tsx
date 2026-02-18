import React from 'react';

export default function dynamic<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }> | Promise<T>
): React.ComponentType<React.ComponentProps<T>> {
  const Lazy = React.lazy(async () => {
    const mod = await loader();
    if ((mod as any)?.default) return mod as { default: T };
    return { default: mod as T };
  });

  const Wrapped = (props: React.ComponentProps<T>) => (
    <React.Suspense fallback={null}>
      <Lazy {...props} />
    </React.Suspense>
  );

  Wrapped.displayName = 'DynamicStub';
  return Wrapped;
}
