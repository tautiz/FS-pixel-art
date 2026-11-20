import React from 'react';
import { Download } from 'lucide-react';

interface HeaderProps {
  readonly onOpenExportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExportModal }) => {
  return (
    <header className="border-b border-[#2A241E] bg-[#12100E]/95">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-4">
        <a
          href="#artwork"
          className="font-display text-lg font-semibold tracking-tight text-[#F5EFE6] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D99B26]"
        >
          Alchemist&apos;s Study
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A99F94]"
        >
          <a
            href="#artwork"
            className="hover:text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0"
          >
            Artwork
          </a>
          <a
            href="#layers"
            className="hover:text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0"
          >
            Motion Layers
          </a>
          <a
            href="#palette"
            className="hover:text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0"
          >
            Color Palette
          </a>
          <a
            href="#architecture"
            className="hover:text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0"
          >
            Craft Notes
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenExportModal}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-md bg-[#D99B26] px-4 py-2 text-xs font-semibold text-[#14110E] hover:bg-[#E7AC3B] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5EFE6]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export &amp; Embed</span>
          </button>
        </div>
      </div>
    </header>
  );
};
