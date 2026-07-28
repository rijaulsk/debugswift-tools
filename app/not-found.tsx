import Button from "@/components/Button";
import CircuitPattern from "@/components/CircuitPattern";
import DebScene from "@/components/DebScene";
import Eyebrow from "@/components/Eyebrow";

/* 404 — thinking-pose Deb + circuit pattern + microcopy (brief P2).
 *
 * The two buttons demonstrate the repo's link rule in miniature: the tools hub
 * is a route in THIS app and needs main={false} so next/link adds the /tools
 * basePath; the homepage is the main site and stays a bare <a>. Getting these
 * the wrong way round is the most likely bug in the repo — see
 * components/MainSiteLink.tsx. */
export default function NotFound() {
  return (
    <main className="relative overflow-hidden">
      <CircuitPattern opacity={0.08} />
      <div className="relative mx-auto w-full max-w-canvas px-6 pt-24 pb-32 md:px-12 md:pt-36 md:pb-44">
        <div className="grid items-end gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,3fr)]">
          <div>
            <Eyebrow>404</Eyebrow>
            <h1 className="mt-5 max-w-2xl text-h1-mobile md:text-h1">
              Nothing here — Deb checked twice.
            </h1>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button variant="secondary" href="/" main={false}>
                Back to the tools
              </Button>
              <Button variant="tertiary" href="/">
                DebugSwift homepage →
              </Button>
            </div>
          </div>
          <DebScene
            pose="thinking"
            line="It was here a second ago…"
            width={320}
            className="w-[200px] justify-self-center lg:w-[280px] lg:justify-self-end xl:w-[320px]"
          />
        </div>
      </div>
    </main>
  );
}
