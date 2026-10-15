import { Link } from 'react-router-dom';

export function About() {
  return (
    <section className="section about-page">
      <div className="about-story">
        <div>
          <p className="eyebrow">OUR STORY</p>
          <h1>Inspired by the Falls. Designed around your stay.</h1>
          <p className="about-intro">
            Victoria Falls Reserve explores a simple idea: choosing where to stay should feel like
            the beginning of the journey.
          </p>
          <p>
            Victoria Falls gives this project its setting and its name. The booking experience
            brings the practical details together: a room that fits your group, dates that work, and
            a price you can understand before you confirm.
          </p>
          <p>
            Six demonstration properties let you explore different kinds of stays, compare rooms,
            and follow a reservation from search to confirmation. The aim is to give each step a
            clear purpose, while leaving room for the destination to speak for itself.
          </p>
        </div>
        <figure>
          <img
            src="/images/destinations/victoria-falls-rainforest.jpg"
            alt="Water cascading over Victoria Falls beside lush greenery"
          />
          <figcaption>Victoria Falls, Zimbabwe. The inspiration behind the reserve.</figcaption>
        </figure>
      </div>
      <div className="about-purpose">
        <article>
          <p className="eyebrow">OUR MISSION</p>
          <h2>Make booking easier.</h2>
          <p>
            Bring room choices, availability, prices, and cancellation terms into one clear booking
            journey, so guests can understand their stay before they commit.
          </p>
        </article>
        <article>
          <p className="eyebrow">OUR VISION</p>
          <h2>A confident start to every stay.</h2>
          <p>
            Build a booking experience where the character of the destination and the needs of the
            traveller receive equal care, from the first search to managing a reservation.
          </p>
        </article>
      </div>
      <section className="about-principles" aria-labelledby="values-heading">
        <p className="eyebrow">OUR VALUES</p>
        <h2 id="values-heading">Our principles, put into practice.</h2>
        <div className="about-values">
          <article>
            <h3>Clear choices</h3>
            <p>
              Show room capacity, nightly prices, and stay terms before checkout. Keep the
              information people need close to the decision.
            </p>
          </article>
          <article>
            <h3>Guest control</h3>
            <p>
              Let guests save stays, revisit confirmations, and manage reservations from their own
              account.
            </p>
          </article>
          <article>
            <h3>Honest expectations</h3>
            <p>
              Explain what the experience offers, including its limits. A demonstration should be as
              clear about its purpose as it is about its prices.
            </p>
          </article>
        </div>
      </section>
      <section className="about-project" aria-labelledby="project-heading">
        <div>
          <p className="eyebrow">BEHIND THE EXPERIENCE</p>
          <h2 id="project-heading">From finding a room to managing a booking.</h2>
        </div>
        <div>
          <p>
            This student project connects hotel discovery, customer accounts, saved stays,
            reservations, and an administration dashboard in one application.
          </p>
          <p>
            Hotel listings and property photographs illustrate the experience. Reservations and
            payments are demonstrations; they do not book accommodation or move real money.
          </p>
        </div>
      </section>
      <div className="about-cta">
        <div>
          <p className="eyebrow">YOUR NEXT STEP</p>
          <h2>Find your kind of stay.</h2>
          <p>Compare the rooms and try a demonstration booking.</p>
        </div>
        <Link className="button" to="/hotels">
          Explore the collection ↗
        </Link>
      </div>
    </section>
  );
}
