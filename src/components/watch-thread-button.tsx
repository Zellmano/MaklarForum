import { toggleWatchThreadAction } from "@/app/dashboard/fragor/actions";

export function WatchThreadButton({ questionId, slug, watching }: { questionId: string; slug: string; watching: boolean }) {
  const action = toggleWatchThreadAction.bind(null, questionId, slug, watching);

  return (
    <form action={action}>
      <button className="pill pill-light" type="submit">
        {watching ? "Sluta följa tråd" : "Följ tråd"}
      </button>
    </form>
  );
}
