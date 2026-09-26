import { PLAN_LIMITS, PLANS } from "@studio/shared";
import { WaitlistForm } from "@/components/WaitlistForm";

const steps = [
  { title: "Snap", text: "Take a photo of your product with your iPhone, on any background." },
  { title: "Studio photo", text: "We cut it out and place it on a clean white background, ready for Etsy, eBay and Vinted." },
  { title: "Listing text", text: "Get a title, description and tags written for the marketplace you sell on." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-20 px-4 py-16 sm:px-8">
      <section className="flex flex-col items-start gap-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Photo to listing
          <br />
          in 30 seconds.
        </h1>
        <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
          An AI studio for marketplace sellers. Studio-quality product photos, titles, descriptions and tags from one
          iPhone snap.
        </p>
        <WaitlistForm />
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <p className="text-sm text-neutral-500">Step {i + 1}</p>
            <h2 className="mt-1 text-xl font-semibold">{s.title}</h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const l = PLAN_LIMITS[plan];
            return (
              <div key={plan} className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
                <h3 className="text-lg font-semibold capitalize">{plan}</h3>
                <p className="mt-2 text-3xl font-bold">
                  ${l.priceUsd}
                  {l.priceUsd > 0 && <span className="text-base font-normal text-neutral-500">/mo</span>}
                </p>
                <ul className="mt-4 space-y-1 text-neutral-600 dark:text-neutral-400">
                  <li>
                    {l.products} products{plan === "free" ? " to try" : " per month"}
                  </li>
                  <li>{l.aiScenes} AI studio scenes</li>
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
