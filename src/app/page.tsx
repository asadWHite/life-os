import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Moon, Lamp, ChartLine, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDict, getLocaleForAnon } from "@/lib/i18n";
import { LOCALE_TAGS } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/components/i18n-provider";
import { LandingCtas } from "@/components/landing-ctas";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser().catch(() => null);
  if (user && user.onboardingCompleted) redirect("/today");

  const lang = user?.language ?? (await getLocaleForAnon());
  const dict = getDict(lang);
  const locale = LOCALE_TAGS[(lang as keyof typeof LOCALE_TAGS)] ?? "uz-UZ";

  const features = [
    { icon: CheckCircle2, title: dict.feat_1_t, desc: dict.feat_1_d },
    { icon: Moon, title: dict.feat_2_t, desc: dict.feat_2_d },
    { icon: Lamp, title: dict.feat_3_t, desc: dict.feat_3_d },
    { icon: ChartLine, title: dict.feat_4_t, desc: dict.feat_4_d },
  ];

  return (
    <I18nProvider dict={dict} locale={locale} lang={lang}>
      <main className="relative min-h-dvh overflow-hidden">
        {/* ambient warm field */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 480px at 85% -10%, rgba(255,177,106,0.14), transparent 60%), radial-gradient(700px 420px at -10% 110%, rgba(173,169,150,0.16), transparent 55%)",
          }}
        />
        <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-8 md:py-10">
          {/* top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-ink">
                <Lamp size={18} strokeWidth={2} />
              </div>
              <span className="text-[15px] font-bold tracking-[-0.01em]">{dict.app_name}</span>
            </div>
            {!user && (
              <Link
                href="/sign-in"
                className="rounded-full border border-line bg-raised px-4.5 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink hover:border-line-strong"
              >
                {dict.landing_signin}
              </Link>
            )}
          </div>

          {/* hero */}
          <section className="flex flex-1 flex-col justify-center py-16 md:py-12">
            <p className="animate-rise text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-3" style={{ animationDelay: "20ms" }}>
              {dict.landing_tag}
            </p>
            <h1
              className="mt-4 max-w-[19ch] text-[clamp(2.1rem,6vw,3.9rem)] font-bold leading-[1.04] tracking-[-0.035em] animate-rise"
              style={{ animationDelay: "90ms" }}
            >
              {dict.landing_title}
            </h1>
            <p
              className="mt-5 max-w-[54ch] text-[15px] leading-relaxed text-ink-2 md:text-[16.5px] animate-rise"
              style={{ animationDelay: "160ms" }}
            >
              {dict.landing_sub}
            </p>
            <div className="mt-9 animate-rise" style={{ animationDelay: "230ms" }}>
              <LandingCtas
                resume={!!user && !user.onboardingCompleted}
                labels={{ cta: dict.landing_cta, signin: dict.landing_signin, resume: dict.landing_resume }}
              />
            </div>
          </section>

          {/* features */}
          <section className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div key={i} className="card p-5 animate-rise" style={{ animationDelay: `${300 + i * 70}ms` }}>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-sunken text-ink-2">
                  <f.icon size={19} strokeWidth={1.9} />
                </div>
                <h3 className="mt-3.5 text-[14.5px] font-semibold tracking-[-0.01em]">{f.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">{f.desc}</p>
              </div>
            ))}
          </section>

          <footer className="flex items-center gap-2 pb-2 text-[11.5px] text-ink-3">
            <ArrowRight size={12} />
            <span>Web · Android · iOS — Life OS</span>
          </footer>
        </div>
      </main>
    </I18nProvider>
  );
}
