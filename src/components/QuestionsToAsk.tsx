import { HelpCircle } from "lucide-react";

export default function QuestionsToAsk({ questions }: { questions: string[] }) {
  return (
    <section className="card p-5" aria-labelledby="questions-title">
      <h2 id="questions-title" className="section-title">
        Questions to ask department
      </h2>
      <div className="mt-4 grid gap-3">
        {questions.map((question) => (
          <div key={question} className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <HelpCircle className="mt-0.5 h-4 w-4 flex-none text-gray-600" aria-hidden="true" />
            <p className="text-sm font-medium leading-5 text-gray-950">{question}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
