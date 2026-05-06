export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(79,142,247,0.07) 0%, var(--background) 60%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(79,142,247,0.4), transparent)",
        }}
      />
      <div className="w-full max-w-sm px-4">{children}</div>
    </div>
  );
}
