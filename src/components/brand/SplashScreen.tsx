import Image from "next/image";

const splashBootstrap = `(() => {
  const root = document.documentElement;
  const storageKey = "paranoid.mobile-splash-seen";
  const mobile = window.matchMedia("(max-width: 1023px)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!mobile) {
    root.dataset.paranoidSplash = "complete";
    return;
  }
  try {
    if (window.sessionStorage.getItem(storageKey)) {
      root.dataset.paranoidSplash = "complete";
      return;
    }
    window.sessionStorage.setItem(storageKey, "1");
  } catch {}
  root.dataset.paranoidSplash = "show";
  const hold = reduced ? 430 : 930;
  const exit = reduced ? 180 : 270;
  window.setTimeout(() => { root.dataset.paranoidSplash = "hide"; }, hold);
  window.setTimeout(() => { root.dataset.paranoidSplash = "complete"; }, hold + exit);
})();`;

export function SplashBootstrapScript() {
  return <script dangerouslySetInnerHTML={{ __html: splashBootstrap }} />;
}

export function SplashScreen() {
  return (
    <div className="paranoid-splash" aria-hidden="true">
      <Image
        src="/brand/paranoid-studio-logo-header.png"
        width={838}
        height={331}
        alt=""
        priority
        sizes="(max-width: 640px) 68vw, 360px"
        className="h-auto w-[min(68vw,22rem)] object-contain"
      />
    </div>
  );
}
