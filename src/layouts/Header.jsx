
import sparksLogo from '../assets/sparks-logo.png'

function Navbar() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-[#F4774F] px-6 text-white md:px-8">
      {/* Logo SPARKS */}
      <div>
        <img
          src={sparksLogo}
          alt="SPARKS - Smart Parking System"
          className="h-20 w-auto object-contain"
        />
      </div>
    </header>
  )
}

export default Navbar
