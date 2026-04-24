import Link from "next/link";
import { AgentCard } from "@/components/agent-card";
import { GuideCard } from "@/components/guide-card";
import { QuestionCard } from "@/components/question-card";
import { buyerGuides, sellerGuides } from "@/lib/mock-data";
import { getAgents, getQuestions } from "@/lib/data";

export default async function Home() {
  const [questions, agents] = await Promise.all([getQuestions(), getAgents()]);

  return (
    <div className="pb-8">
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-8 shadow-sm">
        <p className="pill pill-light">Lansering Sverige 2026</p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">
          Hjälp kunder att köpa och sälja bostad med riktiga svar från verifierade mäklare.
        </h1>
        <p className="mt-4 max-w-3xl text-[var(--muted)]">
          Mäklarforum.se är en öppen Q&A-plattform för konsumenter och samtidigt ett internt forum där mäklare kan diskutera juridik,
          teknik, budgivning och rekrytering.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/fragor" className="pill pill-dark">
            Utforska frågor
          </Link>
          <Link href="/maklare" className="pill pill-light">
            Se verifierade mäklare
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl">Senaste frågor</h2>
          <Link href="/fragor" className="text-sm text-[var(--accent)]">
            Visa alla
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {questions.length === 0 && (
            <p className="col-span-2 text-sm text-[var(--muted)]">Inga frågor publicerade ännu.</p>
          )}
          {questions.slice(0, 4).map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl">Verifierade mäklare</h2>
          <Link href="/maklare" className="text-sm text-[var(--accent)]">
            Se alla profiler
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {agents.length === 0 && (
            <p className="col-span-3 text-sm text-[var(--muted)]">Inga verifierade mäklare ännu.</p>
          )}
          {agents.slice(0, 3).map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl">För säljare</h2>
            <Link href="/guider/saljare" className="text-sm text-[var(--accent)]">
              Alla säljarguider
            </Link>
          </div>
          <div className="grid gap-4">
            {sellerGuides.slice(0, 3).map((article) => (
              <GuideCard key={article.slug} article={article} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl">För köpare</h2>
            <Link href="/guider/kopare" className="text-sm text-[var(--accent)]">
              Alla köparguider
            </Link>
          </div>
          <div className="grid gap-4">
            {buyerGuides.slice(0, 3).map((article) => (
              <GuideCard key={article.slug} article={article} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
