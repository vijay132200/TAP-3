import { ChevronRight } from 'lucide-react';

export default function ProcessSteps() {
  const steps = [
    {
      number: 1,
      title: "Codify Knowledge",
      description: "Define tacit rules",
      status: "completed"
    },
    {
      number: 2,
      title: "Govern Agent Brain",
      description: "Adjust system prompt",
      status: "current"
    },
    {
      number: 3,
      title: "Test & Enforce Safety",
      description: "Enable HIL mode",
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
                step.status === 'completed' 
                  ? 'bg-accent text-accent-foreground'
                  : step.status === 'current'
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground border-2 border-border'
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
