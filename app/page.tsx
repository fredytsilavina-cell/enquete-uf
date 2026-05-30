import { FingerprintProvider } from "@/components/FingerprintProvider";
import SurveyPage from "@/components/SurveyPage";

export default function Home() {
  return (
    <FingerprintProvider>
      <SurveyPage />
    </FingerprintProvider>
  );
}
