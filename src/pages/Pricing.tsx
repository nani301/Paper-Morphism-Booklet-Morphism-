import type { NavigateFn } from "../App"

export default function Pricing({ navigate }: { navigate: NavigateFn }) {
  return <div className="min-h-screen bg-navy-deep pt-24 text-white-pure"><div className="max-w-3xl mx-auto px-6 py-12">
    <div className="section-label mb-3">PRICING</div><h1 className="font-display text-4xl mb-5">Pricing is being finalized</h1>
    <p className="text-slate-med mb-7">There are no published paid plans or checkout on this page. We will show verified prices and terms here before offering subscriptions.</p>
    <button className="btn-primary" onClick={() => navigate("evaluate")}>Explore answer evaluation</button>
  </div></div>
}
