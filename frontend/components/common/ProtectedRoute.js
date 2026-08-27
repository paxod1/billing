"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCookie } from "../../utils/cookieHelper";

/**
 * ProtectedRoute component that redirects to /login if the access token is missing.
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - The children to render if authenticated.
 */
const ProtectedRoute = ({ children }) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const amToken = getCookie("amToken");
        const amDbToken = getCookie("amDbToken");

        if (!amToken || !amDbToken) {
            router.push("/login");
        } else {
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, [router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#FFCA00]"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
