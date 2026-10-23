import React from 'react';
import type { PipelineStage } from '../../types';

interface PipelineProgressProps {
  stages: PipelineStage[];
  total: number;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({ stages, total }) => {
  const max = Math.max(...stages.map((s) => s.count));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Submission Pipeline</h3>
          <p className="text-xs text-slate-400 mt-0.5">{total} total applications</p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
        {stages.map((stage) => (
          <div
            key={stage.label}
            title={`${stage.label}: ${stage.count}`}
            style={{
              flex: stage.count,
              background: stage.color,
              minWidth: stage.count > 0 ? 4 : 0,
            }}
          />
        ))}
      </div>

      {/* Stage list */}
      <div className="flex flex-col gap-2">
        {stages.map((stage) => (
          <div key={stage.label} className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: stage.color }}
            />
            <span className="text-xs text-slate-600 flex-1">{stage.label}</span>
            <div className="flex items-center gap-2">
              {/* Mini bar */}
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(stage.count / max) * 100}%`,
                    background: stage.color,
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700 w-7 text-right">
                {stage.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
