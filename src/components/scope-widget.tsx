"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Scope awareness widget that explains the parallel branch scope model.
 * Used during module and lesson generation to remind users about scope boundaries.
 */
export function ScopeWidget() {
  return (
    <div className="border rounded-lg bg-card p-4">
      <h3 className="font-medium mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        Scope Awareness
      </h3>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-green-600 mb-1">
            ✓ Active Focus
          </p>
          <p className="text-muted-foreground">
            This branch focuses only on topics within its assigned scope.
          </p>
        </div>

        <div>
          <p className="font-medium text-red-500 mb-1">
            ✗ Out of Scope (Handled by Siblings)
          </p>
          <p className="text-muted-foreground">
            Topics in other assessments/modules are handled separately.
            Do not duplicate content across branches.
          </p>
        </div>

        <div className="p-3 bg-muted rounded-lg mt-3">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> When reviewing content, verify that each item
            belongs to this specific scope and doesn't overlap with sibling branches.
          </p>
        </div>
      </div>
    </div>
  );
}
