
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <nav className="border-b bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex items-center shrink-0">
                                <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    InvestDash
                                </span>
                            </div>
                        </div>
                        {/* User Profile / Logout would go here */}
                    </div>
                </div>
            </nav>
            <main className="py-10">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
