"use client";

import * as React from "react";
import { Button, ChatBubble, Input, KanbanBoard, Card, CardHeader, CardTitle, CardContent } from "@ecomlabs/ui";
import type { OpsStatusSummary, OpsStatusColumn } from "@ecomlabs/types";

interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  summary?: OpsStatusSummary;
}

async function fetchStatus(client: string, scope: string) {
  const response = await fetch(`/api/ops/clickup/status?client=${encodeURIComponent(client)}&scope=${encodeURIComponent(scope)}`, {
    method: "GET"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to fetch status");
  }

  return (await response.json()) as { summary: OpsStatusSummary };
}

export function OpsChat() {
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<TranscriptMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;

    setError(null);
    setInput("");
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    setMessages((prev) => [...prev, { id, role: "user", content: value }]);

    const [command, client, scope] = value.split(/\s+/);
    if (command !== "status" || !client || !scope) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${id}-error`,
          role: "assistant",
          content: "Use the format: status <client> <scope>."
        }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const { summary } = await fetchStatus(client, scope);
      setMessages((prev) => [
        ...prev,
        {
          id: `${id}-summary`,
          role: "assistant",
          content: `Found ${summary.columns.reduce(
            (total: number, column: OpsStatusColumn) => total + column.count,
            0
          )} tasks across ${summary.columns.length} columns for ${client.toUpperCase()} (${scope.toUpperCase()}).`,
          summary
        }
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          id: `${id}-error`,
          role: "assistant",
          content: message
        }
      ]);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const latestSummary = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const candidate = messages[i];
      if (candidate.role === "assistant" && candidate.summary) {
        return candidate.summary;
      }
    }
    return null;
  }, [messages]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card className="flex h-[600px] flex-col">
        <CardHeader>
          <CardTitle>Ops Assistant</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto rounded-md border bg-background p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Type a command to begin. Example: status client-x ppc</p>
            ) : (
              messages.map((message) => (
                <ChatBubble key={message.id} role={message.role} message={message.content} />
              ))
            )}
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="status client-x ppc"
              value={input}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setInput(event.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </form>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
      <Card className="h-[600px] overflow-hidden">
        <CardHeader>
          <CardTitle>Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-full overflow-y-auto">
          {latestSummary ? (
            <KanbanBoard columns={latestSummary.columns} className="pb-8" />
          ) : (
            <p className="text-sm text-muted-foreground">Run a status command to see the latest board.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
