interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className = '' }: AppShellProps) {
  return (
    <div className={`max-w-md mx-auto min-h-screen relative bg-background-light dark:bg-background-dark overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
