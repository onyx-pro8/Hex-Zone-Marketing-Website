/** Shared SVG symbols referenced via <use href="#…"> */
export function IconSprite() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="g-play-blue"
          x1="2"
          y1="2"
          x2="13"
          y2="13"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00a0ff" />
          <stop offset="1" stopColor="#00d4ff" />
        </linearGradient>
        <linearGradient
          id="g-play-green"
          x1="2"
          y1="1"
          x2="17"
          y2="9"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00e676" />
          <stop offset="1" stopColor="#00c853" />
        </linearGradient>
        <linearGradient
          id="g-play-red"
          x1="2"
          y1="25"
          x2="17"
          y2="17"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#e91e63" />
          <stop offset="1" stopColor="#ff3d44" />
        </linearGradient>
        <linearGradient
          id="g-play-yellow"
          x1="14"
          y1="13"
          x2="23"
          y2="13"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffc400" />
          <stop offset="1" stopColor="#ffe000" />
        </linearGradient>
      </defs>

      <symbol id="i-arrow-right" viewBox="0 0 24 24">
        <path
          d="M5 12h14M13 6l6 6-6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </symbol>

      <symbol id="i-chevron-down" viewBox="0 0 24 24">
        <path
          d="m6 9 6 6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </symbol>

      <symbol id="i-check-circle" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <path
          d="m7.4 12.4 3.1 3.1 6.1-6.4"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </symbol>

      <symbol id="i-apple" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
        />
      </symbol>

      <symbol id="i-google-play" viewBox="0 0 24 26">
        <path
          fill="url(#g-play-blue)"
          d="M1.3.7 13.4 13 1.3 25.3c-.45-.3-.7-.83-.7-1.45V2.15c0-.62.25-1.15.7-1.45Z"
        />
        <path
          fill="url(#g-play-green)"
          d="M1.3.7c.55-.4 1.3-.45 2.02-.04L17.5 8.8 13.4 13Z"
        />
        <path
          fill="url(#g-play-red)"
          d="M1.3 25.3 13.4 13l4.1 4.2-14.18 8.14c-.72.41-1.47.36-2.02-.04Z"
        />
        <path
          fill="url(#g-play-yellow)"
          d="m17.5 8.8 4.36 2.5c1.36.78 1.36 2.62 0 3.4l-4.36 2.5L13.4 13Z"
        />
      </symbol>

      <symbol id="i-play" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"
        />
      </symbol>

      <symbol id="i-youtube" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        />
      </symbol>

      <symbol id="i-linkedin" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"
        />
      </symbol>

      <symbol id="i-x" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
        />
      </symbol>
    </svg>
  );
}
