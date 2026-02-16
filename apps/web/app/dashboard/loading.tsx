export default function DashboardLoading() {
  return (
    <div className="flex-1">
      {/* Banner skeleton */}
      <div className="bg-gray-200 animate-pulse p-6 md:p-8 rounded-b-[2rem] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gray-300 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-gray-300 rounded" />
              <div className="h-4 w-28 bg-gray-300 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-300 rounded-xl" />
            <div className="h-16 bg-gray-300 rounded-xl" />
            <div className="h-16 bg-gray-300 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Widget grid skeleton */}
      <div className="max-w-4xl mx-auto -mt-4 space-y-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
            <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
            <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-gray-100 rounded-lg" />
            <div className="h-12 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
