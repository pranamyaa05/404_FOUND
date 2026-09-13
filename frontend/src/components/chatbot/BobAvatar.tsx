/**
 * BOB's avatar — a stylised fashion designer character.
 * Used in the chat header and the floating toggle button.
 *
 * Design: dark beret, needle + thread motif, warm atelier palette.
 * Size is controlled by the `size` prop (px).
 */

interface Props {
  size?: number;
  animated?: boolean; // adds a subtle sparkle pulse when true
}

export default function BobAvatar({ size = 40, animated = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BOB — AI Fashion Designer"
      role="img"
    >
      {/*  Background circle  */}
      <circle cx="32" cy="32" r="32" fill="#29231D" />

      {/*  Face  */}
      <ellipse cx="32" cy="36" rx="14" ry="16" fill="#F5C49A" />

      {/*  Neck  */}
      <rect x="27" y="49" width="10" height="6" rx="3" fill="#F5C49A" />

      {/*  Shirt collar  */}
      <path d="M20 58 Q32 52 44 58 L44 64 L20 64 Z" fill="#69785D" />
      <path d="M32 54 L27 58 L32 56 L37 58 Z" fill="#F9F3E6" />

      {/*  Beret (fashion designer hat)  */}
      <ellipse cx="32" cy="22" rx="16" ry="5" fill="#5A3324" />
      <ellipse cx="32" cy="20" rx="13" ry="9" fill="#833B2B" />
      <circle cx="32" cy="14" r="3" fill="#A94E38" />
      {/* beret bobble */}
      <circle cx="32" cy="12" r="2" fill="#C46751" />

      {/*  Eyes  */}
      <ellipse cx="26" cy="36" rx="2.5" ry="3" fill="#29231D" />
      <ellipse cx="38" cy="36" rx="2.5" ry="3" fill="#29231D" />
      {/* eye shine */}
      <circle cx="27" cy="35" r="1" fill="white" />
      <circle cx="39" cy="35" r="1" fill="white" />

      {/*  Smile  */}
      <path
        d="M27 43 Q32 47 37 43"
        stroke="#29231D"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/*  Nose  */}
      <ellipse cx="32" cy="40" rx="1.5" ry="1" fill="#C68642" opacity="0.6" />

      {/*  Needle + thread (right side of beret)  */}
      <line x1="44" y1="16" x2="50" y2="8" stroke="#E0B57F" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="50" cy="8" r="1.5" fill="#E0B57F" />
      {/* thread loop */}
      <path
        d="M44 16 Q48 20 46 24 Q44 28 48 28"
        stroke="#C46751"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />

      {/*  Sparkles (animated when prop is true)  */}
      {animated && (
        <>
          <circle cx="54" cy="10" r="1.5" fill="#E0B57F">
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="2s"
              repeatCount="indefinite"
              begin="0s"
            />
          </circle>
          <circle cx="10" cy="14" r="1" fill="#C46751">
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="2s"
              repeatCount="indefinite"
              begin="0.7s"
            />
          </circle>
          <circle cx="56" cy="30" r="1" fill="#C46751">
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="2s"
              repeatCount="indefinite"
              begin="1.3s"
            />
          </circle>
        </>
      )}
    </svg>
  );
}
