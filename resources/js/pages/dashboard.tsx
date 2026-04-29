import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { dashboard } from '@/routes';
import { usePage } from '@inertiajs/react'

export default function Dashboard() {



    const { auth } = usePage().props as any
    const isAdmin = auth.user.role === 'admin'
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {isAdmin && (
                    <a href="/admin" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
                        Admin Dashboard →
                    </a>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
