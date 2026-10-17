import Link from "next/link";
import { Compass } from "lucide-react";
import { cookies } from "next/headers";
import { getDict } from "@/lib/i18n";

export default async function NotFound() {
  const jar = await cookies();
  const dict = getDict(jar.get("lifeos_lang")?.value ?? "uz");
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="card w-full max-w-sm p-8 text-center animate-rise">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sunken text-ink-3">
          <Compass size={24} />
        </div>
        <h1 className="mt-4 text-[20px] font-bold tracking-[-0.02em]">{dict.not_found_title}</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-3">{dict.not_found_sub}</p>
        <Link
          href="/today"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-accent px-6 text-[13.5px] font-semibold text-accent-ink transition-all hover:brightness-110"
        >
          {dict.not_found_home}
        </Link>
      </div>
    </main>
  );
}
