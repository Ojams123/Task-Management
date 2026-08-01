import type { SVGProps } from 'react'

export interface IconProps {
  size?: number
  className?: string
}

function Line({ size = 18, className, children }: IconProps & { children: React.ReactNode }) {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  return (
    <svg {...common} className={className}>
      {children}
    </svg>
  )
}

function Brand({ size = 18, className, hex, viewBox = '0 0 24 24', children }: IconProps & { hex: string; viewBox?: string; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill={hex} className={className} data-brand="true">
      {children}
    </svg>
  )
}

/* -- Generic module icons (no external brand) -- */

export function DashboardIcon(props: IconProps) {
  return (
    <Line {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" stroke="none" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" stroke="none" opacity="0.55" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" stroke="none" opacity="0.55" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" stroke="none" />
    </Line>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M12 4a4.2 4.2 0 0 0-4.2 4.2v3.4L6 14.4h12l-1.8-2.8V8.2A4.2 4.2 0 0 0 12 4Z" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </Line>
  )
}

export function TargetIcon(props: IconProps) {
  return (
    <Line {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Line>
  )
}

export function WalletIcon(props: IconProps) {
  return (
    <Line {...props}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10.5h18" />
      <circle cx="16.8" cy="14.3" r="1.1" fill="currentColor" stroke="none" />
    </Line>
  )
}

export function DumbbellIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M6.5 12h11" />
      <rect x="2" y="9.2" width="3" height="5.6" rx="1.2" />
      <rect x="19" y="9.2" width="3" height="5.6" rx="1.2" />
      <rect x="5.5" y="7.5" width="2" height="9" rx="1" />
      <rect x="16.5" y="7.5" width="2" height="9" rx="1" />
    </Line>
  )
}

export function CloudSunIcon(props: IconProps) {
  return (
    <Line {...props}>
      <circle cx="7.5" cy="7.5" r="2.5" />
      <path d="M7.5 3v1.2M7.5 10.8V12M11.5 7.5h1.2M2.3 7.5h1.2M10.3 4.7l.85-.85M3.85 11.15l.85-.85M10.3 10.3l.85.85M3.85 3.85l.85.85" />
      <path d="M9 20h8.5a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 8.1 15.5" />
    </Line>
  )
}

export function SlidersIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M4 6.5h9" />
      <circle cx="16" cy="6.5" r="2" />
      <path d="M4 12h4" />
      <circle cx="11" cy="12" r="2" />
      <path d="M15.5 12H20" />
      <path d="M4 17.5h9" />
      <circle cx="16" cy="17.5" r="2" />
    </Line>
  )
}

/* -- Brand icons, path data from simple-icons (CC0-1.0) -- */

export function GmailIcon(props: IconProps) {
  return (
    <Brand {...props} hex="#EA4335">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </Brand>
  )
}

export function GoogleCalendarIcon(props: IconProps) {
  return (
    <Brand {...props} hex="#4285F4">
      <path d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z" />
    </Brand>
  )
}

export function CanvasIcon(props: IconProps) {
  return (
    <Brand {...props} hex="#2A7BA0">
      <path d="m11.996 0-5.11 2.878L12 5.76l5.115-2.878ZM6.032 3.36.918 6.237 6.036 9.12l5.115-2.879Zm11.929 0-5.112 2.878 5.115 2.882 5.118-2.879zM12 11.52.918 17.76 12 24l11.082-6.241Z" />
    </Brand>
  )
}

export function ClaudeIcon(props: IconProps) {
  return (
    <Brand {...props} hex="#D97757">
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </Brand>
  )
}

export function OuraIcon(props: IconProps) {
  // Not a reproduction of Oura's trademarked logo — a simple ring motif in their brand teal.
  return (
    <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 24 24" className={props.className} data-brand="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="#5FE0C6" strokeWidth="3.4" />
    </svg>
  )
}

export function SpotifyIcon(props: IconProps) {
  return (
    <Brand {...props} hex="#1ED760">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </Brand>
  )
}

export function StravaIcon(props: IconProps) {
  return (
    <Brand {...props} hex="#FC4C02">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </Brand>
  )
}

export function MicrosoftIcon(props: IconProps) {
  // Not a reproduction of Microsoft's trademarked logo — a generic four-quadrant
  // motif in the same four brand colors, representing the Microsoft 365 suite.
  const size = props.size ?? 18
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={props.className} data-brand="true">
      <rect x="2" y="2" width="9.3" height="9.3" fill="#F25022" />
      <rect x="12.7" y="2" width="9.3" height="9.3" fill="#7FBA00" />
      <rect x="2" y="12.7" width="9.3" height="9.3" fill="#00A4EF" />
      <rect x="12.7" y="12.7" width="9.3" height="9.3" fill="#FFB900" />
    </svg>
  )
}

export function LinkedInIcon(props: IconProps) {
  // Not a reproduction of LinkedIn's "in" lettermark — a generic profile glyph
  // in their brand blue, since only basic sign-in (no feed/network data) applies.
  return (
    <Line {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3.5" stroke="#0A66C2" fill="none" />
      <circle cx="12" cy="10" r="2.6" stroke="#0A66C2" />
      <path d="M7 18c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6" stroke="#0A66C2" />
    </Line>
  )
}

export function PlaidIcon(props: IconProps) {
  // Not a reproduction of Plaid's trademarked wordmark — a simple bank-link
  // glyph in their brand navy, representing the underlying bank connection.
  return (
    <Line {...props} className={props.className}>
      <path d="M4 10.5 12 5l8 5.5" stroke="#0A1E42" fill="none" />
      <rect x="5.5" y="10.5" width="13" height="8" rx="1.2" stroke="#0A1E42" fill="none" />
      <path d="M9 14v2M12 14v2M15 14v2" stroke="#0A1E42" />
    </Line>
  )
}
