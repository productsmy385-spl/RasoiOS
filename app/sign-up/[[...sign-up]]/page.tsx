import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#1A1715] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-[#FBF9F5]">
            Create Account
          </h1>
          <p className="text-sm text-gray-400">
            Sign up with Email OTP verification
          </p>
        </div>
        <div className="flex justify-center">
          <SignUp
            appearance={{
              elements: {
                card: "bg-[#24201D] border border-[#38322E] shadow-2xl rounded-2xl",
                headerTitle: "text-[#FBF9F5] font-display",
                headerSubtitle: "text-gray-400",
                formButtonPrimary:
                  "bg-[#D97706] hover:bg-[#B45309] text-white shadow-lg shadow-[#D97706]/20 border-none",
                formFieldInput:
                  "bg-[#1A1715] border-[#38322E] text-[#F3F4F6] focus:border-[#D97706]",
                footerActionLink: "text-[#D97706] hover:underline",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
