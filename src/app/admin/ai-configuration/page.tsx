import type { Metadata } from "next";
import { BrainCircuit, CheckCircle2, KeyRound, Scale } from "lucide-react";
import { saveAiConfigAction } from "@/actions/admin";
import {
  AdminActionDialog,
  AdminNotice,
} from "@/components/admin/admin-actions";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin/admin-ui";
import { getAiConfigurations } from "@/lib/admin/data";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "AI configuration" };

function relationCount(value: unknown) {
  return Array.isArray(value)
    ? Number((value[0] as { count?: unknown })?.count || 0)
    : 0;
}

export default async function AdminAiConfigurationPage({
  searchParams,
}: {
  searchParams: Promise<{ admin_result?: string; admin_message?: string }>;
}) {
  const [params, configurations, actor] = await Promise.all([
    searchParams,
    getAiConfigurations(),
    requirePermission("ai_config:view"),
  ]);
  const active = configurations.find((config) => config.status === "active");
  const comparison = configurations.find((config) => config.status === "draft");
  return (
    <>
      <AdminPageHeader
        eyebrow="Versioned model controls"
        title="AI configuration"
        description="Manage validated provider, prompt, threshold, timeout, and limit versions. Secrets stay in environment variables and never appear in this interface."
      />
      <AdminNotice
        result={params.admin_result}
        message={params.admin_message}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[26rem_1fr]">
        <AdminPanel
          title="Create draft configuration"
          description="Server-side Zod validation runs before this version is stored."
        >
          <form action={saveAiConfigAction} className="space-y-4 p-5">
            <input
              type="hidden"
              name="returnTo"
              value="/admin/ai-configuration"
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label>
                <span className="text-xs font-black">Provider name</span>
                <input
                  name="providerName"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="provider"
                  className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black">Model identifier</span>
                <input
                  name="modelIdentifier"
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder="model-version"
                  className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black">
                  Prompt template version
                </span>
                <input
                  name="promptTemplateVersion"
                  required
                  maxLength={80}
                  placeholder="v1"
                  className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-black">
                Extraction instructions
              </span>
              <textarea
                name="extractionInstructions"
                required
                minLength={10}
                maxLength={12000}
                rows={5}
                className="mt-2 w-full rounded-md border border-black/12 p-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black">Analysis instructions</span>
              <textarea
                name="analysisInstructions"
                required
                minLength={10}
                maxLength={12000}
                rows={5}
                className="mt-2 w-full rounded-md border border-black/12 p-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black">
                Confidence thresholds JSON
              </span>
              <input
                name="confidenceThresholds"
                required
                defaultValue={'{"low":0.45,"medium":0.6,"high":0.75}'}
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 font-mono text-xs"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black">Risk thresholds JSON</span>
              <input
                name="riskThresholds"
                required
                defaultValue={'{"low":0.7,"medium":0.55,"high":0}'}
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 font-mono text-xs"
              />
            </label>
            <fieldset>
              <legend className="text-xs font-black">
                Accepted MIME types
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {["image/jpeg", "image/png", "image/webp"].map((type) => (
                  <label
                    key={type}
                    className="inline-flex items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      name="acceptedMimeTypes"
                      value={type}
                      defaultChecked
                    />{" "}
                    {type}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-xs font-black">Max image bytes</span>
                <input
                  type="number"
                  name="maximumScreenshotBytes"
                  min={1024}
                  max={20971520}
                  defaultValue={10485760}
                  className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black">Max matches</span>
                <input
                  type="number"
                  name="maximumMatches"
                  min={1}
                  max={100}
                  defaultValue={20}
                  className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black">Timeout ms</span>
                <input
                  type="number"
                  name="analysisTimeoutMs"
                  min={1000}
                  max={180000}
                  defaultValue={45000}
                  className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black">Retry limit</span>
                <input
                  type="number"
                  name="retryLimit"
                  min={0}
                  max={10}
                  defaultValue={2}
                  className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black">Daily user limit</span>
                <input
                  type="number"
                  name="perUserDailyLimit"
                  min={1}
                  max={1000}
                  defaultValue={20}
                  className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-black">Feature flags JSON</span>
              <input
                name="featureFlags"
                required
                defaultValue="{}"
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 font-mono text-xs"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black">Configuration notes</span>
              <textarea
                name="configurationNotes"
                required
                minLength={5}
                maxLength={4000}
                rows={4}
                className="mt-2 w-full rounded-md border border-black/12 p-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black">Draft reason</span>
              <textarea
                name="reason"
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                className="mt-2 w-full rounded-md border border-black/12 p-3 text-sm"
              />
            </label>
            <button className="min-h-11 w-full rounded-full bg-ink text-sm font-black text-white">
              Validate and create draft
            </button>
          </form>
        </AdminPanel>
        <div className="space-y-4">
          <AdminPanel
            title="Configuration versions"
            description="Production activation requires a super administrator and a recorded reason."
          >
            {configurations.length ? (
              <div className="divide-y divide-black/8">
                {configurations.map((config) => (
                  <article key={config.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">
                          Version {config.version_number}
                        </p>
                        <p className="mt-1 text-xs text-black/45">
                          {config.provider_name} · {config.model_identifier}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AdminStatusBadge status={config.status} />
                        {actor.role === "super_admin" &&
                        config.status !== "active" ? (
                          <AdminActionDialog
                            kind="ai_config_activate"
                            targetId={config.id}
                            label={
                              config.status === "archived"
                                ? "Roll back"
                                : "Activate"
                            }
                            title={
                              config.status === "archived"
                                ? "Roll back production configuration"
                                : "Activate production configuration"
                            }
                            description="This archives the current active version. A production reason is required and activation is audited."
                            tone="danger"
                          />
                        ) : null}
                      </div>
                    </div>
                    <dl className="mt-5 grid gap-4 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="text-black/40">Prompt</dt>
                        <dd className="mt-1 font-black">
                          {config.prompt_template_version}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-black/40">Created</dt>
                        <dd className="mt-1 font-black">
                          {new Date(config.created_at).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-black/40">Generated analyses</dt>
                        <dd className="mt-1 font-black">
                          {relationCount(config.analyses)}
                        </dd>
                      </div>
                    </dl>
                    <details className="mt-4 rounded-lg border border-black/10">
                      <summary className="cursor-pointer px-4 py-3 text-xs font-black">
                        Validated configuration
                      </summary>
                      <pre className="max-h-96 overflow-auto border-t border-black/10 bg-[#111] p-4 text-xs leading-6 text-white/72">
                        {JSON.stringify(
                          {
                            provider_name: config.provider_name,
                            model_identifier: config.model_identifier,
                            prompt_template_version:
                              config.prompt_template_version,
                            confidence_thresholds: config.confidence_thresholds,
                            risk_thresholds: config.risk_thresholds,
                            maximum_screenshot_bytes:
                              config.maximum_screenshot_bytes,
                            accepted_mime_types: config.accepted_mime_types,
                            maximum_matches: config.maximum_matches,
                            analysis_timeout_ms: config.analysis_timeout_ms,
                            retry_limit: config.retry_limit,
                            per_user_daily_limit: config.per_user_daily_limit,
                            feature_flags: config.feature_flags,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </article>
                ))}
              </div>
            ) : (
              <AdminEmptyState
                icon={BrainCircuit}
                title="No AI configurations"
                description="Create the first validated draft. No provider keys are stored in this table."
              />
            )}
          </AdminPanel>
          <AdminPanel
            title="Active-to-draft comparison"
            description="Review material differences before production activation."
          >
            {active && comparison ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-xs">
                  <thead className="border-b border-black/10 bg-black/[0.025]">
                    <tr>
                      <th className="p-4">Field</th>
                      <th className="p-4">Active v{active.version_number}</th>
                      <th className="p-4">
                        Draft v{comparison.version_number}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        "Provider",
                        active.provider_name,
                        comparison.provider_name,
                      ],
                      [
                        "Model",
                        active.model_identifier,
                        comparison.model_identifier,
                      ],
                      [
                        "Prompt",
                        active.prompt_template_version,
                        comparison.prompt_template_version,
                      ],
                      [
                        "Max matches",
                        active.maximum_matches,
                        comparison.maximum_matches,
                      ],
                      [
                        "Timeout",
                        `${active.analysis_timeout_ms} ms`,
                        `${comparison.analysis_timeout_ms} ms`,
                      ],
                      [
                        "Daily limit",
                        active.per_user_daily_limit,
                        comparison.per_user_daily_limit,
                      ],
                    ].map(([label, before, after]) => (
                      <tr
                        key={String(label)}
                        className="border-b border-black/8"
                      >
                        <th className="p-4 font-black">{label}</th>
                        <td className="p-4">{before}</td>
                        <td className="p-4">{after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminEmptyState
                icon={Scale}
                title="Nothing to compare"
                description="An active version and at least one draft are required for comparison."
              />
            )}
          </AdminPanel>
          <AdminPanel title="Provider secret boundary">
            <div className="flex items-start gap-4 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-ink text-signal">
                <KeyRound className="size-4" />
              </span>
              <div>
                <p className="text-sm font-black">
                  Environment-managed credentials
                </p>
                <p className="mt-2 text-xs leading-5 text-black/48">
                  Only provider and model identifiers are versioned here. API
                  keys remain in the deployment secret manager and are never
                  returned to browser code.
                </p>
              </div>
            </div>
          </AdminPanel>
          <AdminPanel title="Safety contract">
            <div className="flex items-start gap-4 p-5">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <p className="text-xs leading-6 text-black/55">
                User-facing analysis remains probability-based, includes
                confidence and risk framing, states that outcomes are uncertain,
                and never claims access to private betting-platform data or
                guaranteed wins.
              </p>
            </div>
          </AdminPanel>
        </div>
      </div>
    </>
  );
}
