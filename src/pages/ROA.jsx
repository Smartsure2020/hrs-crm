export default function ROA() {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#1a2744]">Record of Advice</h2>
        <p className="text-sm text-gray-400">HRS Insurance ROA System</p>
      </div>
      <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
        <iframe
          src="https://hrs-roa.base44.app"
          width="100%"
          height="900px"
          style={{ border: "none" }}
          title="HRS Advice Record"
        />
      </div>
    </div>
  );
}