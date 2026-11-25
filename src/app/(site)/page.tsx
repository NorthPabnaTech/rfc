import { Hero } from './components/hero';
import {
  Benefits,
  CategoriesGrid,
  Contact,
  Cta,
  EarningsExplainer,
  Faq,
  Features,
  HowItWorks,
  Showcase,
  WalletFlow,
} from './components/sections';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <EarningsExplainer />
      <Benefits />
      <CategoriesGrid />
      <Showcase />
      <WalletFlow />
      <Faq />
      <Cta />
      <Contact />
    </>
  );
}
