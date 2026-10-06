import {SiteChrome} from '@/components/SiteChrome'

export default function SiteLayout({children}: LayoutProps<'/'>) {
  return <SiteChrome>{children}</SiteChrome>
}
