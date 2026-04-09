import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-black text-white mb-4 tracking-tight">Strike</h1>
      <p className="text-xl text-gray-400 mb-4 max-w-xl">
        Fantasy IPL cricket. Pick your squad of 11, score points on every boundary, wicket, and catch — in real time.
      </p>
      <p className="text-gray-500 mb-10 max-w-md">
        220 transfers. One season. Beat the world.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          Play free
        </Link>
        <Link
          href="/login"
          className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
