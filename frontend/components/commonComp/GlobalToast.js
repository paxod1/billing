'use client';

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearToast } from "@/lib/features/toast/toastSlice";
import { toast } from "sonner";
import { } from "lucide-react";

export default function GlobalToast() {
    const dispatch = useDispatch();
    const { message, type, timestamp } = useSelector((state) => state.toast);

    useEffect(() => {
        if (message && type && timestamp) {
            const toastOptions = {
                duration: 2000,
                position: "top-center",
                dismissible: true,
                closeButton: true,
            };

            const title = type.charAt(0).toUpperCase() + type.slice(1);

            switch (type) {
                case "success":
                    toast.success(
                        <div>
                            <p className="font-bold text-green-600">{title}!</p>
                            <p className="text-[14px] text-gray-600">{message}</p>
                        </div>,
                        { ...toastOptions }
                    );
                    break;
                case "error":
                    toast.error(
                        <div>
                            <p className="font-bold text-red-600">{title}!</p>
                            <p className="text-[14px] text-red-600">{message}</p>
                        </div>,
                        { ...toastOptions }
                    );
                    break;
                case "warning":
                    toast.warning(
                        <div>
                            <p className="font-bold text-yellow-600">{title}!</p>
                            <p className="text-[14px] text-yellow-600">{message}</p>
                        </div>,
                        { ...toastOptions }
                    );
                    break;
                case "info":
                    toast.info(
                        <div>
                            <p className="font-bold text-blue-600">{title}!</p>
                            <p className="text-[14px] text-blue-600">{message}</p>
                        </div>,
                        { ...toastOptions }
                    );
                    break;
                default:
                    toast(message, { ...toastOptions });
            }

            dispatch(clearToast());
        }
    }, [message, type, timestamp, dispatch]);

    return null;
}
