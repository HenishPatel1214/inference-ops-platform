import { useState } from "react";
import { KeyRound, Lock, ServerCog } from "lucide-react";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { API_TOKEN, API_URL } from "@/lib/api";
import { eventSocketUrl } from "@/lib/websocket";

type SettingsPageProps = {
  darkMode: boolean;
  onDarkModeChange: (enabled: boolean) => void;
};

export function SettingsPage({ darkMode, onDarkModeChange }: SettingsPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rotateKey = () => {
    setDialogOpen(false);
    setMessage("Token rotation is mocked in the UI. Backend auth still uses the configured dev token.");
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Auth mode" value="Bearer token" icon={<Lock className="size-4" />} />
        <MetricCard label="API base" value="Local" detail={API_URL} icon={<ServerCog className="size-4" />} />
        <MetricCard label="Key scope" value="dev" icon={<KeyRound className="size-4" />} />
      </section>

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">API keys and connection settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="REST API base URL" value={API_URL} />
            <Field label="WebSocket URL" value={eventSocketUrl()} />
            <Field label="Frontend token" value={API_TOKEN} />
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex h-9 items-center justify-between rounded-md border px-3">
                <span className="text-sm text-muted-foreground">Dark mode</span>
                <Switch checked={darkMode} onCheckedChange={onDarkModeChange} aria-label="Toggle dark mode" />
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <KeyRound className="size-4" />
                  Rotate dev token
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rotate API token</DialogTitle>
                  <DialogDescription>
                    This dashboard can stage the UI action, but token rotation needs backend auth storage.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={rotateKey}>Stage rotation</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline">Download audit snapshot</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} readOnly aria-label={label} />
    </div>
  );
}
