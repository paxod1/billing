'use client'

import { usePathname } from 'next/navigation'
import UserLayout from './UserLayout'
import ProtectedRoute from '../common/ProtectedRoute'

export default function ConditionalLayout({ children }) {
    const pathname = usePathname()

    // Show Sidebar (UserLayout) everywhere EXCEPT /login
    const isLoginPage = pathname === '/login'

    if (!isLoginPage) {
        return (
            <ProtectedRoute>
                <UserLayout>{children}</UserLayout>
            </ProtectedRoute>
        )
    }

    // For login page, render without sidebar
    return <div className="min-h-full antialiased text-slate-100 bg-slate-950">{children}</div>
}
