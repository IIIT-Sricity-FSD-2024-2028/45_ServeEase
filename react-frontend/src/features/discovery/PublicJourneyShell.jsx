import { PublicFooter, PublicHeader } from '../home/PublicChrome'
import './journey.css'

// Original public page frame (navbar + footer) around a .se-journey page body.
export function PublicJourneyShell({ city, cities, onCityChange, className, children }) {
  return <div className="serveease-home">
    <PublicHeader city={city} cities={cities} onCityChange={onCityChange} sectionBase="/" />
    <main className="se-journey"><div className={className}>{children}</div></main>
    <PublicFooter sectionBase="/" />
  </div>
}
