import type { ComponentChildren } from "preact";

// Stroke width/caps come from the `.icon` rule in styles.css.
function Svg({ children }: { children: ComponentChildren }) {
  return (
    <svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconEye = () => (
  <Svg>
    <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8z" />
    <circle cx="8" cy="8" r="2" />
  </Svg>
);

export const IconEyeOff = () => (
  <Svg>
    <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8z" />
    <path d="M2.5 13.5l11-11" />
  </Svg>
);

export const IconCopy = () => (
  <Svg>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
    <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
  </Svg>
);

export const IconTrash = () => (
  <Svg>
    <path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9" />
  </Svg>
);

export const IconPlus = () => (
  <Svg>
    <path d="M8 3v10M3 8h10" />
  </Svg>
);

export const IconClose = () => (
  <Svg>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Svg>
);

export const IconChevron = ({ open }: { open: boolean }) => (
  <Svg>
    <path d={open ? "M4 6l4 4 4-4" : "M6 4l4 4-4 4"} />
  </Svg>
);

export const IconGrip = () => (
  <svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <circle cx="6" cy="4" r="1" />
    <circle cx="10" cy="4" r="1" />
    <circle cx="6" cy="8" r="1" />
    <circle cx="10" cy="8" r="1" />
    <circle cx="6" cy="12" r="1" />
    <circle cx="10" cy="12" r="1" />
  </svg>
);
