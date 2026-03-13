export default function GlassCard({ children, className = "" }) {

  return (
    <div className={`
      bg-white/5
      backdrop-blur-lg
      border border-white/10
      rounded-xl
      p-6
      shadow-xl
      transition
      hover:border-yellow-500/20
      ${className}
    `}>
      {children}
    </div>
  );
}