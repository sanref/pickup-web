// Login, registro, verificación y onboarding: tarjeta centrada sobre surface, sin barra de navegación.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-start justify-center bg-surface px-4 py-10 sm:items-center sm:py-16">
      {children}
    </main>
  );
}
