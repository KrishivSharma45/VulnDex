/** Re-mounts on every navigation, so each page fades up into place. */
export default function SiteTemplate({children}: {children: React.ReactNode}) {
  return <div className="animate-fade-up">{children}</div>
}
