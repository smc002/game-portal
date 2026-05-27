export function EventLog({ logs }: { logs: string[] }) {
  return (
    <section className="rounded-lg border border-stone-700 bg-stone-950/60 p-4">
      <h2 className="text-base font-semibold text-white">战斗日志</h2>
      <div className="mt-3 space-y-2 text-xs leading-5 text-stone-300">
        {logs.map((log, index) => (
          <div key={`${log}-${index}`} className="border-l border-stone-700 pl-2">
            {log}
          </div>
        ))}
      </div>
    </section>
  );
}
