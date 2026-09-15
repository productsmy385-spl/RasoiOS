"use client";

import { useEffect, useState, useTransition } from "react";
import { PrintJobStatus, PrintJobType } from "@prisma/client";
import { getPrintJobsAction, retryPrintJobAction, createTestPrintJobAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, RefreshCw, AlertCircle, CheckCircle2, Clock, Play } from "lucide-react";

interface PrintJobData {
  id: string;
  orderId: string | null;
  kotTicketId: string | null;
  jobType: PrintJobType;
  targetPrinter: string;
  status: PrintJobStatus;
  attempts: number;
  errorLog: string | null;
  createdAt: string | Date;
}

export default function StaffPrintingPage() {
  const [jobs, setJobs] = useState<PrintJobData[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [jobTypeFilter, setJobTypeFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function fetchPrintJobs() {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const filters: { status?: PrintJobStatus; jobType?: PrintJobType } = {};
        if (statusFilter !== "ALL") {
          filters.status = statusFilter as PrintJobStatus;
        }
        if (jobTypeFilter !== "ALL") {
          filters.jobType = jobTypeFilter as PrintJobType;
        }

        const res = await getPrintJobsAction(filters);
        if (res.success) {
          setJobs(res.jobs as any);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load print jobs queue");
      } finally {
        setIsLoading(false);
      }
    });
  }

  useEffect(() => {
    fetchPrintJobs();
    const interval = setInterval(fetchPrintJobs, 8000);
    return () => clearInterval(interval);
  }, [statusFilter, jobTypeFilter]);

  async function handleRetryJob(jobId: string) {
    try {
      setErrorMsg(null);
      const res = await retryPrintJobAction(jobId);
      if (res.success) {
        setSuccessMsg("Print job reset to PENDING queue!");
        fetchPrintJobs();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to retry print job");
    }
  }

  async function handleCreateTestJob() {
    try {
      setErrorMsg(null);
      const res = await createTestPrintJobAction({
        jobType: PrintJobType.RECEIPT,
        targetPrinter: "CASHIER_RECEIPT",
        payload: {
          test: true,
          message: "Test receipt payload for thermal agent validation",
          timestamp: new Date().toISOString(),
        },
      });

      if (res.success) {
        setSuccessMsg(`Test print job created! (ID: ${res.job.id.slice(0, 8)})`);
        fetchPrintJobs();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create test print job");
    }
  }

  function getStatusBadgeVariant(status: PrintJobStatus) {
    switch (status) {
      case "PENDING":
        return "warning";
      case "PROCESSING":
        return "outline";
      case "PRINTED":
        return "success";
      case "FAILED":
        return "destructive";
      default:
        return "outline";
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3D3732] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Printer className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-[#F3F1EE]">
              Cloud Thermal Printing Queue
            </h1>
            <p className="text-xs text-[#A8A29E]">
              Local agent poll monitoring, target printer routing, and job status tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleCreateTestJob}
            variant="outline"
            size="sm"
          >
            + Create Test Receipt Job
          </Button>
          <Button
            onClick={fetchPrintJobs}
            disabled={isLoading || isPending}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/40 text-red-400 border border-red-500/30 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "PROCESSING", "PRINTED", "FAILED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all ${
                statusFilter === s
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                  : "bg-[#24201D] text-[#A8A29E] hover:text-white border border-[#3D3732]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {["ALL", "KOT", "RECEIPT"].map((type) => (
            <button
              key={type}
              onClick={() => setJobTypeFilter(type)}
              className={`px-3 py-1 rounded text-xs font-mono border ${
                jobTypeFilter === type
                  ? "bg-white/10 text-white border-white/30"
                  : "bg-transparent text-[#A8A29E] border-transparent hover:text-white"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Print Jobs Queue Table */}
      {isLoading && jobs.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm text-[#A8A29E]">Loading thermal print queue...</p>
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-[#24201D] border-[#3D3732]">
          <Printer className="w-10 h-10 text-[#A8A29E] mx-auto" />
          <h3 className="text-base font-semibold text-[#F3F1EE]">Print Queue Empty</h3>
          <p className="text-xs text-[#A8A29E]">
            No thermal print jobs match filter status &quot;{statusFilter}&quot;.
          </p>
        </Card>
      ) : (
        <div className="bg-[#24201D] border border-[#3D3732] rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1A1715] text-[#A8A29E] uppercase tracking-wider font-semibold border-b border-[#3D3732]">
              <tr>
                <th className="px-5 py-3.5">Job ID</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Target Printer</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Attempts</th>
                <th className="px-5 py-3.5">Created At</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3D3732] text-[#F3F1EE]">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-[#2D2825] transition-colors">
                  <td className="px-5 py-4 font-mono text-amber-400 font-bold">
                    {job.id.slice(0, 8)}...
                  </td>
                  <td className="px-5 py-4 font-bold text-xs uppercase">
                    <span className="px-2 py-0.5 bg-[#2D2825] rounded border border-[#3D3732]">
                      {job.jobType}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-[#A8A29E]">
                    {job.targetPrinter}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Badge variant={getStatusBadgeVariant(job.status)}>
                      {job.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-center font-mono font-bold">
                    {job.attempts}
                  </td>
                  <td className="px-5 py-4 text-[#A8A29E] font-mono">
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {job.status === "FAILED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRetryJob(job.id)}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
