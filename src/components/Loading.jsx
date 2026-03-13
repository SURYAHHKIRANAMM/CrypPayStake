export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">

      <div className="loader"></div>

      <p className="mt-6 text-lg text-gray-300">
        Connecting to Blockchain...
      </p>

    </div>
  );
}