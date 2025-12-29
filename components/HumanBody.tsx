
import React from 'react';
import { RiskCategory } from '../types';

interface Props {
  highlightedOrgans: ('HEART' | 'BRAIN' | 'LUNGS' | 'STOMACH' | 'JOINTS')[];
  risks?: RiskCategory[];
}

const ORGAN_COORDS: Record<string, { x: number, y: number, labelSide: 'left' | 'right' }> = {
  'BRAIN': { x: 50, y: 10, labelSide: 'right' },
  'LUNGS': { x: 50, y: 22, labelSide: 'left' },
  'HEART': { x: 55, y: 26, labelSide: 'right' },
  'STOMACH': { x: 50, y: 38, labelSide: 'left' },
  'JOINTS': { x: 65, y: 70, labelSide: 'right' } // Knees
};

const CATEGORY_MAP: Record<string, string> = {
  'Metabolic Health': 'STOMACH',
  'Cardiovascular': 'HEART',
  'Heart': 'HEART',
  'Respiratory': 'LUNGS',
  'Lungs': 'LUNGS',
  'Mental Health': 'BRAIN',
  'Brain': 'BRAIN',
  'Neurological': 'BRAIN',
  'Nutritional Balance': 'STOMACH',
  'Gut Health': 'STOMACH',
  'Musculoskeletal': 'JOINTS',
  'Joints': 'JOINTS'
};

export const HumanBodyVisualizer: React.FC<Props> = ({ highlightedOrgans, risks = [] }) => {
  // Determine active points based on Risks + explicit highlights
  const activePoints: { organ: string, risk?: RiskCategory }[] = [];

  // 1. Map Risks to Organs
  risks.forEach(risk => {
      const organ = CATEGORY_MAP[risk.category] || CATEGORY_MAP[Object.keys(CATEGORY_MAP).find(k => risk.category.includes(k)) || ''] || null;
      if (organ && !activePoints.find(p => p.organ === organ)) {
          activePoints.push({ organ, risk });
      }
  });

  // 2. Add explicit highlights if missing
  highlightedOrgans.forEach(organ => {
      if (!activePoints.find(p => p.organ === organ)) {
          activePoints.push({ organ });
      }
  });

  const isHighlighted = (part: string) => activePoints.some(p => p.organ === part);

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center bg-slate-900/20 rounded-3xl border border-slate-800 overflow-hidden">
       {/* Labels Layer */}
       {activePoints.map((point, i) => {
           const coords = ORGAN_COORDS[point.organ];
           if (!coords) return null;
           
           const isRight = coords.labelSide === 'right';
           const riskLevel = point.risk?.status === 'High Risk' ? 'red' : point.risk?.status === 'Medium Risk' ? 'yellow' : 'blue';
           const colorClass = riskLevel === 'red' ? 'text-red-400 border-red-500/50 bg-red-950/80' : riskLevel === 'yellow' ? 'text-yellow-400 border-yellow-500/50 bg-yellow-950/80' : 'text-blue-400 border-blue-500/50 bg-blue-950/80';

           return (
               <div key={i} className="absolute w-full h-full pointer-events-none z-10">
                   {/* Dot on body */}
                   <div 
                     className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-[0_0_10px_white] ${riskLevel === 'red' ? 'bg-red-500' : 'bg-aegis-teal'} animate-ping`}
                     style={{ left: `${coords.x}%`, top: `${coords.y}%`, transform: 'translate(-50%, -50%)' }}
                   ></div>
                   <div 
                     className={`absolute w-2 h-2 rounded-full bg-white`}
                     style={{ left: `${coords.x}%`, top: `${coords.y}%`, transform: 'translate(-50%, -50%)' }}
                   ></div>

                   {/* Label Card */}
                   <div 
                     className={`absolute top-0 transition-all duration-500 ease-out animate-slide-in-up`}
                     style={{ 
                         top: `${coords.y - 5}%`, 
                         left: isRight ? `${coords.x + 15}%` : 'auto', 
                         right: isRight ? 'auto' : `${100 - coords.x + 15}%` 
                     }}
                   >
                       <div className={`backdrop-blur-md border px-4 py-3 rounded-xl shadow-2xl max-w-[200px] ${colorClass}`}>
                           <h4 className="font-bold text-xs uppercase tracking-widest mb-1">{point.risk?.category || point.organ}</h4>
                           <p className="text-[10px] leading-tight text-slate-200">
                               {point.risk?.reasoning || "Anomaly detected in analysis."}
                           </p>
                       </div>
                       {/* Connector Line (Simple CSS Border) */}
                       <div 
                           className={`absolute top-1/2 h-[1px] bg-slate-500/50 w-12`}
                           style={{ 
                               [isRight ? 'left' : 'right']: '-48px',
                           }}
                       ></div>
                   </div>
               </div>
           );
       })}

       <svg viewBox="0 0 200 400" className="h-[90%] w-auto drop-shadow-2xl opacity-90">
          {/* BODY SILHOUETTE */}
          <path 
            d="M100,20 C115,20 125,30 125,45 C125,55 120,60 115,65 L135,75 L150,150 L135,160 L120,100 L120,200 L135,280 L135,380 L110,380 L110,290 L100,290 L90,290 L90,380 L65,380 L65,280 L80,200 L80,100 L65,160 L50,150 L65,75 L85,65 C80,60 75,55 75,45 C75,30 85,20 100,20 Z" 
            className="fill-slate-950 stroke-slate-600 stroke-[0.5]"
          />
          
          {/* MUSCLE LINES (Decorative) */}
          <path d="M100,70 L100,190" className="stroke-slate-800 stroke-[0.5] fill-none" />
          <path d="M80,100 Q60,130 65,160" className="stroke-slate-800 stroke-[0.5] fill-none" />
          <path d="M120,100 Q140,130 135,160" className="stroke-slate-800 stroke-[0.5] fill-none" />

          {/* ORGANS */}
          
          {/* BRAIN */}
          <g className={`transition-all duration-1000 ${isHighlighted('BRAIN') ? 'opacity-100' : 'opacity-10'}`}>
             <path d="M90,25 C90,25 110,25 110,35 C110,45 90,45 90,35 Z" fill={isHighlighted('BRAIN') ? '#60a5fa' : '#334155'} />
          </g>

          {/* LUNGS */}
          <g className={`transition-all duration-1000 ${isHighlighted('LUNGS') ? 'opacity-100' : 'opacity-10'}`}>
             <path d="M85,80 Q75,100 85,130 Q95,130 98,100 Z" fill={isHighlighted('LUNGS') ? '#a78bfa' : '#334155'} />
             <path d="M115,80 Q125,100 115,130 Q105,130 102,100 Z" fill={isHighlighted('LUNGS') ? '#a78bfa' : '#334155'} />
          </g>

          {/* HEART */}
          <g className={`transition-all duration-1000 ${isHighlighted('HEART') ? 'opacity-100' : 'opacity-10'}`}>
             <path 
                d="M105,95 C115,85 125,100 105,115 C85,100 95,85 105,95" 
                fill={isHighlighted('HEART') ? '#ef4444' : '#334155'} 
                className={isHighlighted('HEART') ? 'animate-pulse' : ''}
             />
          </g>

          {/* STOMACH */}
          <g className={`transition-all duration-1000 ${isHighlighted('STOMACH') ? 'opacity-100' : 'opacity-10'}`}>
             <path d="M100,140 Q120,140 115,170 Q100,180 90,160 Z" fill={isHighlighted('STOMACH') ? '#fbbf24' : '#334155'} />
          </g>
       </svg>
    </div>
  );
};
