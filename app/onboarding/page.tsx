import { OnboardingWizard } from "./wizard";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="container-page flex min-h-screen max-w-2xl flex-col justify-center py-12">
        <OnboardingWizard />
      </div>
    </div>
  );
}
