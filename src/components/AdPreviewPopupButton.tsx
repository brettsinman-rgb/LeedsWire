"use client";

export function AdPreviewPopupButton() {
  function showPopup() {
    window.sessionStorage.removeItem("leedswire-popup-dismissed");
    window.dispatchEvent(new CustomEvent("leedswire:show-popup-preview"));
  }

  return (
    <div className="rounded-[1rem] border border-white/[0.08] bg-[#0b1726]/82 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EFBF04]">
            Popup campaign
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Sponsor popup preview
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300 [overflow-wrap:anywhere]">
            Use this local trigger to preview the configured popup creative,
            click-through and close state.
          </p>
        </div>
        <button
          type="button"
          onClick={showPopup}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#EFBF04] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#071827] shadow-[0_14px_32px_rgba(239,191,4,0.22)] transition hover:bg-[#f7cf24]"
        >
          Show popup
        </button>
      </div>
    </div>
  );
}
