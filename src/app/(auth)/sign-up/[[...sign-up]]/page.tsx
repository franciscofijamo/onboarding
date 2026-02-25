import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 lg:p-6">
      <div className="w-full max-w-md">
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
              card: "shadow-md rounded-2xl",
              headerTitle: "text-2xl font-semibold",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
              formFieldInput: "border-input bg-background",
              footerActionLink: "text-primary hover:text-primary/80",
            }
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}
