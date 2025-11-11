import * as React from "react";
import type { OpsStatusColumn } from "@ecomlabs/types";
import { cn } from "../lib/utils";

export interface KanbanBoardProps {
  columns: OpsStatusColumn[];
  className?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, className }) => {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>
      {columns.map((column) => (
        <div key={column.name} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {column.name}
            </h4>
            <span className="text-xs font-medium text-muted-foreground">{column.count}</span>
          </div>
          <div className="flex flex-col gap-2">
            {column.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks.</p>
            ) : (
              column.tasks.map((task) => (
                <div key={task.id} className="rounded-md border border-border bg-background p-3">
                  <p className="text-sm font-medium text-foreground">{task.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.assignees.join(", ") || "Unassigned"} · Due {task.due}
                  </p>
                  {typeof task.hoursThisWeek === "number" ? (
                    <p className="text-xs text-muted-foreground">{task.hoursThisWeek.toFixed(1)}h this week</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
