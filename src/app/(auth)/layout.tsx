import { AuthAside } from './components/auth-aside';
import { AuthTopbar } from './components/auth-topbar';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-dvh flex-col">
        <AuthTopbar />
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[440px]">{children}</div>
        </main>
      </div>
      <AuthAside />
    </div>
  );
}
