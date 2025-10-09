import { ChevronRight } from 'lucide-react';

export default function ProcessSteps() {
  const steps = [
    {
      number: 1,
      title: "Codify Knowledge",
      description: "Add custom rules in the sidebar",
      status: "completed"
    },
    {
      number: 2,
      title: "Configure Agent",
      description: "Set system prompt & enable HIL",
      status: "current"
    },
    {
      number: 3,
      title: "Chat & Monitor",
      description: "Test agent responses with safety",
      status: "pending"
    }
  ];

  return (
    <div className="bg-muted/30 border-b border-border px-6 py-4" data-testid="process-steps">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${
                step.number === 1
                  ? 'bg-emerald-500 text-white'
                  : step.number === 2
                  ? 'bg-blue-500 text-white'
                  : 'bg-violet-500 text-white'
              }`} data-testid={`step-${step.number}-indicator`}>
                {step.number}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground" data-testid={`step-${step.number}-title`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`step-${step.number}-description`}>
                  {step.description}
                </p>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <ChevronRight className="w-6 h-6 text-muted-foreground ml-3" data-testid={`step-${step.number}-arrow`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
