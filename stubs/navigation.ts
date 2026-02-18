export function useRouter() {
  return {
    push: (href: string) => {
      if (typeof window !== 'undefined') window.location.assign(href);
    },
    replace: (href: string) => {
      if (typeof window !== 'undefined') window.location.replace(href);
    },
    back: () => {
      if (typeof window !== 'undefined') window.history.back();
    },
  };
}
