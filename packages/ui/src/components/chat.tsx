import * as React from "react";
import { cn } from "../lib/utils";

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role: ChatMessageRole;
  name?: string;
  message: string;
}

export const ChatBubble: React.FC<ChatMessageProps> = ({ role, name, message, className, ...props }) => {
  const isUser = role === "user";
  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start", className)} {...props}>
      {name ? <span className="text-xs text-muted-foreground">{name}</span> : null}
      <div
        className={cn(
          "max-w-lg rounded-2xl border px-4 py-3 text-sm shadow-sm",
          isUser
            ? "border-primary/20 bg-primary text-primary-foreground"
            : "border-border bg-muted text-muted-foreground"
        )}
      >
        <span className="whitespace-pre-wrap leading-relaxed">{message}</span>
      </div>
    </div>
  );
};
