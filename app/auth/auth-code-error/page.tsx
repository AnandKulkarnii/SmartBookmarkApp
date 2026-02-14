export default function AuthCodeError() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="rounded-2xl bg-white/10 backdrop-blur-lg p-8 shadow-2xl border border-white/20">
                <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
                <p className="text-gray-200 mb-6">
                    Sorry, we couldn&apos;t complete your sign-in. Please try again.
                </p>
                <a
                    href="/"
                    className="inline-block px-6 py-3 bg-white text-purple-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                    Back to Home
                </a>
            </div>
        </div>
    )
}
