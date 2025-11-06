export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:h-screen bg-white flex lg:overflow-hidden">
      {children}
    </div>
  );
}
