"use client";

import { AuthUser } from "@/domain/auth/types";
import { AuthMode } from "@/components/entry/AuthDock";
import { ControlDock } from "@/components/entry/ControlDock";
import { HeroHeadline } from "@/components/entry/HeroHeadline";
import { TenderEngineVisual } from "@/components/entry/TenderEngineVisual";

type HeroStageProps = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  initialAuthMode?: AuthMode;
  onAuthenticated?: () => void;
};

export function HeroStage({
  isAuthenticated,
  isLoading,
  user,
  initialAuthMode,
  onAuthenticated
}: HeroStageProps) {
  const isActive = isAuthenticated && Boolean(user);

  return (
    <main className={`te-stage ${isActive ? "te-stage-active" : ""}`}>
      <div className="te-stage-grid" aria-hidden="true" />
      <div className="te-stage-noise" aria-hidden="true" />
      <div className="te-stage-inner">
        <HeroHeadline isActive={isActive} />
        <div className="te-engine-slot">
          <TenderEngineVisual isActive={isActive} />
          <p className="sr-only">
            Illustration of TenderMate identifying tender clauses, document requirements, eligibility conditions, and source references.
          </p>
        </div>
        <div className="te-dock-slot">
          <ControlDock
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            user={user}
            initialAuthMode={initialAuthMode}
            onAuthenticated={onAuthenticated}
          />
        </div>
      </div>
      <div className="te-stage-index" aria-hidden="true"><span>ENTRY / 001</span><span>INDIA · MSME TENDER INTELLIGENCE</span></div>
    </main>
  );
}
