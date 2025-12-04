"use client";

type MailAppRailProps = {
  unreadInboxCount: number;
  onToggleSidebar: () => void;
};

export function MailAppRail({
  unreadInboxCount,
  onToggleSidebar,
}: MailAppRailProps) {
  const hasUnread = unreadInboxCount > 0;

  return (
    <aside className="flex w-16 flex-col items-center bg-[#e9edf5] pt-2">
      {/* Hamburger / menu button */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="mb-4 rounded-full p-1.5 text-slate-600 hover:bg-[#e8eaed]"
        aria-label="Toggle sidebar"
      >
        <span className="material-symbols-outlined text-[13px]">
          menu
        </span>
      </button>

      {/* Mail icon bubble (active) */}
      <button
        type="button"
        className="flex flex-col items-center gap-0.5"
      >
        <div className="relative">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d3e3fd] text-[#0b57d0]">
            <span className="material-symbols-outlined text-[13px]">
              mail
            </span>
          </div>
          {hasUnread && (
            <span className="absolute -top-1 -right-1 rounded-full bg-[#c5221f] px-[3px] py-[1px] text-[7px] font-semibold text-white">
              99+
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium text-slate-700">Mail</span>
      </button>

      {/* Spacer + Chat / Meet icons */}
      <div className="mt-5 flex flex-col items-center gap-3 text-[10px] text-slate-600">
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 text-slate-600"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#e8eaed]">
            <span className="material-symbols-outlined text-[13px]">
              chat
            </span>
          </div>
          <span>Chat</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center gap-0.5 text-slate-600"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#e8eaed]">
            <span className="material-symbols-outlined text-[13px]">
              videocam
            </span>
          </div>
          <span>Meet</span>
        </button>
      </div>
    </aside>
  );
}
