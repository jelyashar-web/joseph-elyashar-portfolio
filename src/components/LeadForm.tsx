import { SERVICES } from '@/lib/site'
import LeadFormClient from './LeadFormClient'
export default function LeadForm(props: { source?: string; compact?: boolean }) {
  return <LeadFormClient {...props} services={SERVICES.map((s) => s.title)} />
}
