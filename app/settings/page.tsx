import { Card } from "@/components/ui/card";
import { appConfig } from "@/lib/config";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-4xl">Settings</h1>
      <Card>
        <h2 className="font-display text-2xl">Studio</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Mock video generation</dt>
            <dd>{appConfig.mock ? "On (no Google credits)" : "Off (live Google APIs)"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Text model</dt>
            <dd className="text-right">{appConfig.google.textModel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Video model</dt>
            <dd className="text-right">{appConfig.google.videoModel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Voice model</dt>
            <dd className="text-right">{appConfig.google.ttsModel}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-muted">
          Change these in <code>.env</code>. API keys never leave the server.
        </p>
      </Card>
    </div>
  );
}
