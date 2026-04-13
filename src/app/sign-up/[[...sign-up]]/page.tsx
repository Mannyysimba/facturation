import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-6">
      <SignUp
        appearance={{
          variables: {
            colorPrimary: '#ffffff',
            colorBackground: '#0f0f0f',
            colorText: '#ffffff',
            colorTextSecondary: '#a1a1aa',
            colorInputBackground: '#18181b',
            colorInputText: '#ffffff',
            borderRadius: '12px',
          },
          elements: {
            card: 'bg-[#0f0f0f] border border-white/10 shadow-none',
            headerTitle: 'text-white',
            headerSubtitle: 'text-zinc-400',
            socialButtonsBlockButton: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
            dividerLine: 'bg-white/10',
            dividerText: 'text-zinc-500',
            formFieldLabel: 'text-zinc-300',
            formFieldInput: 'bg-zinc-900 border border-white/10 text-white',
            formButtonPrimary: 'bg-white text-black hover:bg-zinc-200 normal-case',
            footerActionText: 'text-zinc-400',
            footerActionLink: 'text-white hover:text-zinc-300',
            identityPreviewText: 'text-white',
            identityPreviewEditButton: 'text-zinc-400 hover:text-white',
          },
        }}
      />
    </div>
  );
}
