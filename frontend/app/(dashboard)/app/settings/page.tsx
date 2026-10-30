import { Shield, Key, Sliders, Server, Cpu } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">System Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Platform parameters, cryptographic key management, and multi-agent provider configuration.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Environment Preferences */}
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-primary">
              <Cpu className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Model Routing & Inference</h3>
              <p className="text-xs text-muted-foreground">Primary and fallback LLM endpoints</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
              <div>
                <div className="font-medium text-white">Primary Reasoning Provider</div>
                <div className="text-[11px] text-muted-foreground">NVIDIA NIM: Mistral Large 4 (1T-A52B)</div>
              </div>
              <span className="rounded-full bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 px-2.5 py-0.5 text-[10px] font-medium">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
              <div>
                <div className="font-medium text-white">Secondary Extraction Provider</div>
                <div className="text-[11px] text-muted-foreground">Google Gemini 3.5 Flash-lite (Structured JSON)</div>
              </div>
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-[10px] font-medium">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Security & Webhook Config */}
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-primary">
              <Key className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Security & Webhook Signatures</h3>
              <p className="text-xs text-muted-foreground">Cryptographic signing keys for external automation</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
              <div>
                <div className="font-medium text-white">Webhook Signing Algorithm</div>
                <div className="text-[11px] text-muted-foreground">HMAC-SHA256 (X-Nexus-Signature)</div>
              </div>
              <span className="text-[11px] text-muted-foreground">Timing-safe verification</span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
              <div>
                <div className="font-medium text-white">Vector Storage Dimension</div>
                <div className="text-[11px] text-muted-foreground">pgvector (bge-small-en-v1.5)</div>
              </div>
              <span className="text-[11px] text-primary font-semibold">384-dimensional</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
