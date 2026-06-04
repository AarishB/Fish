interface PlusRingProps {
  readonly children: React.ReactNode;
  readonly active: boolean;
  readonly padding?: number;
}

export function PlusRing({ children, active, padding = 3 }: PlusRingProps) {
  if (!active) return <>{children}</>;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Animated gold gradient ring */}
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #fde68a, #d97706, #fbbf24, #f59e0b)',
          padding,
          boxShadow: '0 0 14px 4px rgba(245,158,11,0.5)',
        }}
      />
      {/* Clip ring by masking center */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{ margin: padding }}
      >
        {children}
      </div>
    </div>
  );
}
