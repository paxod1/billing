import './globals.css'
import ConditionalLayout from '../components/layouts/ConditionalLayout'
import StoreProvider from '../components/layouts/StoreProvider'
import GlobalUI from '../components/commonComp/GlobalUI'
import { KeyboardShortcutsProvider } from '../components/common/KeyboardShortcutsProvider'

export const metadata = {
  title: 'Billing',
  description: 'Billing: Simple, fast and powerful local desktop billing & accounting software.',
  icons: {
    icon: '/money.png',
    apple: '/money.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full antialiased font-sans">
        <StoreProvider>
          <KeyboardShortcutsProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
            <GlobalUI />
          </KeyboardShortcutsProvider>
        </StoreProvider>
      </body>
    </html>
  )
}
