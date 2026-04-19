import { Instagram } from 'lucide-react';

const REELS = [
  'https://www.instagram.com/reel/DXTyI4NMVUG/',
  'https://www.instagram.com/reel/DXSPrxFNrhz/',
  'https://www.instagram.com/reel/DXTqkSPDEHA/',
];

const ReelsPanel = () => {
  return (
    <aside className="hidden xl:flex flex-col w-[360px] flex-shrink-0 border-l border-border bg-app-header h-screen overflow-y-auto">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-app-header z-10">
        <Instagram size={18} className="text-pink-500" />
        <h2 className="font-display text-sm font-semibold text-foreground">Latest Reels</h2>
        <a
          href="https://www.instagram.com/respect.chf/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-primary hover:underline"
        >
          @respect.chf
        </a>
      </div>
      <div className="flex flex-col gap-4 p-3">
        {REELS.map((url) => (
          <div key={url} className="rounded-xl overflow-hidden border border-border bg-background shadow-sm">
            <iframe
              src={`${url}embed`}
              className="w-full"
              style={{ height: 540, border: 0 }}
              scrolling="no"
              allow="encrypted-media"
              allowFullScreen
              loading="lazy"
              title="Instagram reel"
            />
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground text-center px-2 pb-3">
          Tap a reel to open it on Instagram for sound & full view.
        </p>
      </div>
    </aside>
  );
};

export default ReelsPanel;
