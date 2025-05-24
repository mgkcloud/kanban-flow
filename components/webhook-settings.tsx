"use client"

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STATUS } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

interface WebhookSettingsProps {
  projectId: string;
}

export function WebhookSettings({ projectId }: WebhookSettingsProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!projectId) return;
      setLoading(true);
      const res = await fetch(`/api/status-webhooks?projectId=${projectId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, string> = {};
        for (const row of data) {
          map[row.status] = row.url;
        }
        setValues(map);
      }
      setLoading(false);
    }
    load();
  }, [projectId]);

  async function handleSave(status: string) {
    const url = values[status] || "";
    setLoading(true);
    const res = await fetch("/api/status-webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, status, url }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: "Webhook saved" });
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-medium">Column Webhooks</h3>
      {STATUS.map((s) => (
        <div key={s.key} className="flex items-center gap-2">
          <Input
            placeholder={`Webhook for ${s.label}`}
            value={values[s.key] || ""}
            onChange={(e) =>
              setValues({ ...values, [s.key]: e.target.value })
            }
            className="flex-1 bg-background/50"
          />
          <Button
            size="sm"
            onClick={() => handleSave(s.key)}
            disabled={loading || !projectId}
          >
            Save
          </Button>
        </div>
      ))}
    </div>
  );
}
