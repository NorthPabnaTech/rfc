import type { Metadata } from 'next';

import { BusinessAnalysis } from './components/business-analysis';

export const metadata: Metadata = { title: 'Business Analysis' };

export default function AnalysisPage() {
  return <BusinessAnalysis />;
}
