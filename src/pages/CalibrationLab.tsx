import { useState, useEffect } from "react"
import { authFetch, BACKEND_URL } from "../lib/api"

export default function CalibrationLab() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch calibration report from backend API — no static file import
    authFetch(`${BACKEND_URL}/api/calibration-report`)
      .then((res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setReport(data)
        setLoading(false)
      })
      .catch((e) => {
        console.warn("Could not load calibration report:", e)
        setError(
          "Calibration results could not be loaded. Please try again later.",
        )
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-deep pt-20 px-10 text-white-pure flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-med">Loading calibration data...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-navy-deep pt-20 px-10 text-white-pure">
        <h1 className="text-3xl font-bold mb-4 text-gold">Calibration Lab</h1>
        <div className="bg-eka-warning/10 border border-eka-warning/30 p-6 rounded-xl max-w-2xl">
          <p className="text-eka-warning font-bold mb-2">
            ⚠ No Calibration Data Yet
          </p>
          <p className="text-slate-med text-sm">
            {error || "Verified benchmark results have not been published yet. You can still evaluate your answers."}
          </p>
        </div>
      </div>
    )
  }

  const { metadata, evaluationMetrics, ocrMetrics, sampleDetails } = report

  return (
    <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20 text-white-pure pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gold">
            Calibration &amp; Benchmarking Lab
          </h1>
          <p className="text-slate-med">
            Comparing AI Evaluations against Expert Ground Truth
          </p>
          <div className="mt-4 flex gap-4 text-sm text-muted-white flex-wrap">
            <span className="bg-white/10 px-3 py-1 rounded">
              Total Samples: {metadata?.totalSamples ?? "N/A"}
            </span>
          </div>
        </div>

        {/* Global Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-card p-5 rounded-xl border border-gold/20">
            <div className="text-xs text-slate-med uppercase tracking-wider mb-2">
              Mean Absolute Error
            </div>
            <div className="text-3xl font-bold text-gold">
              {evaluationMetrics?.MAE?.toFixed(3) ?? "--"}
            </div>
          </div>
          <div className="bg-card p-5 rounded-xl border border-gold/20">
            <div className="text-xs text-slate-med uppercase tracking-wider mb-2">
              RMSE
            </div>
            <div className="text-3xl font-bold text-gold">
              {evaluationMetrics?.RMSE?.toFixed(3) ?? "--"}
            </div>
          </div>
          <div className="bg-card p-5 rounded-xl border border-gold/20">
            <div className="text-xs text-slate-med uppercase tracking-wider mb-2">
              Avg Char Error Rate (CER)
            </div>
            <div className="text-3xl font-bold text-eka-danger">
              {ocrMetrics?.avgCER != null
                ? (ocrMetrics.avgCER * 100).toFixed(1) + "%"
                : "--"}
            </div>
          </div>
          <div className="bg-card p-5 rounded-xl border border-gold/20">
            <div className="text-xs text-slate-med uppercase tracking-wider mb-2">
              Avg Word Error Rate (WER)
            </div>
            <div className="text-3xl font-bold text-eka-warning">
              {ocrMetrics?.avgWER != null
                ? (ocrMetrics.avgWER * 100).toFixed(1) + "%"
                : "--"}
            </div>
          </div>
        </div>

        {/* Sample Breakdown */}
        {sampleDetails && sampleDetails.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">
              Sample Breakdown
            </h2>
            <div className="space-y-4">
              {sampleDetails.map((s: any, idx: number) => {
                const isAligned = s.disagreementReason === "ALIGNED"
                return (
                  <div
                    key={idx}
                    className={`bg-card rounded-xl border ${
                      isAligned
                        ? "border-eka-success/30"
                        : "border-eka-danger/40"
                    } p-5 flex flex-col md:flex-row gap-6 items-center`}
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{s.id}</h3>
                      <p className="text-sm text-slate-med line-clamp-1">
                        {s.aiVerdict}
                      </p>
                    </div>

                    <div className="flex gap-6 items-center text-center">
                      <div>
                        <div className="text-xs text-slate-med">
                          Expert (Median)
                        </div>
                        <div className="text-xl font-bold text-white-pure">
                          {s.expertMedian?.toFixed(2) ?? "--"}
                        </div>
                      </div>
                      <div className="text-slate-med font-light text-xl">
                        vs
                      </div>
                      <div>
                        <div className="text-xs text-slate-med">
                          Ekalavya AI
                        </div>
                        <div className="text-xl font-bold text-gold">
                          {s.aiScore?.toFixed(2) ?? "--"}
                        </div>
                      </div>
                      <div className="w-px h-10 bg-white/10 mx-2"></div>
                      <div className="text-left min-w-[150px]">
                        <div className="text-xs text-slate-med">Status</div>
                        <div
                          className={`text-sm font-bold ${
                            isAligned ? "text-eka-success" : "text-eka-danger"
                          }`}
                        >
                          {s.disagreementReason?.replace(/_/g, " ") ??
                            "UNKNOWN"}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
